"use client";

import { useEffect, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isRunInProgress,
  resolveAgentDisplayStatus,
  type AgentDisplayStatus,
} from "@/lib/agent/display-status";

type LatestRun = { status: string; startedAt: string } | null | undefined;

type AgentRunControlProps = {
  agentId: string;
  status: string;
  latestRun?: LatestRun;
  onUpdated?: () => void | Promise<void>;
  onDisplayStatusChange?: (status: AgentDisplayStatus) => void;
  compact?: boolean;
  className?: string;
};

export function AgentRunControl({
  agentId,
  status,
  latestRun,
  onUpdated,
  onDisplayStatusChange,
  compact = false,
  className,
}: AgentRunControlProps) {
  const [localRunning, setLocalRunning] = useState(false);
  const displayStatus = resolveAgentDisplayStatus(status, latestRun, localRunning);

  useEffect(() => {
    onDisplayStatusChange?.(displayStatus);
  }, [displayStatus, onDisplayStatusChange]);

  useEffect(() => {
    if (!localRunning && !isRunInProgress(latestRun, false)) return;
    const timer = setInterval(() => void onUpdated?.(), 2000);
    return () => clearInterval(timer);
  }, [localRunning, latestRun, onUpdated]);

  async function pauseAgent() {
    await fetch(`/api/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAUSED" }),
    });
    setLocalRunning(false);
    await onUpdated?.();
  }

  async function startRun() {
    setLocalRunning(true);
    try {
      await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
    } finally {
      setLocalRunning(false);
    }
    await onUpdated?.();
  }

  async function handleClick() {
    if (displayStatus === "running" || displayStatus === "active") {
      await pauseAgent();
      return;
    }

    if (displayStatus === "paused") {
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      await startRun();
      return;
    }

    await startRun();
  }

  const label =
    displayStatus === "running"
      ? "Running…"
      : displayStatus === "active"
        ? "Pause"
        : displayStatus === "paused"
          ? "Run"
          : "Run";
  const Icon =
    displayStatus === "running" ? Pause : displayStatus === "active" ? Pause : Play;

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-lg", className)}
        onClick={() => void handleClick()}
        title={label}
        aria-label={label}
      >
        {displayStatus === "running" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Button
      className={cn("h-9", className)}
      variant={
        displayStatus === "paused" || displayStatus === "idle" ? "default" : "outline"
      }
      onClick={() => void handleClick()}
    >
      {displayStatus === "running" ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

export {
  agentDisplayStatusLabel,
  agentDisplayStatusVariant,
  resolveAgentDisplayStatus,
} from "@/lib/agent/display-status";
