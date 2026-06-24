"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Bot,
  Zap,
  MessageCircle,
  AlertTriangle,
  Activity,
  Search,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, ErrorState } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/utils";
import { formatRunTrigger } from "@/lib/run-trigger";

interface AdminStats {
  totalUsers: number;
  activeUsers7d: number;
  newUsers30d: number;
  totalAgents: number;
  activeAgents: number;
  runsToday: number;
  runs7d: number;
  failedRunsToday: number;
  telegramConnectedUsers: number;
  runsByTrigger: Array<{ trigger: string; count: number }>;
}

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  createdAt: string;
  agentsCount: number;
  sessionsCount: number;
  telegramConnected: boolean;
  defaultModel: string;
  lastRunAt: string | null;
  lastRunTrigger: string | null;
  lastRunStatus: string | null;
}

interface AdminUsersResponse {
  users: AdminUser[];
  query?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersData, setUsersData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUsersLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    apiFetch<AdminUsersResponse>(`/api/admin/users?${params.toString()}`)
      .then((usersRes) => {
        setUsersData(usersRes);
        setError(null);
      })
      .catch((err: ApiError) => setError(err.message))
      .finally(() => setUsersLoading(false));
  }, [page, searchQuery]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Admin dashboard"
        description="Platform-wide metrics, user activity, and Telegram adoption."
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
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[108px] rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total users" value={stats.totalUsers} icon={Users} />
            <StatCard
              title="Active users"
              value={stats.activeUsers7d}
              icon={UserCheck}
              subtitle="Login or run in last 7 days"
            />
            <StatCard
              title="New users"
              value={stats.newUsers30d}
              icon={Activity}
              subtitle="Last 30 days"
            />
            <StatCard
              title="Telegram linked"
              value={stats.telegramConnectedUsers}
              icon={MessageCircle}
              subtitle="Chat ID connected"
            />
            <StatCard title="Total agents" value={stats.totalAgents} icon={Bot} />
            <StatCard
              title="Active agents"
              value={stats.activeAgents}
              icon={Bot}
              subtitle="Status ACTIVE"
            />
            <StatCard title="Runs today" value={stats.runsToday} icon={Zap} subtitle="All users" />
            <StatCard
              title="Failed runs today"
              value={stats.failedRunsToday}
              icon={AlertTriangle}
              subtitle={`${stats.runs7d} runs in 7 days`}
            />
          </div>

          {stats.runsByTrigger.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Runs by source (7 days)
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.runsByTrigger.map((row) => (
                  <Badge key={row.trigger} variant="secondary" className="px-3 py-1">
                    {formatRunTrigger(row.trigger)}: {row.count}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Users
          </h2>
          {usersData && (
            <span className="text-[12px] text-muted-foreground">
              Page {usersData.pagination.page} of {usersData.pagination.totalPages || 1} ·{" "}
              {usersData.pagination.total} {searchQuery ? "match" : "total"}
              {searchQuery ? ` for "${searchQuery}"` : ""}
            </span>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email, username, or name…"
              className="h-9 pl-9"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 px-4" disabled={usersLoading}>
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 px-3"
              onClick={clearSearch}
              disabled={usersLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>

        {usersLoading && !usersData ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : usersData?.users.length ? (
          <div className="space-y-3">
            {usersData.users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{user.email}</p>
                      {user.username && (
                        <Badge variant="secondary" className="text-[10px]">
                          @{user.username}
                        </Badge>
                      )}
                      {user.telegramConnected && (
                        <Badge variant="outline" className="text-[10px]">
                          Telegram
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.name || "No name"} · Joined {formatRelativeTime(user.createdAt)} ·{" "}
                      {user.agentsCount} agent{user.agentsCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      Model: {user.defaultModel}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    {user.lastRunAt ? (
                      <>
                        <p>Last run {formatRelativeTime(user.lastRunAt)}</p>
                        <p>
                          {formatRunTrigger(user.lastRunTrigger)} · {user.lastRunStatus}
                        </p>
                      </>
                    ) : (
                      <p>No runs yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={usersLoading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  usersLoading ||
                  !usersData ||
                  usersData.pagination.totalPages === 0 ||
                  page >= usersData.pagination.totalPages
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {searchQuery ? `No users found for "${searchQuery}".` : "No users found."}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-medium">Admin features</h2>
        <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
          <li>• Platform stats — total users, active users (7d), new signups (30d)</li>
          <li>• Agent metrics — total agents and active agents across all accounts</li>
          <li>• Run analytics — runs today, failures, breakdown by source (Telegram, Chat, Manual)</li>
          <li>• Telegram adoption — how many users linked their chat ID</li>
          <li>• User directory — search by email, username, or name; paginated results</li>
        </ul>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Access is controlled by{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5">ADMIN_EMAILS</code> in{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5">.env</code>. Add your email and
          restart the app.
        </p>
        <Link href="/dashboard" className="mt-3 inline-block text-[12px] text-emerald-400/90 hover:text-emerald-300">
          ← Back to overview
        </Link>
      </section>
    </div>
  );
}
