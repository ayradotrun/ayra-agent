import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { scheduleBlueprintTask, BlueprintFillError } from "@/lib/cron";
import { getBlueprintCatalogFromRuntime } from "@/lib/cron/python-bridge";
import { ensurePythonRuntime } from "@/lib/python/spawn-runtime";
import { z } from "zod";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  await ensurePythonRuntime();
  const catalog = await getBlueprintCatalogFromRuntime();
  return NextResponse.json(catalog);
}

const scheduleSchema = z.object({
  blueprintKey: z.string().min(1),
  agentId: z.string().min(1),
  values: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const parsed = scheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await ensurePythonRuntime();

  const { blueprintKey, agentId, values } = parsed.data;

  try {
    const result = await scheduleBlueprintTask({
      userId: user.id,
      agentId,
      blueprintKey,
      values: values ?? {},
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof BlueprintFillError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to schedule blueprint";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
