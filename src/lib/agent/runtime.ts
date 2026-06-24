import path from "path";
import { prisma } from "@/lib/prisma";
import { callOpenRouter, type OpenRouterMessage, type OpenRouterTool } from "@/lib/openrouter";
import { buildLlmCallParams } from "@/lib/llm-config";
import { getDecryptedUserKey } from "@/lib/user-keys";
import { getSkill } from "@/lib/skills";
import { zodToJsonSchema } from "@/lib/skills/base";
import { buildAgentPrompt, buildRunPrompt, buildScheduledRunPrompt } from "@/lib/agent/prompts";
import {
  loadBrainContext,
  formatBrainContextForPrompt,
  agentHasBrainSkills,
} from "@/lib/brain/ayra-brain";
import { formatToolResultsFromMessages } from "@/lib/agent/format-reply";
import { selectSkillSlugsForRun } from "@/lib/agent/select-tools";
import { sanitizeAgentOutput, isUselessAgentReply, isMessyCryptoReply } from "@/lib/agent/sanitize-output";
import { resolveChatModel } from "@/lib/user-models";
import { buildUserMessageContent, historyContentForModel } from "@/lib/chat/message-content";
import type { RunResult } from "@/lib/agent/types";

import { loadAgentMemoryContext } from "@/lib/agent/load-memories";
import { IterationBudget } from "@/lib/agent/iteration-budget";
import { ToolLoopGuard } from "@/lib/agent/tool-loop-guard";
import { skillBundlesForSlugs } from "@/lib/skills/skill-md-loader";

const MAX_TOOL_CALLS = parseInt(process.env.MAX_TOOL_CALLS_PER_RUN || "6", 10);
const CHAT_HISTORY_TURNS = parseInt(process.env.CHAT_HISTORY_TURNS || "8", 10);
const DEFAULT_COMPLETION_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || "1536", 10);

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
  trigger?: "manual" | "scheduled" | "telegram" | "chat";
  userMessage?: string;
  replyViaTelegram?: boolean;
  chatHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    imageUrls?: string[];
  }>;
  modelOverride?: string;
  deepThinking?: boolean;
  userImageUrls?: string[];
}

