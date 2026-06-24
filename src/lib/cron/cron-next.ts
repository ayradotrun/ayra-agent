/**
 * Compute next run for standard 5-field cron expressions.
 * Supports patterns used by AYRA automation blueprints (ported from hermes-agent).
 */

const CRON_PARTS = 5;

function parseField(field: string, min: number, max: number, value: number): boolean {
  if (field === "*") return true;

  for (const part of field.split(",")) {
    if (part.includes("/")) {
      const [base, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      if (!step || step <= 0) continue;
      const start = base === "*" ? min : parseInt(base, 10);
      if ((value - start) % step === 0 && value >= start) return true;
      continue;
    }

    if (part.includes("-")) {
      const [a, b] = part.split("-").map((x) => parseInt(x, 10));
      if (value >= a && value <= b) return true;
      continue;
    }

    if (parseInt(part, 10) === value) return true;
  }

  return false;
}

function matchesCron(expr: string, date: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== CRON_PARTS) return false;

  const [min, hour, dom, month, dow] = parts;
  const d = date;
  const minute = d.getMinutes();
  const h = d.getHours();
  const day = d.getDate();
  const mon = d.getMonth() + 1;
  const weekday = d.getDay();

  return (
    parseField(min, 0, 59, minute) &&
    parseField(hour, 0, 23, h) &&
    parseField(dom, 1, 31, day) &&
    parseField(month, 1, 12, mon) &&
    parseField(dow, 0, 6, weekday)
  );
}

/** Parse hermes-style interval strings like "every 30m". */
export function parseScheduleExpression(schedule: string): string {
  const trimmed = schedule.trim();
  const everyMin = trimmed.match(/^every\s+(\d+)\s*m(in(ute)?s?)?$/i);
  if (everyMin) return `*/${everyMin[1]} * * * *`;

  const everyHour = trimmed.match(/^every\s+(\d+)\s*h(our(s)?)?$/i);
  if (everyHour) return `0 */${everyHour[1]} * * *`;

  return trimmed;
}

export function getNextCronRun(cronExpr: string, after = new Date()): Date {
  const expr = parseScheduleExpression(cronExpr);
  const cursor = new Date(after.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  // Search up to ~1 year ahead in 1-minute steps
  const limit = 525_600;
  for (let i = 0; i < limit; i++) {
    if (matchesCron(expr, cursor)) return new Date(cursor);
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  // Fallback: +24h
  return new Date(after.getTime() + 86_400_000);
}
