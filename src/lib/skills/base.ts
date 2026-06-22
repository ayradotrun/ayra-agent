import { z } from "zod";

export type SkillPermission = "read" | "write" | "notify" | "network";

export interface SkillContext {
  agentId: string;
  userId: string;
  runId: string;
  log: (level: "DEBUG" | "INFO" | "WARN" | "ERROR", message: string, toolUsed?: string) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SkillDefinition<TInput = any, TOutput = any> {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  permission: SkillPermission;
  isEnabled: boolean;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput, ctx: SkillContext) => Promise<TOutput>;
}

export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodField = value as z.ZodType;
      if (zodField instanceof z.ZodString) {
        properties[key] = { type: "string", description: zodField.description };
      } else if (zodField instanceof z.ZodNumber) {
        properties[key] = { type: "number", description: zodField.description };
      } else if (zodField instanceof z.ZodBoolean) {
        properties[key] = { type: "boolean", description: zodField.description };
      } else {
        properties[key] = { type: "string" };
      }
      if (!(zodField instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return { type: "object", properties, required };
  }
  return { type: "object", properties: {} };
}
