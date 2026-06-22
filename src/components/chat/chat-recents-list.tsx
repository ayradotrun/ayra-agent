"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  showNewChat?: boolean;
}

function SessionContextMenu({
  open,
  anchorRect,
  session,
  onClose,
  onPin,
  onRename,
  onDelete,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  session: ChatSessionSummary;
  onClose: () => void;
  onPin: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted || !anchorRect) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden />
      <div
        className="fixed z-[201] min-w-[168px] overflow-hidden rounded-xl border border-white/[0.12] bg-[hsl(220,20%,9%)] py-1 shadow-2xl"
        style={{
          top: anchorRect.top,
          left: anchorRect.right + 8,
        }}
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-white/[0.08]"
          onClick={onPin}
        >
          {session.pinned ? (
            <>
              <PinOff className="h-4 w-4 shrink-0 opacity-80" />
              Unpin chat
            </>
          ) : (
            <>
              <Pin className="h-4 w-4 shrink-0 opacity-80" />
              Pin chat
            </>
          )}
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-foreground hover:bg-white/[0.08]"
          onClick={onRename}
        >
          <Pencil className="h-4 w-4 shrink-0 opacity-80" />
          Rename
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-red-400 hover:bg-white/[0.08]"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 shrink-0 opacity-80" />
          Delete
        </button>
      </div>
    </>,
    document.body
  );
}

function SessionRow({
  session,
  active,
  onNavigate,
  onMutate,
  isActive,
}: {
  session: ChatSessionSummary;
  active: boolean;
  onNavigate?: () => void;
  onMutate: () => void;
  isActive: boolean;
}) {
  const router = useRouter();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = menuButtonRef.current?.getBoundingClientRect() ?? null;
    setMenuRect(rect);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setMenuRect(null);
  }

  async function patchSession(body: Record<string, unknown>) {
    const res = await fetch(`/api/chat/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(typeof err.error === "string" ? err.error : "Could not update chat");
      return false;
    }
    notifyChatSessionsChanged();
    await onMutate();
    return true;
  }

  async function handleRename() {
    closeMenu();
    const next = prompt("Rename chat", session.title || "New chat");
    if (!next?.trim()) return;
    await patchSession({ title: next.trim() });
  }

  async function handlePin() {
    closeMenu();
    await patchSession({ pinned: !session.pinned });
  }

  async function handleDelete() {
    closeMenu();
    if (!confirm("Delete this chat?")) return;
    const res = await fetch(`/api/chat/sessions/${session.id}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert("Could not delete chat");
      return;
    }
    notifyChatSessionsChanged();
    if (isActive) router.push("/dashboard/chat");
    await onMutate();
  }

  return (
    <div className="group relative">
      <Link
        href={chatSessionHref(session.id)}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-2 pr-8 text-left transition-colors",
          active
            ? "bg-white/[0.08] text-foreground"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
        )}
      >
        {session.pinned && <Pin className="h-3 w-3 shrink-0 opacity-50" />}
        <span className="min-w-0 flex-1 truncate text-[13px]">
          {session.title || "New chat"}
        </span>
      </Link>
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <button
          ref={menuButtonRef}
          type="button"
          className={cn(
            "rounded-md p-1 text-muted-foreground transition-opacity hover:bg-white/[0.06] hover:text-foreground",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={openMenu}
          aria-label="Chat options"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      <SessionContextMenu
        open={menuOpen}
        anchorRect={menuRect}
        session={session}
        onClose={closeMenu}
        onPin={handlePin}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  );
}

function ChatRecentsListInner({
  onNavigate,
  className,
  maxItems = 40,
  showNewChat = true,
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

  const pinned = sessions.filter((s) => s.pinned);
  const recents = sessions.filter((s) => !s.pinned);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {showNewChat && (
        <Link
          href="/dashboard/chat"
          onClick={onNavigate}
          className="mb-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-foreground transition-colors hover:bg-white/[0.04]"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Link>
      )}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-visible pr-0.5">
        {loading && (
          <p className="px-2 py-2 text-[11px] text-muted-foreground">Loading…</p>
        )}

        {!loading && sessions.length === 0 && (
          <p className="px-2 py-2 text-[11px] leading-relaxed text-muted-foreground">
            No chats yet.
          </p>
        )}

        {pinned.length > 0 && (
          <section>
            <p className="mb-1.5 px-2 text-[11px] font-medium text-muted-foreground/80">
              Pinned
            </p>
            <div className="space-y-0.5">
              {pinned.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={isChatRoute && activeSessionId === s.id}
                  onNavigate={onNavigate}
                  onMutate={loadSessions}
                  isActive={isChatRoute && activeSessionId === s.id}
                />
              ))}
            </div>
          </section>
        )}

        {recents.length > 0 && (
          <section>
            <p className="mb-1.5 px-2 text-[11px] font-medium text-muted-foreground/80">
              Recents
            </p>
            <div className="space-y-0.5">
              {recents.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={isChatRoute && activeSessionId === s.id}
                  onNavigate={onNavigate}
                  onMutate={loadSessions}
                  isActive={isChatRoute && activeSessionId === s.id}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function ChatRecentsList(props: ChatRecentsListProps) {
  return (
    <Suspense fallback={<p className="px-2 py-2 text-[11px] text-muted-foreground">Loading…</p>}>
      <ChatRecentsListInner {...props} />
    </Suspense>
  );
}
