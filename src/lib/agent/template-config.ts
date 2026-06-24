import { AGENT_TEMPLATES, AYRA_OFFICE_IDENTITY, DEFAULT_AGENT_PROMPT } from "@/lib/utils";
import type { ScheduleInterval } from "@prisma/client";

export function normalizeTemplateId(templateId?: string | null): string {
  if (!templateId) return "custom";
  if (templateId === "nova-hermes") return "nova-ayra";
  return templateId;
}

export function getAgentTemplate(templateId?: string | null) {
  const id = normalizeTemplateId(templateId);
  return AGENT_TEMPLATES.find((t) => t.id === id);
}

export function isCustomAgentTemplate(templateId?: string | null): boolean {
  return normalizeTemplateId(templateId) === "custom";
}

/** Custom agents still operate under AYRA — prepend office identity if missing */
export function wrapCustomSystemPrompt(userPrompt?: string | null): string {
  const trimmed = (userPrompt ?? "").trim();
  if (!trimmed) return DEFAULT_AGENT_PROMPT;
  if (
    trimmed.includes("You work at AYRA Agent") ||
    trimmed.includes("AYRA Agent — an autonomous operations platform")
  ) {
    return trimmed;
  }
  return `${AYRA_OFFICE_IDENTITY}\n\n${trimmed}`;
}

export interface ResolvedAgentCreateFields {
  name: string;
  description: string;
  systemPrompt: string;
  schedule: ScheduleInterval;
  skillSlugs: string[];
  telegramNotify: boolean;
  autoPostX: boolean;
  memoryEnabled: boolean;
  template: string;
}

export function resolveAgentCreateFields(
  templateId: string | undefined,
  input: {
    name?: string;
    description?: string;
    systemPrompt?: string;
    schedule?: string;
    skillSlugs?: string[];
    telegramNotify?: boolean;
    autoPostX?: boolean;
    memoryEnabled?: boolean;
  }
): ResolvedAgentCreateFields {
  const template = getAgentTemplate(templateId);
  const resolvedTemplateId = template?.id ?? "custom";

  if (resolvedTemplateId !== "custom" && template) {
    return {
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt,
      schedule: template.schedule as ScheduleInterval,
      skillSlugs: [...template.skills],
      telegramNotify: template.telegramNotify ?? false,
      autoPostX: template.autoPostX ?? false,
      memoryEnabled: input.memoryEnabled ?? true,
      template: resolvedTemplateId,
    };
  }

  return {
    name: (input.name ?? "").trim() || "New Hire",
    description: (input.description ?? "").trim(),
    systemPrompt: wrapCustomSystemPrompt(input.systemPrompt),
    schedule: (input.schedule ?? "MANUAL") as ScheduleInterval,
    skillSlugs: input.skillSlugs ?? [],
    telegramNotify: input.telegramNotify ?? false,
    autoPostX: input.autoPostX ?? false,
    memoryEnabled: input.memoryEnabled ?? true,
    template: "custom",
  };
}
