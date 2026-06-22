"use client";

import Link from "next/link";
import { Bot, Clock, Pause, Play, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { scheduleLabel } from "@/lib/agent/scheduler";
import type { ScheduleInterval } from "@prisma/client";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    model: string;
    schedule: string;
    skills?: Array<{ skill: { name: string; slug: string } }>;
    runs?: Array<{ startedAt: string; status: string }>;
  };
  onRun?: (id: string) => void;
  onToggle?: (id: string, status: string) => void;
}

export function AgentCard({ agent, onRun, onToggle }: AgentCardProps) {
  const lastRun = agent.runs?.[0];
  const statusVariant =
    agent.status === "ACTIVE" ? "success" : agent.status === "PAUSED" ? "warning" : "destructive";

  return (
    <Card className="group surface-card transition-all duration-200 hover:border-emerald-500/15 hover:bg-white/[0.015]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-white/[0.06] bg-white/[0.03]">
              <Bot className="h-[18px] w-[18px] text-emerald-400" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/agents/${agent.id}`}
                className="block truncate text-[14px] font-medium tracking-[-0.01em] hover:text-emerald-300"
              >
                {agent.name}
              </Link>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                {truncate(agent.description || "No description", 72)}
              </p>
            </div>
          </div>
          <Badge variant={statusVariant} className="shrink-0 capitalize">
            {agent.status.toLowerCase()}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {agent.skills?.slice(0, 3).map((s) => (
            <Badge key={s.skill.slug} variant="outline" className="border-white/[0.08] bg-white/[0.02] text-[10px]">
              {s.skill.name}
            </Badge>
          ))}
          {(agent.skills?.length ?? 0) > 3 && (
            <Badge variant="outline" className="text-[10px]">+{(agent.skills?.length ?? 0) - 3}</Badge>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-3">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Model</span>
            <span className="mt-1 block text-[12px] text-foreground/85">{agent.model.split("/").pop()}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Schedule</span>
            <span className="mt-1 block text-[12px] text-foreground/85">
              {scheduleLabel(agent.schedule as ScheduleInterval)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-4">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {lastRun ? formatRelativeTime(lastRun.startedAt) : "Never run"}
          </div>
          <div className="flex items-center gap-1">
            {onToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => onToggle(agent.id, agent.status)}
              >
                {agent.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
            )}
            {onRun && agent.status === "ACTIVE" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onRun(agent.id)}>
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            <Link href={`/dashboard/agents/${agent.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
