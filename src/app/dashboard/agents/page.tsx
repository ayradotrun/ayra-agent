"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AgentCard } from "@/components/agents/agent-card";
import { EmptyState, ErrorState } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Array<Parameters<typeof AgentCard>[0]["agent"]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      const data = await apiFetch<typeof agents>("/api/agents");
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agents"
        title="Your agents"
        description={
          loading
            ? "Loading workspace..."
            : `${agents.length} agent${agents.length !== 1 ? "s" : ""} configured`
        }
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
            <Button size="sm" variant="outline" onClick={() => void loadAgents()}>
              Retry
            </Button>
          }
        />
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first agent to start automating your developer workflow."
          action={
            <Link href="/dashboard/agents/new">
              <Button>Create your first agent</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onUpdated={loadAgents} />
          ))}
        </div>
      )}
    </div>
  );
}
