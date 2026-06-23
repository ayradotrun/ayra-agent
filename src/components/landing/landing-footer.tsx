import Link from "next/link";
import { AyraSocialLinks } from "@/components/brand/ayra-social-links";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { AYRA_SUPPORT_CS_URL, AYRA_SUPPORT_EMAIL } from "@/components/brand/ayra-support";

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/security", label: "Security" },
];

const resourceLinks = [
  { href: "https://github.com/ayradotrun/ayra-agent", label: "GitHub", external: true },
  { href: "https://github.com/ayradotrun/ayra-agent#quick-start", label: "Documentation", external: true },
  {
    href: "https://github.com/ayradotrun/ayra-agent/blob/main/docs/private-database.md",
    label: "Private DB guide",
    external: true,
  },
];

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border/40 bg-secondary/10">
      <div className="mx-auto max-w-5xl px-3 py-12 sm:px-4 sm:py-14">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <AyraLogo size={32} className="ring-1 ring-primary/20" />
              <span className="font-semibold">AYRA Agent</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Autonomous AI agents for Solana developers and token builders. Self-hostable,
              privacy-first, open source.
            </p>
            <AyraSocialLinks className="mt-5" showLabels />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Legal</p>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Resources</p>
            <ul className="mt-4 space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/register"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Create account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Support</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={AYRA_SUPPORT_CS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  CS Support
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${AYRA_SUPPORT_EMAIL}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {AYRA_SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border/40 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} AYRA Agent. All rights reserved.</span>
          <span>Built for developers · Solana ecosystem tools only</span>
        </div>
      </div>
    </footer>
  );
}
