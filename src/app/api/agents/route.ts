import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse, rateLimitResponse } from "@/lib/auth-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { scheduleToCron, getNextRunTime } from "@/lib/agent/scheduler";
import { isValidModelId, normalizeModelId } from "@/lib/models";
import type { ScheduleInterval } from "@prisma/client";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    include: {
      skills: { include: { skill: true }, where: { enabled: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { runs: true, logs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(agents);
}

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  model: z
    .string()
    .optional()
    .transform((v) => (v ? normalizeModelId(v) : v))
    .refine((v) => !v || isValidModelId(v), {
      message: "Invalid model ID. Use OpenRouter format: provider/model-id",
    }),
  imageModel: z
    .string()
    .optional()
    .transform((v) => (v ? normalizeModelId(v) : v))
    .refine((v) => !v || isValidModelId(v), {
      message: "Invalid image model ID. Use OpenRouter format: provider/model-id",
    }),
  template: z.string().optional(),
  memoryEnabled: z.boolean().optional(),
  schedule: z.enum(["MANUAL", "EVERY_5_MIN", "EVERY_15_MIN", "HOURLY", "DAILY"]).optional(),
  telegramNotify: z.boolean().optional(),
  autoPostX: z.boolean().optional(),
  skillSlugs: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const ip = getClientIp(request);
  const limit = rateLimit(`agents:${user.id}:${ip}`, 20);
  if (!limit.success) return rateLimitResponse();

  try {
    const body = await request.json();
    const parsed = createAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        model: data.model,
        imageModel: data.imageModel,
        template: data.template,
        memoryEnabled: data.memoryEnabled ?? true,
        schedule: (data.schedule ?? "MANUAL") as ScheduleInterval,
        telegramNotify: data.telegramNotify ?? false,
        autoPostX: data.autoPostX ?? false,
      },
    });

    if (data.skillSlugs && data.skillSlugs.length > 0) {
      const skills = await prisma.skill.findMany({
        where: { slug: { in: data.skillSlugs } },
      });

      await prisma.agentSkill.createMany({
        data: skills.map((skill) => ({
          agentId: agent.id,
          skillId: skill.id,
          enabled: true,
        })),
      });
    }

    const cronExpr = scheduleToCron(agent.schedule);
    if (cronExpr) {
      await prisma.scheduledJob.create({
        data: {
          agentId: agent.id,
          cronExpr,
          nextRunAt: getNextRunTime(agent.schedule),
          active: true,
        },
      });
    }

    const full = await prisma.agent.findUnique({
      where: { id: agent.id },
      include: { skills: { include: { skill: true } } },
    });

    return NextResponse.json(full, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
