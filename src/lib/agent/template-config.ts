import { AGENT_TEMPLATES } from "@/lib/utils";
import {
  getSystemPromptForTemplate,
  normalizeTemplateId,
  wrapCustomSystemPrompt,
} from "@/lib/agent/system-prompts";
import type { ScheduleInterval } from "@prisma/client";

export { normalizeTemplateId, wrapCustomSystemPrompt };

export function getAgentTemplate(templateId?: string | null) {
  const id = normalizeTemplateId(templateId);
  return AGENT_TEMPLATES.find((t) => t.id === id);
}

export function isCustomAgentTemplate(templateId?: string | null): boolean {
  return normalizeTemplateId(templateId) === "custom";
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
    schedule?: string;
    skillSlugs?: string[];
    telegramNotify?: boolean;
    autoPostX?: boolean;
    memoryEnabled?: boolean;
  }
): ResolvedAgentCreateFields {
  const template = getAgentTemplate(templateId);
  const resolvedTemplateId = template?.id ?? "custom";
  const systemPrompt = getSystemPromptForTemplate(resolvedTemplateId);

  if (resolvedTemplateId !== "custom" && template) {
    return {
      name: template.name,
      description: template.description,
      systemPrompt,
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
    systemPrompt,
    schedule: (input.schedule ?? "MANUAL") as ScheduleInterval,
    skillSlugs: input.skillSlugs ?? [],
    telegramNotify: input.telegramNotify ?? false,
    autoPostX: input.autoPostX ?? false,
    memoryEnabled: input.memoryEnabled ?? true,
    template: "custom",
  };
}
