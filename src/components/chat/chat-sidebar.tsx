"use client";

import { cn } from "@/lib/utils";
import { ChatRecentsList } from "@/components/chat/chat-recents-list";

interface ChatRecentsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Mobile-only drawer — desktop recents live in workspace sidebar */
export function ChatRecentsDrawer({ open, onClose }: ChatRecentsDrawerProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[min(300px,88vw)] flex-col border-r border-white/[0.06] bg-[hsl(220,20%,5%)]/98 backdrop-blur-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col px-3 pb-4 pt-4">
          <ChatRecentsList onNavigate={onClose} className="min-h-0 flex-1" />
        </div>
      </aside>
    </>
  );
}
