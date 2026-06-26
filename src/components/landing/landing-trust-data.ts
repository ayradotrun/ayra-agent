import {
  Shield,
  Lock,
  FileText,
  Cookie,
  Code2,
  Database,
  type LucideIcon,
} from "lucide-react";

export type TrustLink = {
  icon: LucideIcon;
  label: string;
  desc: string;
  href: string;
  external: boolean;
};

export const TRUST_LINKS: TrustLink[] = [
  {
    icon: Shield,
    label: "Security",
    desc: "Encryption & tenant isolation",
    href: "/security",
    external: false,
  },
  {
    icon: Lock,
    label: "Privacy Policy",
    desc: "How your data is handled",
    href: "/privacy",
    external: false,
  },
  {
    icon: FileText,
    label: "Terms of Service",
    desc: "Usage & responsibilities",
    href: "/terms",
    external: false,
  },
  {
    icon: Cookie,
    label: "Cookie Policy",
    desc: "Session cookies only",
    href: "/cookies",
    external: false,
  },
  {
    icon: Code2,
    label: "Open source",
    desc: "MIT · audit the code",
    href: "https://github.com/ayradotrun/ayra-agent",
    external: true,
  },
  {
    icon: Database,
    label: "Private DB guide",
    desc: "BYOD Postgres setup",
    href: "/docs/private-database",
    external: false,
  },
];
