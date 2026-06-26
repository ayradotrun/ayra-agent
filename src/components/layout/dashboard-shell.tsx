"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import {
  MobileHeader,
  MobileNav,
} from "@/components/layout/mobile-nav";
import { GridBackground } from "@/components/layout/grid-background";
import { PrivateDatabaseGate } from "@/components/layout/private-database-gate";
import { MobileBottomSpacer } from "@/components/layout/mobile-bottom-spacer";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const isChatPage = pathname === "/dashboard/chat" || pathname.startsWith("/dashboard/chat/");

  return (
    <>
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>
      {!isChatPage && <MobileHeader />}
      <MobileNav />
      <main
        className={cn(
          isChatPage
            ? "fixed inset-x-0 top-0 bottom-[var(--bottom-nav-height,5.5rem)] overflow-hidden md:inset-y-0 md:bottom-0 md:left-[260px] md:right-0"
            : cn("min-h-screen md:ml-[260px]")
        )}
      >
        <div
          className={
            isChatPage
              ? "flex h-full min-h-0 w-full flex-col"
              : "mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8"
          }
        >
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground md:min-h-0 md:h-full">
                Loading…
              </div>
            }
          >
            <div className={cn(isChatPage && "flex h-full min-h-0 flex-col")}>
              <PrivateDatabaseGate>{children}</PrivateDatabaseGate>
            </div>
          </Suspense>
          {!isChatPage && <MobileBottomSpacer />}
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
