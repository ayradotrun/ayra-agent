const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  telegram: "Telegram",
  chat: "Chat",
};

export function formatRunTrigger(trigger?: string | null): string {
  if (!trigger) return "Manual";
  return TRIGGER_LABELS[trigger] ?? trigger;
}

export function runTriggerVariant(
  trigger?: string | null
): "default" | "secondary" | "outline" {
  switch (trigger) {
    case "telegram":
      return "default";
    case "chat":
      return "secondary";
    case "scheduled":
      return "outline";
    default:
      return "secondary";
  }
}
