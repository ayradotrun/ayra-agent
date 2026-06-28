import { estimateTokenCostUsd } from "./cost-estimate";
import { getModelLabel } from "@/lib/models";

export type UsageRangeDays = 1 | 7 | 14 | 30;

export interface RunUsageRow {
  startedAt: Date;
  tokenUsage: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  agent: { model: string };
}

export interface DailyUsagePoint {
  date: string;
  label: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ModelUsagePoint {
  model: string;
  label: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  lastUsedAt: string;
}

export interface UsageAnalyticsSummary {
  days: UsageRangeDays;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  daily: DailyUsagePoint[];
  models: ModelUsagePoint[];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortLabel(d: Date, days: UsageRangeDays): string {
  if (days === 1) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function resolveRunTokenSplit(run: {
  tokenUsage: number;
  inputTokens: number;
  outputTokens: number;
}): { input: number; output: number } {
  if (run.inputTokens > 0 || run.outputTokens > 0) {
    return { input: run.inputTokens, output: run.outputTokens };
  }
  if (run.tokenUsage > 0) {
    const input = Math.round(run.tokenUsage * 0.65);
    return { input, output: run.tokenUsage - input };
  }
  return { input: 0, output: 0 };
}

export function resolveRunCostUsd(
  run: {
    tokenUsage: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  },
  model: string
): number {
  if (run.estimatedCostUsd > 0) return run.estimatedCostUsd;
  const { input, output } = resolveRunTokenSplit(run);
  return estimateTokenCostUsd(input, output, model);
}

function buildModelUsage(runs: RunUsageRow[], since: Date): ModelUsagePoint[] {
  const map = new Map<string, ModelUsagePoint>();

  for (const run of runs) {
    if (run.startedAt < since) continue;

    const model = run.agent.model;
    const { input, output } = resolveRunTokenSplit(run);
    const cost = resolveRunCostUsd(run, model);

    let point = map.get(model);
    if (!point) {
      point = {
        model,
        label: getModelLabel(model),
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        lastUsedAt: run.startedAt.toISOString(),
      };
      map.set(model, point);
    }

    point.requests += 1;
    point.inputTokens += input;
    point.outputTokens += output;
    point.costUsd += cost;

    if (run.startedAt.getTime() > new Date(point.lastUsedAt).getTime()) {
      point.lastUsedAt = run.startedAt.toISOString();
    }
  }

  return Array.from(map.values())
    .map((point) => ({
      ...point,
      costUsd: Math.round(point.costUsd * 1_000_000) / 1_000_000,
    }))
    .sort((a, b) => {
      if (b.requests !== a.requests) return b.requests - a.requests;
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    })
    .slice(0, 20);
}

export function buildUsageAnalytics(
  runs: RunUsageRow[],
  days: UsageRangeDays
): UsageAnalyticsSummary {
  const now = new Date();
  const since = startOfDay(now);
  if (days > 1) {
    since.setDate(since.getDate() - (days - 1));
  }

  const bucketMap = new Map<string, DailyUsagePoint>();

  if (days === 1) {
    for (let h = 0; h < 24; h += 4) {
      const d = new Date(since);
      d.setHours(h, 0, 0, 0);
      const key = `h-${h}`;
      bucketMap.set(key, {
        date: key,
        label: shortLabel(d, days),
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      });
    }
  } else {
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = dateKey(d);
      bucketMap.set(key, {
        date: key,
        label: shortLabel(d, days),
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      });
    }
  }

  let totalRequests = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let estimatedCostUsd = 0;

  for (const run of runs) {
    if (run.startedAt < since) continue;

    const { input, output } = resolveRunTokenSplit(run);
    const cost = resolveRunCostUsd(run, run.agent.model);

    totalRequests += 1;
    totalInputTokens += input;
    totalOutputTokens += output;
    estimatedCostUsd += cost;

    let key: string;
    if (days === 1) {
      const h = run.startedAt.getHours();
      const bucket = Math.floor(h / 4) * 4;
      key = `h-${bucket}`;
    } else {
      key = dateKey(run.startedAt);
    }

    const point = bucketMap.get(key);
    if (point) {
      point.requests += 1;
      point.inputTokens += input;
      point.outputTokens += output;
      point.costUsd += cost;
    }
  }

  estimatedCostUsd = Math.round(estimatedCostUsd * 1_000_000) / 1_000_000;

  return {
    days,
    totalRequests,
    totalInputTokens,
    totalOutputTokens,
    estimatedCostUsd,
    daily: Array.from(bucketMap.values()),
    models: buildModelUsage(runs, since),
  };
}

export function parseUsageRangeDays(value: string | null): UsageRangeDays {
  const n = parseInt(value ?? "7", 10);
  if (n === 1 || n === 7 || n === 14 || n === 30) return n;
  return 7;
}

export function usageRangeSince(days: UsageRangeDays): Date {
  const since = startOfDay(new Date());
  if (days > 1) since.setDate(since.getDate() - (days - 1));
  return since;
}
