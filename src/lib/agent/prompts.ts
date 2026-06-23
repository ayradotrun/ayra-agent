import { DEFAULT_AGENT_PROMPT } from "@/lib/utils";
import { AYRA_BRAIN_INSTRUCTIONS } from "@/lib/brain/ayra-brain";

export const DEFAULT_SYSTEM_PROMPT = DEFAULT_AGENT_PROMPT;

export function buildAgentPrompt(params: {
  systemPrompt: string;
  agentName: string;
  skills: Array<{ name: string; description: string }>;
  memories?: Array<{ content: string }>;
  brainContext?: string;
  ayraBrain?: boolean;
}): string {
  const parts = [params.systemPrompt];

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
      "Call one tool at a time, wait for results, then answer clearly."
    );
  }

  if (params.memories && params.memories.length > 0) {
    parts.push("\nRecent memories:");
    for (const mem of params.memories.slice(0, 5)) {
      parts.push(`- ${mem.content}`);
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
- User asks to post/publish tweet to X → call x_post with text (use postNow true). Tool slug is x_post, NOT post_x.
- After tool results, reply clearly in the same language the user used, with concrete numbers

User message:

${userMessage}`;
  }
  if (trigger === "scheduled") {
    return "This is a scheduled run. Execute your configured tasks, use available tools as needed, and provide a concise summary of actions taken.";
  }
  return "Execute the agent's tasks. Use available tools as needed and provide a concise summary.";
}
