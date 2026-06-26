import { DEFAULT_AGENT_PROMPT } from "@/lib/utils";
import { AYRA_BRAIN_INSTRUCTIONS } from "@/lib/brain/ayra-brain";

export const DEFAULT_SYSTEM_PROMPT = DEFAULT_AGENT_PROMPT;

/** Hermes-style generalist reasoning — broad domain coverage beyond crypto-only flows */
export const AYRA_GENERAL_REASONING = `General intelligence (Hermes-style):
- Think step-by-step on complex questions before answering. Break problems into parts.
- You are a broad-capability agent: research, coding, DevOps, content, planning, crypto/Solana, and everyday Q&A.
- Combine tools + conversation history + memory. Use web-search for current facts; memory-search for past context.
- Explain trade-offs clearly. Say when you are uncertain. Never invent live numbers or API results.
- Match the user's language (Indonesian or English). Be conversational but precise.
- For follow-ups ("bagus ga?", "should I?", "why?"), use prior messages — do not reset with a generic intro.`;

export function buildAgentPrompt(params: {
  systemPrompt: string;
  agentName: string;
  skills: Array<{ name: string; description: string }>;
  memories?: Array<{ content: string; source?: string }>;
  brainContext?: string;
  ayraBrain?: boolean;
}): string {
  const parts = [params.systemPrompt, "\n" + AYRA_GENERAL_REASONING];

  if (params.ayraBrain) {
    parts.push("\n" + AYRA_BRAIN_INSTRUCTIONS);
  }

  parts.push(`\nAgent name: ${params.agentName}`);

  if (params.skills.length > 0) {
    parts.push("\nAvailable tools:");
    for (const skill of params.skills) {
      parts.push(`- ${skill.name}: ${skill.description}`);
    }
    parts.push(
      "\nYou MUST call tools for live data (prices, balances, web facts). Never invent numbers.",
      "You may call multiple tools across domains when the question needs it (research + memory + crypto + web).",
      "After tool results, synthesize a clear answer — not just raw JSON."
    );
  }

  if (params.memories && params.memories.length > 0) {
    parts.push("\nRecent memories (Postgres + AgentMemory when enabled):");
    for (const mem of params.memories.slice(0, 10)) {
      const tag = mem.source === "agentmemory" ? "[agentmemory] " : "";
      parts.push(`- ${tag}${mem.content}`);
    }
  }

  if (params.brainContext) {
    parts.push(params.brainContext);
  }

  return parts.join("\n");
}

export async function buildScheduledRunPrompt(agentId: string): Promise<string> {
  const { buildBrainScheduledPrompt } = await import("@/lib/brain/ayra-brain");
  return buildBrainScheduledPrompt(agentId);
}

export function buildRunPrompt(
  trigger: "manual" | "scheduled" | "telegram" | "chat" = "manual",
  userMessage?: string
): string {
  if ((trigger === "telegram" || trigger === "chat") && userMessage) {
    const channel = trigger === "chat" ? "dashboard chat" : "Telegram";
    return `The user sent this message via ${channel}.

CONTEXT — read conversation history above first:
- Follow-ups like "is it good?", "bagus ga?", "should I buy?", "kenapa?", "that token", "itu" refer to the topic in recent messages (e.g. a token from /q or /p). Answer about THAT topic directly.
- Do NOT reintroduce yourself or list your capabilities unless they explicitly ask who you are or what you can do.
- For follow-ups about data already in the conversation, answer from context; only call tools if they need fresh/live numbers.

You MUST use tools to fetch NEW live data — never guess prices or facts.

Rules:
- "sol price" / SOL price → call sol_price_checker (no arguments)
- Token price with mint address → token_price_tracker
- Generate/draw image → image_generator
- Look up X/Twitter account / @username / "akun x …" / "search akun x" → x_profile_lookup (NOT web_search). Requires X connected in Settings.
- Optional: recent tweets from that account → x_timeline_reader
- Research / explain / compare / general questions (NOT X profiles) → web_search and/or memory_search
- User asks to post/publish tweet to X → call x_post with text (use postNow true). Tool slug is x_post, NOT post_x.
- After tool results, reply clearly in the same language the user used, with concrete numbers when available

User message:

${userMessage}`;
  }
  if (trigger === "scheduled") {
    return "This is a scheduled run. Execute your configured tasks, use available tools as needed, and provide a concise summary of actions taken.";
  }
  return "Execute the agent's tasks. Use available tools as needed and provide a concise summary.";
}
