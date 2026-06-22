import path from "path";
import { prisma } from "@/lib/prisma";
import { callOpenRouter, type OpenRouterMessage, type OpenRouterTool } from "@/lib/openrouter";
import { buildLlmCallParams } from "@/lib/llm-config";
import { getDecryptedUserKey } from "@/lib/user-keys";
import { getSkill } from "@/lib/skills";
import { zodToJsonSchema } from "@/lib/skills/base";
import { buildAgentPrompt, buildRunPrompt } from "@/lib/agent/prompts";
import { formatToolResultsFromMessages } from "@/lib/agent/format-reply";
import { selectSkillSlugsForRun } from "@/lib/agent/select-tools";
import { sanitizeAgentOutput, isUselessAgentReply, isMessyCryptoReply } from "@/lib/agent/sanitize-output";
import { resolveChatModel } from "@/lib/user-models";
import type { RunResult } from "@/lib/agent/types";

const RUN_TIMEOUT = parseInt(process.env.AGENT_RUN_TIMEOUT_SECONDS || "60", 10) * 1000;
const MAX_TOOL_CALLS = parseInt(process.env.MAX_TOOL_CALLS_PER_RUN || "5", 10);

function collectImagePathsFromToolResult(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const urls = (result as { imageUrls?: string[] }).imageUrls;
  if (!Array.isArray(urls)) return [];

  return urls
    .map((url) => {
      const match = url.match(/^\/api\/generated\/([^/?#]+)$/);
      if (!match) return null;
      return path.join(process.cwd(), "storage", "generated", match[1]);
    })
    .filter((p): p is string => p !== null);
}

export interface RunAgentOptions {
  trigger?: "manual" | "scheduled" | "telegram";
  userMessage?: string;
  replyViaTelegram?: boolean;
}

export async function runAgent(
  agentId: string,
  options: RunAgentOptions | "manual" | "scheduled" = "manual"
): Promise<RunResult> {
  const opts: RunAgentOptions =
    typeof options === "string" ? { trigger: options } : options;
  const trigger = opts.trigger ?? "manual";
  const startTime = Date.now();

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      skills: { include: { skill: true }, where: { enabled: true } },
      user: true,
    },
  });

  if (!agent) throw new Error("Agent not found");
  if (agent.status === "PAUSED") throw new Error("Agent is paused");

  const run = await prisma.agentRun.create({
    data: { agentId, status: "RUNNING" },
  });

  const logFn = async (
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    toolUsed?: string
  ) => {
    await prisma.agentLog.create({
      data: { agentId, runId: run.id, level, message, toolUsed },
    });
  };

  try {
    await logFn("INFO", `Run started (${trigger})`);

    const enabledSlugs = agent.skills.map((as) => as.skill.slug);
    const activeSlugs =
      trigger === "telegram"
        ? selectSkillSlugsForRun(enabledSlugs, trigger, opts.userMessage)
        : enabledSlugs;

    if (trigger === "telegram" && activeSlugs.length < enabledSlugs.length) {
      await logFn("INFO", `Telegram tools filtered: ${activeSlugs.length}/${enabledSlugs.length}`);
    }

    const workingSkills = activeSlugs
      .map((slug) => getSkill(slug))
      .filter((s) => s !== undefined);

    const memories = agent.memoryEnabled
      ? await prisma.agentMemory.findMany({
          where: { agentId },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [];

    const systemPrompt = buildAgentPrompt({
      systemPrompt: agent.systemPrompt,
      agentName: agent.name,
      skills: workingSkills.map((s) => ({ name: s!.name, description: s!.description })),
      memories,
    });

    const tools: OpenRouterTool[] = workingSkills.map((skill) => ({
      type: "function" as const,
      function: {
        name: skill!.slug.replace(/-/g, "_"),
        description: skill!.description,
        parameters: zodToJsonSchema(skill!.inputSchema),
      },
    }));

    const chatModel = resolveChatModel(agent.model, agent.user.defaultModel);
    const llm = buildLlmCallParams(
      agent.user,
      getDecryptedUserKey(agent.user.openRouterApiKey),
      chatModel
    );
    await logFn("INFO", `Using chat model: ${chatModel} via ${llm.baseUrl}`);

    const messages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildRunPrompt(trigger, opts.userMessage) },
    ];

    let totalTokens = 0;
    let toolCallCount = 0;
    let finalOutput = "";
    const generatedImagePaths: string[] = [];
    const timeoutAt = startTime + RUN_TIMEOUT;

    while (Date.now() < timeoutAt) {
      const response = await callOpenRouter({
        ...llm,
        model: chatModel,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });

      totalTokens += response.usage?.total_tokens ?? 0;
      const choice = response.choices[0];
      if (!choice) break;

      const assistantMessage = choice.message;

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: assistantMessage.content || "",
        });

        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCallCount >= MAX_TOOL_CALLS) {
            await logFn("WARN", `Max tool calls (${MAX_TOOL_CALLS}) reached`);
            finalOutput = "Run stopped: maximum tool calls reached.";
            break;
          }

          const toolName = toolCall.function.name.replace(/_/g, "-");
          const skill = getSkill(toolName);

          if (!skill) {
            await logFn("ERROR", `Unknown tool: ${toolName}`, toolName);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: "Tool not found" }),
            });
            continue;
          }

          if (!enabledSlugs.includes(skill.slug)) {
            await logFn("ERROR", `Tool not permitted: ${toolName}`, toolName);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: "Tool not permitted for this agent" }),
            });
            continue;
          }

          let parsedInput: unknown;
          try {
            parsedInput = JSON.parse(toolCall.function.arguments);
          } catch {
            parsedInput = {};
          }

          const validated = skill.inputSchema.safeParse(parsedInput);
          if (!validated.success) {
            await logFn("ERROR", `Invalid input for ${toolName}: ${validated.error.message}`, toolName);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: validated.error.message }),
            });
            continue;
          }

          toolCallCount++;
          await logFn("INFO", `Executing tool: ${skill.name}`, toolName);

          const result = await skill.execute(validated.data, {
            agentId,
            userId: agent.userId,
            runId: run.id,
            log: logFn,
          });

          if (skill.slug === "image-generator") {
            generatedImagePaths.push(...collectImagePathsFromToolResult(result));
          }

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(result),
          });
        }

        if (toolCallCount >= MAX_TOOL_CALLS) break;
        continue;
      }

      finalOutput = assistantMessage.content || "";
      break;
    }

    if (!finalOutput.trim() && toolCallCount > 0) {
      finalOutput = formatToolResultsFromMessages(messages) || "";

      if (!finalOutput.trim()) {
        await logFn("INFO", "Synthesizing reply from tool results");
        const synth = await callOpenRouter({
          ...llm,
          model: chatModel,
          messages: [
            ...messages,
            {
              role: "user",
              content:
                "Using the tool results above, write a concise helpful reply for the user in the same language they used. Include concrete numbers and facts.",
            },
          ],
          maxTokens: 600,
        });
        finalOutput = synth.choices[0]?.message?.content?.trim() || "";
      }
    }

    if (!finalOutput.trim() && toolCallCount === 0 && trigger === "telegram") {
      finalOutput =
        "Try directly:\n• `price bonk` — token price\n• paste CA mint\n• `trending` — hot tokens\n• `sol price`";
    }

    finalOutput = sanitizeAgentOutput(finalOutput);
    if (isUselessAgentReply(finalOutput) || isMessyCryptoReply(finalOutput)) {
      finalOutput = formatToolResultsFromMessages(messages) || finalOutput;
    }

    if (trigger === "telegram" && toolCallCount > 0) {
      const toolFormatted = formatToolResultsFromMessages(messages);
      const usedAyraTool = messages.some(
        (m) =>
          m.role === "tool" &&
          (m.name === "meme_coin_scanner" ||
            m.name === "token_quality_report" ||
            m.name?.includes("meme") ||
            m.name?.includes("quality"))
      );
      if (toolFormatted && (usedAyraTool || isMessyCryptoReply(finalOutput))) {
        finalOutput = toolFormatted;
      }
    }

    if (isUselessAgentReply(finalOutput)) {
      finalOutput = formatToolResultsFromMessages(messages) || "";
    }
    if (isUselessAgentReply(finalOutput) && trigger === "telegram") {
      finalOutput =
        "Try directly:\n• `price bonk` — token price\n• paste CA mint\n• `trending` — hot tokens\n• `sol price`";
    }

    const durationMs = Date.now() - startTime;
    const timedOut = Date.now() >= timeoutAt && !finalOutput;
    const status = timedOut ? "TIMEOUT" : "COMPLETED";
    const summary = finalOutput.slice(0, 500) || (timedOut ? "Run timed out" : "Run completed");

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        durationMs,
        tokenUsage: totalTokens,
        toolCalls: toolCallCount,
        output: finalOutput,
        summary,
        error: timedOut ? "Run exceeded timeout limit" : null,
      },
    });

    await logFn(status === "TIMEOUT" ? "WARN" : "INFO", `Run ${status.toLowerCase()} in ${durationMs}ms`);

    if (
      agent.telegramNotify &&
      finalOutput &&
      !opts.replyViaTelegram &&
      trigger !== "telegram"
    ) {
      const notifySkill = getSkill("telegram-notify");
      if (notifySkill && enabledSlugs.includes("telegram-notify")) {
        await notifySkill.execute(
          { message: `*${agent.name}* run complete:\n\n${summary.slice(0, 300)}` },
          { agentId, userId: agent.userId, runId: run.id, log: logFn }
        );
      }
    }

    await prisma.alert.create({
      data: {
        userId: agent.userId,
        agentId,
        type: status === "TIMEOUT" ? "WARNING" : "SUCCESS",
        title: `${agent.name} run ${status.toLowerCase()}`,
        message: summary,
      },
    });

    return {
      runId: run.id,
      status,
      output: finalOutput,
      summary,
      tokenUsage: totalTokens,
      toolCalls: toolCallCount,
      durationMs,
      error: timedOut ? "Run exceeded timeout limit" : undefined,
      imagePaths: generatedImagePaths.length > 0 ? generatedImagePaths : undefined,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    await logFn("ERROR", `Run failed: ${message}`);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        durationMs,
        error: message,
        summary: `Failed: ${message}`,
      },
    });

    await prisma.alert.create({
      data: {
        userId: agent.userId,
        agentId,
        type: "ERROR",
        title: `${agent.name} run failed`,
        message,
      },
    });

    return {
      runId: run.id,
      status: "FAILED",
      output: "",
      summary: `Failed: ${message}`,
      tokenUsage: 0,
      toolCalls: 0,
      durationMs,
      error: message,
    };
  }
}
