/**
 * Timezone-aware clock for AYRA.
 * Ported from hermes-agent hermes_time.py — Hermes → AYRA naming.
 *
 * Resolution order:
 * 1. AYRA_TIMEZONE env
 * 2. Server local time
 */

const DEFAULT_TZ = process.env.AYRA_TIMEZONE?.trim() || "";

let cachedTz: string | null = null;

export function getTimezoneName(): string {
  if (cachedTz !== null) return cachedTz;
  cachedTz = DEFAULT_TZ;
  return cachedTz;
}

export function resetTimezoneCache(): void {
  cachedTz = null;
}

/** Current Date in configured timezone (falls back to server local). */
export function ayraNow(): Date {
  const tz = getTimezoneName();
  if (!tz) return new Date();

  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const parts: Record<string, string> = {};
    for (const p of formatted) {
      if (p.type !== "literal") parts[p.type] = p.value;
    }

    return new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
    );
  } catch {
    return new Date();
  }
}

export function formatAyraDateTime(date = new Date(), tz?: string): string {
  const zone = tz || getTimezoneName() || undefined;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
