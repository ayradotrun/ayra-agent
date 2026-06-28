"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Bell, Zap, Plus, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, ErrorState } from "@/components/dashboard/stat-card";
import {
  UsageAnalytics,
  type UsageAnalyticsData,
} from "@/components/dashboard/usage-analytics";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { UsageRangeDays } from "@/lib/usage/analytics";

interface DashboardData {
  totalAgents: number;
  activeAgents: number;
  runsToday: number;
  unreadAlerts: number;
  analytics: UsageAnalyticsData;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<UsageRangeDays>(7);
  const isFirstLoad = useRef(true);

  const loadDashboard = useCallback(async (range: UsageRangeDays, initial = false) => {
    if (initial) setLoading(true);
    else setAnalyticsLoading(true);

    try {
      const result = await apiFetch<DashboardData>(`/api/dashboard?days=${range}`);
      setData(result);
      setError(null);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(days, isFirstLoad.current);
    isFirstLoad.current = false;
  }, [days, loadDashboard]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Command center"
        description="Monitor agents, track usage, and manage your AYRA workflow."
        action={
          <Link href="/dashboard/agents/new">
            <Button className="h-9 rounded-lg px-4 text-[13px]">
              <Plus className="mr-2 h-4 w-4" />
              Create agent
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-foreground">Documentation</p>
            <p className="text-xs text-muted-foreground">
              Setup guides for private database, Jina web search, Telegram, deployment, and more.
            </p>
          </div>
        </div>
        <Link href="/docs">
          <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs">
            Open docs
          </Button>
        </Link>
      </div>

      {error && (
        <ErrorState
          description={error}
          action={
            <Button size="sm" variant="outline" onClick={() => void loadDashboard(days, true)}>
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
          <StatCard title="Active agents" value={data.activeAgents} icon={Zap} subtitle="Ready to run" />
          <StatCard title="Runs today" value={data.runsToday} icon={Zap} />
          <StatCard title="Alerts" value={data.unreadAlerts} icon={Bell} subtitle="Unread" />
        </div>
      ) : null}

      <UsageAnalytics
        data={data?.analytics ?? null}
        loading={loading || analyticsLoading}
        days={days}
        onDaysChange={setDays}
      />
    </div>
  );
}
