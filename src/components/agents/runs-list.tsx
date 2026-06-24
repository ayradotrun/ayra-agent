"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import { formatRunTrigger } from "@/lib/run-trigger";

interface Run {
  id: string;
  status: string;
  trigger?: string | null;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  tokenUsage: number;
  toolCalls: number;
  summary?: string | null;
  error?: string | null;
  agent?: { name: string; id: string };
}

interface RunsListProps {
  runs: Run[];
  loading?: boolean;
  showAgent?: boolean;
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  COMPLETED: "success",
  FAILED: "destructive",
  TIMEOUT: "warning",
  RUNNING: "secondary",
  PENDING: "secondary",
};

export function RunsList({ runs, loading, showAgent = true }: RunsListProps) {
  if (loading) {
    return <div className="text-muted-foreground">Loading runs...</div>;
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No runs yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Trigger a manual run or chat via Telegram to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <Card key={run.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant[run.status] || "secondary"}>{run.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {formatRunTrigger(run.trigger)}
                  </Badge>
                  {showAgent && run.agent && (
                    <Link
                      href={`/dashboard/agents/${run.agent.id}`}
                      className="text-xs text-emerald-400/90 hover:text-emerald-300"
                    >
                      {run.agent.name}
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(run.startedAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{run.summary || run.error || "No summary"}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {run.id.slice(0, 8)}
              </span>
            </div>
            <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
              <span>Duration: {formatDuration(run.durationMs)}</span>
              <span>Tokens: {run.tokenUsage}</span>
              <span>Tool calls: {run.toolCalls}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
