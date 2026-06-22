import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";
import { z } from "zod";
import { scheduleToCron, getNextRunTime } from "@/lib/agent/scheduler";
import { isValidModelId, normalizeModelId } from "@/lib/models";
import type { ScheduleInterval } from "@prisma/client";

async function getAgentForUser(id: string, userId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      skills: { include: { skill: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 10 },
      memories: { orderBy: { createdAt: "desc" }, take: 20 },
      scheduledJobs: true,
      _count: { select: { runs: true, logs: true, memories: true } },
    },
  });

  if (!agent) return null;
  if (agent.userId !== userId) return "forbidden";
  return agent;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const agent = await getAgentForUser(params.id, user.id);
  if (!agent) return notFoundResponse("Agent not found");
  if (agent === "forbidden") return forbiddenResponse();

  return NextResponse.json(agent);
}

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
  status: z.enum(["ACTIVE", "PAUSED", "ERROR"]).optional(),
  memoryEnabled: z.boolean().optional(),
  schedule: z.enum(["MANUAL", "EVERY_5_MIN", "EVERY_15_MIN", "HOURLY", "DAILY"]).optional(),
  telegramNotify: z.boolean().optional(),
  autoPostX: z.boolean().optional(),
  skillSlugs: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const existing = await getAgentForUser(params.id, user.id);
  if (!existing) return notFoundResponse("Agent not found");
  if (existing === "forbidden") return forbiddenResponse();

  try {
    const body = await request.json();
    const parsed = updateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { skillSlugs, schedule, ...rest } = parsed.data;

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(schedule ? { schedule: schedule as ScheduleInterval } : {}),
      },
    });

    if (skillSlugs) {
      await prisma.agentSkill.deleteMany({ where: { agentId: params.id } });
      const skills = await prisma.skill.findMany({
        where: { slug: { in: skillSlugs } },
      });
      if (skills.length > 0) {
        await prisma.agentSkill.createMany({
          data: skills.map((skill) => ({
            agentId: params.id,
            skillId: skill.id,
            enabled: true,
          })),
        });
      }
    }

    if (schedule) {
      await prisma.scheduledJob.deleteMany({ where: { agentId: params.id } });
      const cronExpr = scheduleToCron(schedule);
      if (cronExpr) {
        await prisma.scheduledJob.create({
          data: {
            agentId: params.id,
            cronExpr,
            nextRunAt: getNextRunTime(schedule),
            active: agent.status === "ACTIVE",
          },
        });
      }
    }

    const full = await getAgentForUser(params.id, user.id);
    return NextResponse.json(full);
  } catch {
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const existing = await getAgentForUser(params.id, user.id);
  if (!existing) return notFoundResponse("Agent not found");
  if (existing === "forbidden") return forbiddenResponse();

  await prisma.agent.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
