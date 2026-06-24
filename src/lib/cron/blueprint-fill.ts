/**
 * Blueprint fill, validate, and render helpers.
 * Ported from hermes-agent cron/blueprint_catalog.py
 */

import type { AutomationBlueprint } from "./types";
import { BlueprintFillError } from "./types";
import { DAY_TO_DOW, WEEKDAY_PRESETS } from "./weekday-presets";

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function blueprintFormSchema(blueprint: AutomationBlueprint) {
  return {
    key: blueprint.key,
    title: blueprint.title,
    description: blueprint.description,
    category: blueprint.category,
    tags: [...(blueprint.tags ?? [])],
    fields: blueprint.slots.map((s) => ({
      name: s.name,
      type: s.type,
      label: s.label,
      default: s.default ?? null,
      options: [...(s.options ?? [])],
      optional: s.optional ?? false,
      strict: s.strict ?? true,
      help: s.help ?? "",
    })),
  };
}

export function blueprintSlashCommand(
  blueprint: AutomationBlueprint,
  values?: Record<string, unknown>
): string {
  const parts = [`/blueprint ${blueprint.key}`];
  for (const s of blueprint.slots) {
    let val = values?.[s.name] ?? s.default;
    if ((val === null || val === undefined || val === "") && s.optional) continue;
    let sval = String(val ?? "");
    if (s.type === "text" || sval.includes(" ")) {
      sval = `"${sval.replace(/"/g, '\\"')}"`;
    }
    parts.push(`${s.name}=${sval}`);
  }
  return parts.join(" ");
}

export function blueprintDeeplink(
  blueprint: AutomationBlueprint,
  values?: Record<string, unknown>
): string {
  const params = new URLSearchParams();
  for (const s of blueprint.slots) {
    const val = values?.[s.name] ?? s.default;
    if (val !== null && val !== undefined && val !== "") {
      params.set(s.name, String(val));
    }
  }
  const qs = params.toString();
  return `ayra://blueprint/${encodeURIComponent(blueprint.key)}${qs ? `?${qs}` : ""}`;
}

function humanizeSchedule(blueprint: AutomationBlueprint): string {
  const sched = blueprint.scheduleTemplate;
  if (sched.startsWith("*/")) {
    const iv = blueprint.slots.find((s) => s.name === "interval_min");
    const every = String(iv?.default ?? sched.split("/")[1]?.split(" ")[0] ?? "30");
    return `every ${every} minutes`;
  }
  const timeSlot = blueprint.slots.find((s) => s.type === "time");
  const when = timeSlot?.default;
  if (sched.includes("* * 1-5")) {
    return when ? `weekdays at ${when}` : "every weekday";
  }
  if (sched.includes("{dow}")) {
    const daySlot = blueprint.slots.find((s) => s.name === "day" || s.name === "recurrence");
    const scope = daySlot?.default ?? "";
    if (scope && when) return `${scope} at ${when}`;
    return when ? `at ${when}` : "on a schedule";
  }
  return when ? `daily at ${when}` : "on a schedule";
}

export function blueprintCatalogEntry(blueprint: AutomationBlueprint) {
  return {
    ...blueprintFormSchema(blueprint),
    schedule: blueprint.scheduleTemplate,
    scheduleHuman: humanizeSchedule(blueprint),
    command: blueprintSlashCommand(blueprint),
    appUrl: blueprintDeeplink(blueprint),
    skills: [...(blueprint.skills ?? [])],
  };
}

function resolveSchedule(blueprint: AutomationBlueprint, values: Record<string, unknown>): string {
  let sched = blueprint.scheduleTemplate;

  if (values.schedule) return String(values.schedule);

  const repl: Record<string, string> = {};

  const timeVal = values.time;
  if (sched.includes("{minute}") || sched.includes("{hour}")) {
    if (!timeVal) throw new BlueprintFillError("a time is required");
    const m = TIME_RE.exec(String(timeVal).trim());
    if (!m) throw new BlueprintFillError(`invalid time ${timeVal} — use HH:MM (24h)`);
    repl.hour = String(parseInt(m[1], 10));
    repl.minute = String(parseInt(m[2], 10));
  }

  if (sched.includes("{dow}")) {
    if (values.recurrence) {
      const preset = String(values.recurrence).toLowerCase();
      if (!WEEKDAY_PRESETS[preset]) {
        throw new BlueprintFillError(`unknown recurrence ${preset}`);
      }
      repl.dow = WEEKDAY_PRESETS[preset];
    } else if (values.day) {
      const day = String(values.day).toLowerCase();
      if (!DAY_TO_DOW[day]) throw new BlueprintFillError(`unknown day ${day}`);
      repl.dow = DAY_TO_DOW[day];
    } else {
      repl.dow = "*";
    }
  }

  if (sched.includes("{interval_min}")) {
    const iv = String(values.interval_min ?? "").trim();
    if (!/^\d+$/.test(iv) || parseInt(iv, 10) <= 0) {
      throw new BlueprintFillError(`invalid interval ${iv}`);
    }
    repl.interval_min = iv;
  }

  const placeholders = sched.match(/\{(\w+)\}/g) ?? [];
  for (const token of placeholders) {
    const key = token.slice(1, -1);
    if (!repl[key] && values[key] !== undefined) {
      repl[key] = String(values[key]);
    }
  }

  return sched.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in repl)) throw new BlueprintFillError(`schedule template missing value for ${name}`);
    return repl[name];
  });
}

function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (!(name in values)) throw new BlueprintFillError(`prompt missing value for ${name}`);
    return String(values[name]);
  });
}

export interface FilledBlueprintJob {
  prompt: string;
  schedule: string;
  name: string;
  deliver: string;
  skills: string[];
  blueprintKey: string;
  slotValues: Record<string, unknown>;
}

export function fillBlueprint(
  blueprint: AutomationBlueprint,
  values: Record<string, unknown>
): FilledBlueprintJob {
  const known = new Set(blueprint.slots.map((s) => s.name));
  const unknown = Object.keys(values).filter((k) => !known.has(k));
  if (unknown.length) {
    throw new BlueprintFillError(
      `unknown slot(s): ${unknown.join(", ")} — valid: ${Array.from(known).join(", ")}`
    );
  }

  const resolved: Record<string, unknown> = {};
  for (const s of blueprint.slots) {
    const raw = values[s.name] ?? s.default;
    if (raw === null || raw === undefined || raw === "") {
      if (s.optional) continue;
      throw new BlueprintFillError(`missing required value: ${s.name} (${s.label})`);
    }
    if (s.type === "enum" && s.strict !== false && s.options?.length) {
      const allowed = new Set(s.options.map(String));
      if (!allowed.has(String(raw))) {
        throw new BlueprintFillError(`${s.name}=${raw} not allowed — one of ${s.options.join(", ")}`);
      }
    }
    resolved[s.name] = raw;
  }

  const schedule = resolveSchedule(blueprint, resolved);
  const prompt = renderTemplate(blueprint.promptTemplate, resolved);

  return {
    prompt,
    schedule,
    name: blueprint.title,
    deliver: String(resolved.deliver ?? blueprint.deliverDefault ?? "telegram"),
    skills: [...(blueprint.skills ?? [])],
    blueprintKey: blueprint.key,
    slotValues: resolved,
  };
}
