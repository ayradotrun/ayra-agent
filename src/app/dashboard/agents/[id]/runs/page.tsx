"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RunsList } from "@/components/agents/runs-list";

export default function AgentRunsPage() {
  const params = useParams();
  const id = params.id as string;
  const [runs, setRuns] = useState<Array<Parameters<typeof RunsList>[0]["runs"][0]>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}/runs?limit=50`)
      .then((r) => r.json())
      .then(setRuns)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/agents/${id}`} className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to agent
      </Link>
      <PageHeader
        eyebrow="Runs"
        title="Run history"
        description={`${runs.length} run${runs.length !== 1 ? "s" : ""} recorded for this agent.`}
      />
      <RunsList runs={runs} loading={loading} />
    </div>
  );
}
