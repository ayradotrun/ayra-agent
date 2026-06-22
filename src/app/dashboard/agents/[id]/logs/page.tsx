"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LogsViewer } from "@/components/logs/logs-viewer";

export default function AgentLogsPage() {
  const params = useParams();
  const id = params.id as string;
  const [logs, setLogs] = useState<Array<Parameters<typeof LogsViewer>[0]["logs"][0]>>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}/logs?limit=200`);
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000);
    return () => clearInterval(interval);
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/agents/${id}`} className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to agent
      </Link>
      <PageHeader
        eyebrow="Logs"
        title="Log explorer"
        description="Terminal-style activity stream with level filters and search."
      />
      <LogsViewer logs={logs} loading={loading} />
    </div>
  );
}
