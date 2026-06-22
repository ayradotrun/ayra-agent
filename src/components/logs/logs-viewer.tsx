"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

interface LogEntry {
  id: string;
  level: string;
  message: string;
  toolUsed?: string | null;
  runId?: string | null;
  createdAt: string;
}

interface LogsViewerProps {
  logs: LogEntry[];
  loading?: boolean;
}

const levelColors: Record<string, string> = {
  DEBUG: "text-muted-foreground",
  INFO: "text-emerald-400",
  WARN: "text-amber-400",
  ERROR: "text-red-400",
};

export function LogsViewer({ logs, loading }: LogsViewerProps) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const filtered = logs.filter((log) => {
    if (levelFilter && log.level !== levelFilter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const levels = ["DEBUG", "INFO", "WARN", "ERROR"];

  return (
    <div className="terminal-panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          live logs
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-white/[0.06] bg-black/20 pl-9 font-mono text-[12px]"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
          <Button
            variant={levelFilter === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setLevelFilter(null)}
          >
            All
          </Button>
          {levels.map((level) => (
            <Button
              key={level}
              variant={levelFilter === level ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-7 px-2 text-[11px]", levelColors[level])}
              onClick={() => setLevelFilter(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-h-[620px] overflow-y-auto font-mono text-[12px] leading-6">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No logs yet</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">Run your agent to see activity here</p>
          </div>
        ) : (
          filtered.map((log, index) => (
            <div
              key={log.id}
              className="grid grid-cols-[72px_72px_1fr_auto_auto] gap-3 border-b border-white/[0.04] px-4 py-2 hover:bg-white/[0.02]"
            >
              <span className="text-muted-foreground/50">{String(index + 1).padStart(3, "0")}</span>
              <span className="text-muted-foreground/70">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
              <span className={cn("break-all", levelColors[log.level])}>{log.message}</span>
              {log.toolUsed ? (
                <Badge variant="secondary" className="h-5 text-[10px]">{log.toolUsed}</Badge>
              ) : (
                <span />
              )}
              {log.runId ? (
                <span className="text-muted-foreground/45">{log.runId.slice(0, 8)}</span>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/[0.06] px-4 py-2 text-[10px] text-muted-foreground">
        {filtered.length} entries · updated {logs[0] ? formatRelativeTime(logs[0].createdAt) : "—"}
      </div>
    </div>
  );
}
