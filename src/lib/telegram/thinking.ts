import { cmdIs, cmdStarts } from "./command-utils";
import { parseSkillCommand } from "./skill-commands";

export const TELEGRAM_THINKING_MESSAGE = "🤔 *Agent is thinking…*";

/** Show a processing indicator before slow skill runs, image gen, or LLM agent runs. */
export function shouldShowTelegramThinking(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (cmdIs(trimmed, "help", "start", "agents", "status", "tasks")) return false;
  if (trimmed === "/models" || trimmed.startsWith("/models ")) return false;
  if (cmdStarts(trimmed, "use")) return false;
  if (cmdStarts(trimmed, "model")) return false;
  if (cmdStarts(trimmed, "custommodel")) return false;
  if (cmdStarts(trimmed, "imagemodel")) return false;
  if (cmdStarts(trimmed, "customimagemodel")) return false;

  if (cmdStarts(trimmed, "post")) return false;

  const skillCmd = parseSkillCommand(trimmed);
  if (skillCmd && "error" in skillCmd) return false;
  if (skillCmd) return true;

  const imageCmd = cmdStarts(trimmed, "image");
  if (imageCmd?.args.trim()) return true;

  return true;
}

/** Skip private-DB session sync for instant replies (/help, /status, …). */
export function isInstantTelegramCommand(text: string): boolean {
  return !shouldShowTelegramThinking(text);
}
