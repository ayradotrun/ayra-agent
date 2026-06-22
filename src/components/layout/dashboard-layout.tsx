import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader, MobileNav } from "@/components/layout/mobile-nav";
import { GridBackground } from "@/components/layout/grid-background";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <GridBackground>
      <div className="hidden md:block">
        <Sidebar user={user} />
      </div>
      <MobileHeader />
      <MobileNav />
      <main className="min-h-screen pt-14 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:ml-[260px] md:pt-0 md:pb-0">
        <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </GridBackground>
  );
}
