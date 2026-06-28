"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function DeleteChatDialog({
  session,
  open,
  deleting,
  onClose,
  onConfirm,
}: {
  session: ChatSessionSummary;
  open: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onClose]);

  if (!open || !mounted) return null;

  const title = session.title || "New chat";

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={deleting ? undefined : onClose}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-labelledby="delete-chat-title"
        aria-describedby="delete-chat-desc"
        className={cn(
          "relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/[0.1]",
          "bg-[hsl(220,18%,8%)] shadow-2xl shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-red-500/[0.08] to-transparent" />
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50"
          onClick={onClose}
          disabled={deleting}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h3 id="delete-chat-title" className="text-lg font-semibold tracking-tight text-foreground">
            Delete this chat?
          </h3>
          <p id="delete-chat-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground/90">&ldquo;{title}&rdquo;</span> and all
            messages in it will be permanently removed. This cannot be undone.
          </p>
          <div className="mt-6 flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 flex-1 gap-2"
              onClick={onConfirm}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete chat"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
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
  const renameInputRef = useRef<HTMLInputElement>(null);
  const skipRenameBlurRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  function startRename() {
    closeMenu();
    setRenameDraft(session.title || "New chat");
    setIsRenaming(true);
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }

  async function commitRename() {
    if (skipRenameBlurRef.current) {
      skipRenameBlurRef.current = false;
      return;
    }
    const next = renameDraft.trim();
    setIsRenaming(false);
    if (!next || next === (session.title || "New chat")) return;
    await patchSession({ title: next });
  }

  function cancelRename() {
    skipRenameBlurRef.current = true;
    setIsRenaming(false);
    setRenameDraft(session.title || "New chat");
  }

  async function handlePin() {
    closeMenu();
    await patchSession({ pinned: !session.pinned });
  }

  function handleDeleteRequest() {
    closeMenu();
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/chat/sessions/${session.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      window.alert("Could not delete chat");
      return;
    }
    notifyChatSessionsChanged();
    setDeleteOpen(false);
    setDeleting(false);
    if (isActive) router.push("/dashboard/chat");
    await onMutate();
  }

  return (
    <div className="group relative">
      {isRenaming ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 pr-8",
            active ? "bg-white/[0.08]" : "bg-white/[0.04]"
          )}
        >
          {session.pinned && <Pin className="h-3 w-3 shrink-0 opacity-50" />}
          <input
            ref={renameInputRef}
            type="text"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelRename();
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-emerald-500/30 bg-background/80 px-2 py-1 text-[13px] text-foreground outline-none ring-emerald-500/20 focus:ring-2"
            aria-label="Chat name"
          />
        </div>
      ) : (
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
      )}
      {!isRenaming && (
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
      )}
      <SessionContextMenu
        open={menuOpen}
        anchorRect={menuRect}
        session={session}
        onClose={closeMenu}
        onPin={handlePin}
        onRename={startRename}
        onDelete={handleDeleteRequest}
      />
      <DeleteChatDialog
        session={session}
        open={deleteOpen}
        deleting={deleting}
        onClose={() => !deleting && setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
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

      <div className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-visible pr-0.5">
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
