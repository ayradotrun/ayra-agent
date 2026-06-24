import { DashboardShellWithBackground } from "@/components/layout/dashboard-shell";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
  };
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return <DashboardShellWithBackground user={user}>{children}</DashboardShellWithBackground>;
}
