/**
 * Cron blueprint operations via the required AYRA Python runtime.
 */

import {
  fetchBlueprintCatalogFromPython,
  fillBlueprintViaPython,
  getNextCronRunViaPython,
  PythonRuntimeError,
} from "@/lib/python/runtime-client";
import type { FilledBlueprintJob } from "./blueprint-fill";
import { BlueprintFillError } from "./types";

export async function getBlueprintCatalogFromRuntime() {
  return fetchBlueprintCatalogFromPython();
}

export async function buildBlueprintJobViaPython(
  blueprintKey: string,
  values: Record<string, unknown> = {}
): Promise<FilledBlueprintJob> {
  try {
    const job = await fillBlueprintViaPython(blueprintKey, values);
    return {
      blueprintKey: job.blueprintKey,
      slotValues: job.slotValues,
      prompt: job.prompt,
      schedule: job.schedule,
      name: job.name,
      deliver: job.deliver,
      skills: job.skills ?? [],
    };
  } catch (error) {
    if (error instanceof PythonRuntimeError) {
      throw new BlueprintFillError(error.message);
    }
    throw error;
  }
}

export async function getNextCronRunFromPython(schedule: string, after?: Date): Promise<Date> {
  return getNextCronRunViaPython(schedule, after);
}
