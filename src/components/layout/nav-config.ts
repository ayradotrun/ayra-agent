import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Puzzle,
  Settings,
  Shield,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/skills", label: "Skills", icon: Puzzle },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const ADMIN_NAV_ITEM = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: Shield,
  exact: true as const,
};

export const MOBILE_NAV_ITEMS = NAV_ITEMS;

export const NEW_AGENT_HREF = "/dashboard/agents/new";
