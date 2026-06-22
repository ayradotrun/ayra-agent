import { DEFAULT_AGENT_PROMPT } from "@/lib/utils";

export const DEFAULT_SYSTEM_PROMPT = DEFAULT_AGENT_PROMPT;

export function buildAgentPrompt(params: {
  systemPrompt: string;
  agentName: string;
  skills: Array<{ name: string; description: string }>;
  memories?: Array<{ content: string }>;
}): string {
  const parts = [params.systemPrompt];

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

  return parts.join("\n");
}

export function buildRunPrompt(
  trigger: "manual" | "scheduled" | "telegram" | "chat" = "manual",
  userMessage?: string
): string {
  if ((trigger === "telegram" || trigger === "chat") && userMessage) {
    const channel = trigger === "chat" ? "dashboard chat" : "Telegram";
    return `The user sent this message via ${channel}. You MUST use tools to fetch real data — never guess prices or facts.

Rules:
- "sol price" / SOL price → call sol_price_checker (no arguments)
- Token price with mint address → token_price_tracker
- Generate/draw image → image_generator
- After tool results, reply clearly in the same language the user used, with concrete numbers

User message:

${userMessage}`;
  }
  if (trigger === "scheduled") {
    return "This is a scheduled run. Execute your configured tasks, use available tools as needed, and provide a concise summary of actions taken.";
  }
  return "Execute the agent's tasks. Use available tools as needed and provide a concise summary.";
}
