import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse, rateLimitResponse } from "@/lib/auth-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { scheduleToCron, getNextRunTime } from "@/lib/agent/scheduler";
import { resolveAgentCreateFields } from "@/lib/agent/template-config";
import { normalizeChatModel } from "@/lib/models";
import { enrichAgentWithUserModels } from "@/lib/agent/enrich-agent-models";
import { healAllAgentModelsFromUser } from "@/lib/user-models";
import { omitSystemPrompt } from "@/lib/agent/system-prompts";
import { healStaleRunsForUser } from "@/lib/agent/heal-stale-runs";
import type { ScheduleInterval } from "@prisma/client";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultModel: true, defaultImageModel: true },
  });

  await healAllAgentModelsFromUser(user.id);
  await healStaleRunsForUser(user.id);

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    include: {
      skills: { include: { skill: true }, where: { enabled: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { runs: true, logs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    agents.map((agent) => omitSystemPrompt(enrichAgentWithUserModels(agent, dbUser ?? {})))
  );
}

const createAgentSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().optional(),
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
    const resolved = resolveAgentCreateFields(data.template, data);

    if (resolved.template === "custom" && !data.name?.trim()) {
      return NextResponse.json({ error: "Agent name is required for custom agents." }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultModel: true, defaultImageModel: true },
    });

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        name: resolved.name,
        description: resolved.description,
        systemPrompt: resolved.systemPrompt,
        model: normalizeChatModel(dbUser?.defaultModel),
        imageModel: dbUser?.defaultImageModel ?? null,
        template: resolved.template,
        memoryEnabled: resolved.memoryEnabled,
        schedule: resolved.schedule as ScheduleInterval,
        telegramNotify: resolved.telegramNotify,
        autoPostX: resolved.autoPostX,
        status: "ACTIVE",
      },
    });

    if (resolved.skillSlugs.length > 0) {
      const skills = await prisma.skill.findMany({
        where: { slug: { in: resolved.skillSlugs } },
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

    return NextResponse.json(omitSystemPrompt(full!), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
