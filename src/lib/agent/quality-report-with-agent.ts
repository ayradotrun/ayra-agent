import { getSystemPromptForAgent } from "@/lib/agent/system-prompts";
import { prisma } from "@/lib/prisma";
import { getSkill } from "@/lib/skills";
import {
  formatAyraQualityReport,
  getMemeFilterChecks,
  QUALITY_MAX_PAIR_AGE_HOURS,
  QUALITY_REPORT_FILTERS,
  type MemeTokenSnapshot,
} from "@/lib/agent/meme-quality";
import { runLlm } from "@/lib/skills/helpers";

function isLlmKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /LLM API key not configured/i.test(message);
}

function buildQualityContext(snapshot: MemeTokenSnapshot): string {
  const checks = getMemeFilterChecks(snapshot, QUALITY_REPORT_FILTERS);
  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);
  const sym = snapshot.symbol || snapshot.name || snapshot.mint.slice(0, 8);

  const lines = [
    `Token: ${sym}`,
    `Mint: ${snapshot.mint}`,
    `AYRA filters: ${snapshot.passed ? "PASSED" : "FAILED"}`,
    "",
  ];

  if (failed.length > 0) {
    lines.push("Deal-breakers (failed checks):");
    for (const c of failed) {
      lines.push(`- ${c.label}: ${c.failReason ?? c.detail}`);
      if (c.recommendation) lines.push(`  → ${c.recommendation}`);
    }
    lines.push("");
  }

  if (passed.length > 0) {
    lines.push("Green flags (passed checks):");
    for (const c of passed) {
      lines.push(`- ${c.label}: ${c.passNote ?? c.detail}`);
    }
    lines.push("");
  }

  lines.push("Key metrics:");
  if (snapshot.priceUsd != null) lines.push(`- Price: $${snapshot.priceUsd}`);
  if (snapshot.marketCapUsd != null) lines.push(`- MCAP: $${snapshot.marketCapUsd}`);
  if (snapshot.liquidityUsd != null) lines.push(`- Liquidity: $${snapshot.liquidityUsd}`);
  if (snapshot.volume24hUsd != null) lines.push(`- Volume 24h: $${snapshot.volume24hUsd}`);
  if (snapshot.holderCount != null) lines.push(`- Holders: ${snapshot.holderCount}`);
  if (snapshot.top10HolderPct != null) lines.push(`- Top-10: ${snapshot.top10HolderPct}%`);
  if (snapshot.pairAgeMinutes != null) lines.push(`- Pair age: ${snapshot.pairAgeMinutes} min`);
  if (snapshot.change24hPct != null) lines.push(`- 24h PNL: ${snapshot.change24hPct}%`);
  if (snapshot.verdict) lines.push(`- Rugcheck: ${snapshot.verdict} (${snapshot.rugScoreNormalised ?? "?"})`);

  if (snapshot.mcapTargets) {
    const t = snapshot.mcapTargets;
    lines.push("", "MC targets (from data):");
    if (t.correctionMcapUsd != null) lines.push(`- Correction MC: $${t.correctionMcapUsd}`);
    if (t.upsideMcapUsd != null) lines.push(`- Upside MC: $${t.upsideMcapUsd}`);
    if (t.correctionNote) lines.push(`- Correction note: ${t.correctionNote}`);
    if (t.upsideNote) lines.push(`- Upside note: ${t.upsideNote}`);
  }

  return lines.join("\n");
}

function buildAgentInsightPrompt(
  agentName: string,
  snapshot: MemeTokenSnapshot,
  agentPersona?: string | null
): { system: string; user: string } {
  const sym = snapshot.symbol || snapshot.name || "this token";
  const personaHint = agentPersona?.trim()
    ? `\nYour persona (stay in character): ${agentPersona.trim().slice(0, 400)}`
    : "";

  const system = `You are ${agentName}, the user's Solana meme-token research agent on AYRA.
They ran /q on ${sym}. The structured quality report is already shown above — your job is to reply like a direct chat message.${personaHint}

Write a conversational verdict (Telegram markdown: *bold*, \`code\`, light emojis).

REQUIRED structure:
1. Opening line — pick ONE clear stance:
   - "❌ *Don't buy ${sym}* — …" when filters failed or risk is too high
   - "⚠️ *Wait / watch only* — …" when mixed signals or setup looks extended
   - "✅ *OK to consider a small buy* — …" only when AYRA filters passed AND metrics look reasonable

2. Body (2–4 short sentences, first person):
   - Explain WHY in plain language, like you're advising a friend
   - Lead with the main reasons (e.g. "MCAP is still under $25K" and "top 10 wallets hold 68%")
   - Mention what IS good if relevant (e.g. "rug score looks safe, but…")
   - If MC targets exist, say whether to wait for a dip or avoid chasing

3. Close with: "_Not financial advice — DYOR._"

Rules:
- Sound like a chat reply, NOT a report or bullet list
- Use only facts from the context below — never invent numbers
- Be direct: tell them to buy, skip, or wait — don't be vague
- ~80–150 words
- English unless the user clearly used another language`;

  const user = `${buildQualityContext(snapshot)}

Full JSON (reference only):
${JSON.stringify(snapshot)}`;

  return { system, user };
}