export async function runAgent(
  agentId: string,
  options: RunAgentOptions | "manual" | "scheduled" = "manual"
): Promise<RunResult> {
  const opts: RunAgentOptions =
    typeof options === "string" ? { trigger: options } : options;
  const trigger = opts.trigger ?? "manual";
  const startTime = Date.now();
  const runTimeoutMs =
    opts.deepThinking && trigger === "chat"
      ? parseInt(process.env.CHAT_DEEP_THINKING_TIMEOUT_SECONDS || "120", 10) * 1000
      : parseInt(process.env.AGENT_RUN_TIMEOUT_SECONDS || "60", 10) * 1000;

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
    data: { agentId, status: "RUNNING", trigger },
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
      trigger === "telegram" || trigger === "chat"
        ? selectSkillSlugsForRun(enabledSlugs, trigger, opts.userMessage)
        : enabledSlugs;

    if ((trigger === "telegram" || trigger === "chat") && activeSlugs.length < enabledSlugs.length) {
      await logFn("INFO", `${trigger} tools filtered: ${activeSlugs.length}/${enabledSlugs.length}`);
    }

    const workingSkills = activeSlugs
      .map((slug) => getSkill(slug))
      .filter((s) => s !== undefined);

    const memories = agent.memoryEnabled
      ? await loadAgentMemoryContext({
          agentId,
          memoryEnabled: true,
          agentMemoryEnabled: agent.user.agentMemoryEnabled,
          agentMemoryUrl: agent.user.agentMemoryUrl,
          searchQuery: opts.userMessage,
        })
      : [];

    const ayraBrain = agentHasBrainSkills(activeSlugs);
    const brainCtx = ayraBrain ? await loadBrainContext(agentId, agent.userId) : null;

    const systemPrompt =
      buildAgentPrompt({
        systemPrompt: agent.systemPrompt,
        agentName: agent.name,
        skills: workingSkills.map((s) => ({ name: s!.name, description: s!.description })),
        memories,
        ayraBrain,
        brainContext: brainCtx ? formatBrainContextForPrompt(brainCtx) : undefined,
      }) + skillBundlesForSlugs(activeSlugs);

    const tools: OpenRouterTool[] = workingSkills.map((skill) => ({
      type: "function" as const,
      function: {
        name: skill!.slug.replace(/-/g, "_"),
        description: skill!.description,
        parameters: zodToJsonSchema(skill!.inputSchema),
      },
    }));

    const chatModel = opts.modelOverride
      ? opts.modelOverride
      : resolveChatModel(agent.model, agent.user.defaultModel);
    const llm = buildLlmCallParams(
      {
        llmBaseUrl: agent.user.llmBaseUrl,
        defaultModel: agent.user.defaultModel,
        fallbackModels: agent.user.fallbackModels,
      },
      getDecryptedUserKey(agent.user.openRouterApiKey),
      chatModel
    );
    await logFn("INFO", `Using chat model: ${chatModel} via ${llm.baseUrl}`);
    if (agent.user.fallbackModels?.length) {
      await logFn(
        "INFO",
        `Fallback chain: ${[chatModel, ...agent.user.fallbackModels].join(" → ")}`
      );
    }
    if (opts.deepThinking) {
      await logFn("INFO", "Deep thinking enabled (reasoning effort: high)");
    }

    const reasoningConfig = opts.deepThinking ? { effort: "high" as const } : undefined;

    const messages: OpenRouterMessage[] = [{ role: "system", content: systemPrompt }];

    const history = opts.chatHistory?.slice(-CHAT_HISTORY_TURNS) ?? [];
    if (history.length > 0 && (trigger === "chat" || trigger === "telegram")) {
      for (const turn of history) {
        messages.push({
          role: turn.role,
          content: historyContentForModel(turn.role, turn.content, turn.imageUrls),
        });
      }
    }

    const userImages = opts.userImageUrls?.filter(Boolean) ?? [];
    let userText: string;
    if (opts.userMessage?.trim()) {
      userText = opts.userMessage;
    } else if (trigger === "scheduled") {
      userText = await buildScheduledRunPrompt(agentId);
    } else {
      userText = buildRunPrompt(trigger, opts.userMessage);
    }

    if (userImages.length > 0 && (trigger === "chat" || trigger === "telegram")) {
      messages.push({
        role: "user",
        content: buildUserMessageContent(userText, userImages),
      });
    } else {
      messages.push({
        role: "user",
        content: userText,
      });
    }

    let totalTokens = 0;
    const toolBudget = new IterationBudget(MAX_TOOL_CALLS);
    const toolLoopGuard = new ToolLoopGuard();
    let finalOutput = "";
    let reasoningOutput = "";
    const generatedImagePaths: string[] = [];
    const timeoutAt = startTime + runTimeoutMs;

    let activeModel = chatModel;

    while (Date.now() < timeoutAt) {
      toolLoopGuard.resetForTurn();
      const response = await callOpenRouter({
        ...llm,
        model: activeModel,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        reasoning: reasoningConfig,
        maxTokens: opts.deepThinking ? 4096 : DEFAULT_COMPLETION_TOKENS,
        fallbackModels: agent.user.fallbackModels,
        onFallbackAttempt: (model) => {
          void logFn("INFO", `Rate limited — trying fallback model: ${model}`);
        },
        onModelUsed: (used) => {
          if (used !== activeModel) {
            void logFn(
              "WARN",
              `Primary model rate-limited/unavailable (${activeModel}) — using fallback: ${used}`
            );
            activeModel = used;
          }
        },
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
          if (toolBudget.remaining <= 0) {
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

          const argsJson = JSON.stringify(validated.data);
          const loopDecision = toolLoopGuard.beforeCall(toolName, argsJson);
          if (loopDecision === "block") {
            await logFn("WARN", `Tool loop blocked: ${toolName} (same call repeated)`, toolName);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({
                error: "Repeated identical tool call blocked — try a different approach.",
                ok: false,
              }),
            });
            continue;
          }
          if (loopDecision === "warn") {
            await logFn("WARN", `Possible tool loop: ${toolName} called repeatedly`, toolName);
          }

          if (!toolBudget.consume()) break;
          await logFn("INFO", `Executing tool: ${skill.name}`, toolName);

          let result: unknown;
          try {
            result = await skill.execute(validated.data, {
              agentId,
              userId: agent.userId,
              runId: run.id,
              log: logFn,
            });
          } catch (toolError) {
            const errMsg =
              toolError instanceof Error ? toolError.message : "Tool execution failed";
            await logFn("ERROR", `Tool failed: ${errMsg}`, toolName);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: errMsg, ok: false }),
            });
            continue;
          }

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

        if (toolBudget.remaining <= 0 && toolBudget.usedCount >= MAX_TOOL_CALLS) break;
        continue;
      }

      finalOutput = assistantMessage.content || "";
      if (assistantMessage.reasoning?.trim()) {
        reasoningOutput = assistantMessage.reasoning.trim();
      }
      break;
    }

    const toolCallCount = toolBudget.usedCount;

    if (!finalOutput.trim() && toolCallCount > 0) {
      finalOutput = formatToolResultsFromMessages(messages) || "";

      if (!finalOutput.trim()) {
        await logFn("INFO", "Synthesizing reply from tool results");
        const synth = await callOpenRouter({
          ...llm,
          model: activeModel,
          messages: [
            ...messages,
            {
              role: "user",
              content:
                "Using the tool results above, write a concise helpful reply for the user in the same language they used. Include concrete numbers and facts.",
            },
          ],
          maxTokens: 600,
          reasoning: reasoningConfig,
          fallbackModels: agent.user.fallbackModels,
          onModelUsed: (used) => {
            if (used !== activeModel) activeModel = used;
          },
        });
        finalOutput = synth.choices[0]?.message?.content?.trim() || "";
      }
    }

    if (!finalOutput.trim() && toolCallCount === 0 && (trigger === "telegram" || trigger === "chat")) {
      finalOutput =
        "Try directly:\n• /p [token|CA]\n• paste CA mint\n• /trending";
    }

    finalOutput = sanitizeAgentOutput(finalOutput);
    if (isUselessAgentReply(finalOutput) || isMessyCryptoReply(finalOutput)) {
      finalOutput = formatToolResultsFromMessages(messages) || finalOutput;
    }

    if ((trigger === "telegram" || trigger === "chat") && toolCallCount > 0) {
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
    if (isUselessAgentReply(finalOutput) && (trigger === "telegram" || trigger === "chat")) {
      finalOutput =
        "Try directly:\n• /p [token|CA]\n• paste CA mint\n• /trending";
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

    if (trigger !== "chat") {
      await prisma.alert.create({
        data: {
          userId: agent.userId,
          agentId,
          type: status === "TIMEOUT" ? "WARNING" : "SUCCESS",
          title: `${agent.name} run ${status.toLowerCase()}`,
          message: summary,
        },
      });
    }

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
      reasoning: reasoningOutput || undefined,
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
