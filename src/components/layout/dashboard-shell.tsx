"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader, MobileNav } from "@/components/layout/mobile-nav";
import { MobileSidebarDrawer } from "@/components/layout/mobile-sidebar-drawer";
import { GridBackground } from "@/components/layout/grid-background";

interface DashboardShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");

  return (
    <>
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>
      <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
      <MobileSidebarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
      />
      <MobileNav />
      <main
        className={
          isChatPage
            ? "min-h-screen pt-14 pb-0 md:ml-[260px] md:pt-0 md:pb-0"
            : "min-h-screen pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:ml-[260px] md:pt-0 md:pb-0"
        }
      >
        <div
          className={
            isChatPage
              ? "mx-auto max-w-[1280px]"
              : "mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8"
          }
        >
          {children}
        </div>
      </main>
    </>
  );
}

export function DashboardShellWithBackground({ children, user }: DashboardShellProps) {
  return (
    <GridBackground>
      <DashboardShell user={user}>{children}</DashboardShell>
    </GridBackground>
  );
}