export async function runQualityReportWithAgent(
  userId: string,
  agentId: string,
  mint: string,
  options?: { maxPairAgeHours?: number; trigger?: string }
): Promise<{ handled: boolean; message?: string }> {
  const skill = getSkill("token-quality-report");
  if (!skill) {
    return { handled: true, message: "❌ AYRA quality report skill is not available." };
  }

  const run = await prisma.agentRun.create({
    data: { agentId, status: "RUNNING", trigger: options?.trigger ?? "telegram" },
  });

  const logFn = async (
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    toolUsed?: string
  ) => {
    await prisma.agentLog.create({ data: { agentId, runId: run.id, level, message, toolUsed } });
  };

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, template: true, memoryEnabled: true },
    });
    const agentName = agent?.name?.trim() || "AYRA Agent";

    await logFn("INFO", `Quality report (/q): ${mint}`, "token-quality-report");

    const maxPairAgeHours = options?.maxPairAgeHours ?? QUALITY_MAX_PAIR_AGE_HOURS;
    const raw = await skill.execute(
      { mint, maxPairAgeHours },
      { agentId, userId, runId: run.id, log: logFn }
    );

    const result = raw as MemeTokenSnapshot & { ok?: boolean; error?: string };
    if (result.ok === false || result.error) {
      const errMsg = result.error || "Quality report failed";
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: "FAILED", completedAt: new Date(), error: errMsg, summary: errMsg },
      });
      return { handled: true, message: `❌ ${errMsg}` };
    }

    const snapshot = result as MemeTokenSnapshot;
    const baseReport = formatAyraQualityReport(snapshot, { agentName });

    await logFn("INFO", "Generating agent chat verdict for /q", "token-quality-report");

    const { system, user } = buildAgentInsightPrompt(
      agentName,
      snapshot,
      agent ? getSystemPromptForAgent(agent) : null
    );
    const verdict = await runLlm(userId, system, user, 750);

    const verdictBlock = verdict.trim()
      ? `\n\n---\n\n💬 *${agentName}*\n${verdict.trim()}`
      : `\n\n---\n\n💬 *${agentName}*\n_(Could not generate a reply — check your LLM API key and model in Settings.)_`;

    const message = `${baseReport}${verdictBlock}`;

    if (agent?.memoryEnabled) {
      const sym = snapshot.symbol || snapshot.name || snapshot.mint.slice(0, 8);
      const failedSummary = snapshot.rejectReasons.slice(0, 3).join("; ") || "none";
      try {
        await prisma.agentMemory.create({
          data: {
            agentId,
            content: `Telegram /q review (${new Date().toISOString().slice(0, 10)}): ${sym} mint ${snapshot.mint} — filters ${snapshot.passed ? "PASSED" : "FAILED"}. Failed: ${failedSummary}. MCAP ${snapshot.marketCapUsd ?? "?"}, top-10 ${snapshot.top10HolderPct ?? "?"}%, rug ${snapshot.verdict ?? "?"}. User may ask follow-ups like "is it good?" about this token.`,
            tags: ["quality-report", "telegram", sym.toLowerCase()],
          },
        });
      } catch {
        // Memory is best-effort; do not fail the command.
      }
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        toolCalls: 1,
        output: message,
        summary: message.slice(0, 500),
      },
    });

    return { handled: true, message };
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Quality report with agent failed";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", completedAt: new Date(), error: errMsg, summary: errMsg },
    });

    if (isLlmKeyError(error)) {
      return {
        handled: true,
        message:
          "❌ LLM API key required for /q agent reply. Add your key in Dashboard → Settings → LLM.",
      };
    }

    return { handled: true, message: `❌ ${errMsg}` };
  }
}
