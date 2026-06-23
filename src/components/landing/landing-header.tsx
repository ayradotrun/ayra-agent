"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { AyraSocialLinks } from "@/components/brand/ayra-social-links";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#trust", label: "Trust" },
  { href: "/#skills", label: "Skills" },
  { href: "/security", label: "Security" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
        <header
          className={cn(
            "pointer-events-auto flex w-full max-w-5xl items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-300 sm:px-4 sm:py-3",
            "bg-[hsl(220,18%,7%)]/80 backdrop-blur-xl",
            scrolled
              ? "border-white/[0.1] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(52,211,153,0.06)]"
              : "border-white/[0.06] shadow-[0_4px_24px_-12px_rgba(0,0,0,0.4)]"
          )}
        >
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
            onClick={closeMenu}
          >
            <AyraLogo size={32} priority className="ring-1 ring-primary/25" />
            <span className="hidden font-semibold tracking-tight sm:inline">AYRA</span>
          </Link>

          <nav className="hidden flex-1 justify-center md:flex">
            <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.03] p-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <AyraSocialLinks className="hidden lg:flex" iconClassName="h-3.5 w-3.5" />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="h-8 px-3 text-[13px]">
                Sign in
              </Button>
            </Link>
            <Link href="/register" className="hidden sm:block">
              <Button size="sm" className="h-8 px-3.5 text-[13px] glow-emerald">
                Start building
              </Button>
            </Link>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-foreground transition-colors hover:bg-white/[0.08] md:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </header>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={closeMenu}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed left-3 right-3 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-white/[0.08] bg-[hsl(220,18%,7%)]/95 shadow-2xl backdrop-blur-xl md:hidden"
            >
              <nav className="flex flex-col p-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className="rounded-xl px-4 py-3.5 text-[15px] font-medium text-foreground/90 transition-colors active:bg-white/[0.06]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="border-t border-white/[0.06] p-4">
                <AyraSocialLinks showLabels className="mb-4 justify-center" />
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={closeMenu}>
                    <Button variant="outline" className="h-11 w-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register" onClick={closeMenu}>
                    <Button className="h-11 w-full glow-emerald">
                      Start building
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export const LANDING_HEADER_OFFSET = "pt-[7.5rem] sm:pt-[8.5rem]";
export const LANDING_SECTION_SCROLL = "scroll-mt-32 sm:scroll-mt-36";
