import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import { postTweet, resolveAutoPostReadiness } from "@/lib/x-api";
import { notifyUserBrainEvent } from "@/lib/brain/brain-notify";
import {
  findDueBrainTasksGlobally,
  getBrainTaskById,
  updateBrainTask,
  createBrainTask,
} from "@/lib/brain/brain-store";
import { getNextCronRunFromPython } from "@/lib/cron/python-bridge";
import { buildBlueprintJob } from "@/lib/cron/schedule-blueprint";

function payloadString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object") return null;
  const v = (payload as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function rescheduleBlueprintTask(
  userId: string,
  agentId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const recurrenceCron = payloadString(payload, "recurrenceCron");
  if (!recurrenceCron) return;

  const blueprintKey = payloadString(payload, "blueprintKey");
  const slotValues =
    payload.slotValues && typeof payload.slotValues === "object"
      ? (payload.slotValues as Record<string, unknown>)
      : {};

  let job;
  if (blueprintKey) {
    try {
      job = await buildBlueprintJob(blueprintKey, slotValues);
    } catch {
      job = null;
    }
  }

  const instruction = payloadString(payload, "instruction") || job?.prompt || "Scheduled AYRA task";
  const schedule = job?.schedule || recurrenceCron;
  const nextRun = await getNextCronRunFromPython(schedule, new Date());

  await createBrainTask({
    userId,
    agentId,
    type: "CUSTOM",
    title: job?.name || payloadString(payload, "title") || "Scheduled automation",
    payload: {
      ...payload,
      instruction,
      recurrenceCron: schedule,
    },
    scheduledAt: nextRun,
  });
}

async function executeBrainTask(userId: string, taskId: string): Promise<void> {
  const task = await getBrainTaskById(userId, taskId);
  if (!task || task.status !== "PENDING") return;

  const agent = await prisma.agent.findUnique({
    where: { id: task.agentId },
    select: { id: true, name: true, autoPostX: true, userId: true, status: true },
  });

  if (!agent) {
    await updateBrainTask(userId, taskId, {
      status: "FAILED",
      error: "Agent not found",
    });
    return;
  }

  if (agent.status !== "ACTIVE") {
    await updateBrainTask(userId, taskId, {
      status: "FAILED",
      error: "Agent is not active",
    });
    return;
  }

  await updateBrainTask(userId, taskId, { status: "RUNNING" });

  try {
    let result = "";

    switch (task.type) {
      case "TWEET": {
        const text =
          payloadString(task.payload, "text") ||
          payloadString(task.payload, "draft") ||
          task.title;
        const canPostStatus = await resolveAutoPostReadiness(task.userId, agent.autoPostX);
        if (!canPostStatus.ready) {
          await notifyUserBrainEvent(
            task.userId,
            `📅 *Scheduled tweet* (draft — auto-post blocked)\n\n${text.slice(0, 500)}\n\n_${canPostStatus.message}_`
          );
          result = `Draft sent — ${canPostStatus.message}`;
        } else {
          const posted = await postTweet(task.userId, text);
          result = `Tweet posted: ${posted.tweetId}`;
          await notifyUserBrainEvent(
            task.userId,
            `✅ *Scheduled tweet published*\n\n${posted.text.slice(0, 400)}`
          );
        }
        break;
      }
      case "REMINDER": {
        const message =
          payloadString(task.payload, "text") ||
          payloadString(task.payload, "message") ||
          task.title;
        await notifyUserBrainEvent(task.userId, `⏰ *Reminder*\n\n${message}`);
        result = "Reminder sent via Telegram";
        break;
      }
      case "CALENDAR":
      case "CUSTOM": {
        const instruction =
          payloadString(task.payload, "instruction") ||
          payloadString(task.payload, "draft") ||
          task.title;
        const platform = payloadString(task.payload, "platform");
        const userMessage = [
          `Execute scheduled brain task: ${task.title}`,
          `Type: ${task.type}`,
          platform ? `Platform: ${platform}` : "",
          "",
          instruction,
        ]
          .filter(Boolean)
          .join("\n");

        const run = await runAgent(task.agentId, {
          trigger: "scheduled",
          userMessage,
        });
        result = run.summary?.slice(0, 500) || run.output?.slice(0, 500) || "Run completed";
        await notifyUserBrainEvent(
          task.userId,
          `📋 *Calendar task:* ${task.title}\n\n${result.slice(0, 800)}`
        );
        break;
      }
      default:
        result = "Unknown task type";
    }

    await updateBrainTask(userId, taskId, {
      status: "COMPLETED",
      completedAt: new Date(),
      result,
    });

    const payloadObj =
      task.payload && typeof task.payload === "object"
        ? (task.payload as Record<string, unknown>)
        : null;
    if (payloadObj?.recurrenceCron && (task.type === "CUSTOM" || task.type === "CALENDAR")) {
      await rescheduleBlueprintTask(task.userId, task.agentId, payloadObj);
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Task execution failed";
    await updateBrainTask(userId, taskId, {
      status: "FAILED",
      completedAt: new Date(),
      error: errMsg,
    });
    await notifyUserBrainEvent(
      task.userId,
      `❌ *Brain task failed:* ${task.title}\n\n${errMsg}`
    );
  }
}

async function runDueBrainTasks(): Promise<void> {
  const due = await findDueBrainTasksGlobally(10);

  for (const { userId, taskId } of due) {
    await executeBrainTask(userId, taskId);
  }
}

export function startBrainWorker(): void {
  if (process.env.BRAIN_WORKER_ENABLED === "false") {
    console.log("[Brain] Disabled (BRAIN_WORKER_ENABLED=false)");
    return;
  }

  cron.schedule("* * * * *", () => {
    runDueBrainTasks().catch((err) => console.error("[Brain] Tick error:", err));
  });

  console.log(
    `[Brain] AYRA brain worker started (per-user storage, checks every minute)`
  );
}
