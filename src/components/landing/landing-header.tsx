"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { AyraSocialLinks } from "@/components/brand/ayra-social-links";
import { cn } from "@/lib/utils";
import { useChromeHeight } from "@/hooks/use-chrome-height";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#skills", label: "Skills" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/resources", label: "Resources" },
  { href: "/security", label: "Security" },
];

export function LandingHeader() {
  const shellRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const isAuthenticated = status === "authenticated" && !!session?.user;

  useChromeHeight(shellRef, "--site-header-height", [status, isAuthenticated, scrolled]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        ref={shellRef}
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 sm:px-4"
        style={{ paddingTop: "max(var(--site-header-gap), env(safe-area-inset-top, 0px))" }}
      >
        <header
          className={cn(
            "pointer-events-auto flex w-full max-w-5xl items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-all duration-300 sm:gap-3 sm:px-4 sm:py-3",
            "bg-[hsl(220,18%,7%)]/75 backdrop-blur-xl backdrop-saturate-150",
            scrolled
              ? "border-white/[0.1] bg-[hsl(220,18%,7%)]/85 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(52,211,153,0.06)]"
              : "border-white/[0.06] shadow-[0_4px_24px_-12px_rgba(0,0,0,0.4)]"
          )}
        >
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          >
            <AyraLogo size={32} priority className="shrink-0 ring-1 ring-primary/25" />
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-foreground sm:text-xs">
              AYRA <span className="font-semibold text-emerald-400/90">AGENT</span>
            </span>
          </Link>

          <nav className="hidden flex-1 justify-center lg:flex">
            <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] p-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
            <AyraSocialLinks className="flex md:hidden" iconClassName="h-4 w-4" />
            <AyraSocialLinks className="hidden md:flex" iconClassName="h-3.5 w-3.5" />

            {status === "loading" ? (
              <div className="hidden h-8 w-16 animate-pulse rounded-lg bg-white/[0.06] md:block" aria-hidden />
            ) : (
              <div className="hidden items-center gap-1.5 md:flex">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard">
                      <Button size="sm" className="h-8 gap-1.5 px-3 text-[13px] glow-emerald">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-[13px]"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      <LogOut className="mr-1 h-3.5 w-3.5" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-[13px]">
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm" className="h-8 px-3.5 text-[13px] glow-emerald">
                        Start building
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </header>
      </div>

      <div className="site-header-spacer shrink-0" aria-hidden="true" />
    </>
  );
}

export {
  SITE_SECTION_ANCHOR as LANDING_SECTION_SCROLL,
  DOCS_CONTENT_SCROLL_MT,
  SITE_CONTAINER as LANDING_CONTAINER_CLASS,
} from "@/lib/layout/site-layout";
