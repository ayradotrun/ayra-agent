"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { TRUST_LINKS, type TrustLink } from "@/components/landing/landing-trust-data";

function TrustCard({ item, index }: { item: TrustLink; index: number }) {
  const Icon = item.icon;
  const className =
    "group flex min-w-[200px] shrink-0 flex-col rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.06] hover:shadow-[0_0_24px_-8px_rgba(52,211,153,0.3)] sm:min-w-0";

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {item.external && (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{item.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      {item.external ? (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
          {inner}
        </a>
      ) : (
        <Link href={item.href} className={className}>
          {inner}
        </Link>
      )}
    </motion.div>
  );
}

export function LandingTrustStrip() {
  return (
    <section id="trust" className="relative z-10 scroll-mt-32 border-y border-border/40 bg-secondary/10 py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Trust & transparency</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            Verify how AYRA protects you
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:mx-0">
            Open policies, open source, and a privacy-first architecture you can read and audit.
          </p>
        </div>

        <div className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
          {TRUST_LINKS.map((item, i) => (
            <TrustCard key={item.href} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingTrustPills() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
        {TRUST_LINKS.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const pillClass =
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-foreground sm:text-xs";

          return item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={pillClass}
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={pillClass}>
              <Icon className="h-3.5 w-3.5 text-primary" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
