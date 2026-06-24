/** UI-facing agent state — separate from DB ACTIVE/PAUSED */

export type AgentDisplayStatus = "running" | "paused" | "active" | "idle";

const STALE_RUN_MS = 15 * 60 * 1000;

type LatestRun = { status: string; startedAt: string | Date } | null | undefined;

export function isRunInProgress(
  latestRun: LatestRun,
  localRunning = false
): boolean {
  if (localRunning) return true;
  if (!latestRun || latestRun.status !== "RUNNING") return false;
  const started =
    latestRun.startedAt instanceof Date
      ? latestRun.startedAt.getTime()
      : new Date(latestRun.startedAt).getTime();
  if (!Number.isFinite(started)) return false;
  return Date.now() - started < STALE_RUN_MS;
}

export function resolveAgentDisplayStatus(
  agentStatus: string,
  latestRun: LatestRun,
  localRunning = false
): AgentDisplayStatus {
  if (isRunInProgress(latestRun, localRunning)) return "running";
  if (agentStatus.toUpperCase() === "PAUSED") return "paused";
  if (!latestRun) return "idle";
  return "active";
}

export function agentDisplayStatusLabel(status: AgentDisplayStatus): string {
  switch (status) {
    case "running":
      return "running";
    case "paused":
      return "paused";
    case "active":
      return "active";
    default:
      return "idle";
  }
}

export function agentDisplayStatusVariant(
  status: AgentDisplayStatus
): "success" | "warning" | "destructive" | "default" | "secondary" {
  switch (status) {
    case "running":
      return "default";
    case "paused":
      return "warning";
    case "active":
      return "success";
    default:
      return "secondary";
  }
}
