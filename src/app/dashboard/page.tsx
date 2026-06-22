"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Play, Bell, Zap, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, EmptyState, ErrorState } from "@/components/dashboard/stat-card";
import { SkillCard } from "@/components/skills/skill-card";
import { RunsList } from "@/components/agents/runs-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";

interface DashboardData {
  totalAgents: number;
  activeAgents: number;
  runsToday: number;
  unreadAlerts: number;
  recentRuns: Array<{
    id: string;
    status: string;
    startedAt: string;
    durationMs?: number | null;
    tokenUsage: number;
    toolCalls: number;
    summary?: string | null;
    agent: { name: string; id: string };
  }>;
  featuredSkills: Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    icon: string;
    isEnabled: boolean;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(setData)
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Command center"
        description="Monitor agents, review recent runs, and attach skills to your workflow."
        action={
          <Link href="/dashboard/agents/new">
            <Button className="h-9 rounded-lg px-4 text-[13px]">
              <Plus className="mr-2 h-4 w-4" />
              Create agent
            </Button>
          </Link>
        }
      />

      {error && (
        <ErrorState
          description={error}
          action={
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[108px] rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total agents" value={data.totalAgents} icon={Bot} />
          <StatCard title="Active agents" value={data.activeAgents} icon={Play} subtitle="Ready to run" />
          <StatCard title="Runs today" value={data.runsToday} icon={Zap} />
          <StatCard title="Alerts" value={data.unreadAlerts} icon={Bell} subtitle="Unread" />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Recent runs
            </h2>
            <Link href="/dashboard/agents" className="text-[12px] text-emerald-400/90 hover:text-emerald-300">
              View agents
            </Link>
          </div>
          {loading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : data?.recentRuns.length ? (
            <RunsList runs={data.recentRuns} />
          ) : (
            <EmptyState
              icon={Play}
              title="No runs yet"
              description="Create an agent and trigger your first run to see activity here."
              action={
                <Link href="/dashboard/agents/new">
                  <Button size="sm">Create agent</Button>
                </Link>
              }
            />
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Featured skills
            </h2>
            <Link href="/dashboard/skills" className="text-[12px] text-emerald-400/90 hover:text-emerald-300">
              Browse all
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : data?.featuredSkills.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.featuredSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} compact />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bot}
              title="Skills not loaded"
              description="Run npm run prisma:seed to populate the skill marketplace."
            />
          )}
        </section>
      </div>
    </div>
  );
}
