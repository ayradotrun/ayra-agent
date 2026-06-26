"use client";

import { cn } from "@/lib/utils";
import { SidebarContent } from "@/components/layout/sidebar-content";

interface MobileWorkspaceDrawerProps {
  open: boolean;
  onClose: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
  };
}

/** Mobile slide-over — same workspace as desktop sidebar (nav, recents, docs, account). */
export function MobileWorkspaceDrawer({ open, onClose, user }: MobileWorkspaceDrawerProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-[60] flex h-full w-[min(300px,88vw)] flex-col border-r border-white/[0.06] bg-[hsl(220,20%,5%)]/98 backdrop-blur-2xl transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
        aria-label="Workspace menu"
      >
        <SidebarContent user={user} onNavigate={onClose} />
      </aside>
    </>
  );
}
