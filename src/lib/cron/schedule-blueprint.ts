/**
 * Schedule an automation blueprint as a recurring AYRA brain task.
 */

import { createBrainTask } from "@/lib/brain/brain-store";
import {
  buildBlueprintJobViaPython,
  getNextCronRunFromPython,
} from "./python-bridge";
import type { FilledBlueprintJob } from "./blueprint-fill";

export interface ScheduleBlueprintInput {
  userId: string;
  agentId: string;
  blueprintKey: string;
  values?: Record<string, unknown>;
}

export interface ScheduleBlueprintResult {
  ok: true;
  taskId: string;
  scheduledAt: string;
  schedule: string;
  name: string;
  blueprintKey: string;
}

export async function buildBlueprintJob(
  blueprintKey: string,
  values: Record<string, unknown> = {}
): Promise<FilledBlueprintJob> {
  return buildBlueprintJobViaPython(blueprintKey, values);
}

export async function scheduleBlueprintTask(
  input: ScheduleBlueprintInput
): Promise<ScheduleBlueprintResult> {
  const job = await buildBlueprintJob(input.blueprintKey, input.values ?? {});
  const nextRun = await getNextCronRunFromPython(job.schedule);

  const task = await createBrainTask({
    userId: input.userId,
    agentId: input.agentId,
    type: "CUSTOM",
    title: job.name,
    payload: {
      instruction: job.prompt,
      deliver: job.deliver,
      blueprintKey: job.blueprintKey,
      slotValues: job.slotValues,
      recurrenceCron: job.schedule,
      skills: job.skills,
    },
    scheduledAt: nextRun,
  });

  return {
    ok: true,
    taskId: task.id,
    scheduledAt: task.scheduledAt.toISOString(),
    schedule: job.schedule,
    name: job.name,
    blueprintKey: job.blueprintKey,
  };
}
