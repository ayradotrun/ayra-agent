"use client";

import { SidebarContent } from "@/components/layout/sidebar-content";

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-white/[0.06] bg-[hsl(220,20%,5%)]/95 backdrop-blur-2xl">
      <SidebarContent user={user} showRecents />
    </aside>
  );
}
