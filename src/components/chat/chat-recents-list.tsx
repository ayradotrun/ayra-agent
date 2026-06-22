"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CHAT_SESSIONS_CHANGED,
  chatSessionHref,
  notifyChatSessionsChanged,
  type ChatSessionSummary,
} from "@/lib/chat/recents";

interface ChatRecentsListProps {
  onNavigate?: () => void;
  className?: string;
  maxItems?: number;
}

export function ChatRecentsList({
  onNavigate,
  className,
  maxItems = 20,
}: ChatRecentsListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSessionId = searchParams.get("session");
  const isChatRoute = pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (res.ok) {
      const list = (await res.json()) as ChatSessionSummary[];
      setSessions(list.slice(0, maxItems));
    }
    setLoading(false);
  }, [maxItems]);

  useEffect(() => {
    loadSessions();
    const handler = () => loadSessions();
    window.addEventListener(CHAT_SESSIONS_CHANGED, handler);
    return () => window.removeEventListener(CHAT_SESSIONS_CHANGED, handler);
  }, [loadSessions]);

  async function deleteSession(e: React.MouseEvent, sessionId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    notifyChatSessionsChanged();
    if (activeSessionId === sessionId && isChatRoute) {
      window.location.href = "/dashboard/chat";
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          Recents
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/dashboard/chat" onClick={onNavigate} title="New chat">
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
        {loading && (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">Loading…</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="px-2 py-2 text-[11px] leading-relaxed text-muted-foreground">
            No chats yet. Start one from Chat.
          </p>
        )}
        {sessions.map((s) => {
          const active = isChatRoute && activeSessionId === s.id;
          return (
            <Link
              key={s.id}
              href={chatSessionHref(s.id)}
              onClick={onNavigate}
              className={cn(
                "group flex items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                active
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-foreground/90">
                  {s.title || "New chat"}
                </p>
                <p className="truncate text-[10px] opacity-60">{s.agent.name}</p>
              </div>
              <button
                type="button"
                className="shrink-0 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={(e) => deleteSession(e, s.id)}
                aria-label="Delete chat"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
