"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Bot,
  Coins,
  Send,
  Activity,
  ArrowRight,
  Wallet,
  TrendingUp,
  PenLine,
  Shield,
  Database,
  Lock,
  Sparkles,
  Clock,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Zap,
  Code2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PublicBottomNav } from "@/components/layout/public-bottom-nav";
import {
  SITE_SECTION_ANCHOR,
  SITE_BOTTOM_OFFSET,
} from "@/lib/layout/site-layout";
import { LandingHeroBg } from "@/components/landing/landing-hero-bg";
import { LandingAgentTerminal } from "@/components/landing/landing-agent-terminal";
import { LandingArchitectureDiagram } from "@/components/landing/landing-architecture-diagram";
import { ScrollReveal, ScrollStagger, ScrollStaggerItem, ScrollStaggerList, ScrollStaggerListItem } from "@/components/landing/landing-scroll-reveal";

const iconMap: Record<string, React.ElementType> = {
  wallet: Wallet,
  coins: Coins,
  send: Send,
  activity: Activity,
  "pen-line": PenLine,
  "trending-up": TrendingUp,
  brain: Bot,
  shield: Shield,
  database: Database,
  lock: Lock,
  zap: Zap,
};


const stats = [
  { value: "14+", label: "Built-in skills" },
  { value: "6", label: "Agent personas" },
  { value: "BYOD", label: "Private database" },
  { value: "24/7", label: "Scheduled runs" },
];

const features = [
  {
    icon: "brain",
    title: "Autonomous agents",
    desc: "Pick a persona, attach skills, and let agents run tasks on schedule or on demand via chat and Telegram.",
  },
  {
    icon: "wallet",
    title: "Solana dev toolkit",
    desc: "Wallet tracking, token research, RPC monitoring, and meme quality scans — built for builders, not traders.",
  },
  {
    icon: "send",
    title: "X workflows",
    desc: "Draft threads, find viral topics, and optionally auto-post with double opt-in safety gates.",
  },
  {
    icon: "database",
    title: "Your data, your database",
    desc: "Chat history and brain tasks live in your Postgres. Required on signup — no shared tenant datastore.",
  },
  {
    icon: "lock",
    title: "Encrypted credentials",
    desc: "API keys, bot tokens, and database URLs are encrypted at rest with AES-256-GCM.",
  },
  {
    icon: "zap",
    title: "Telegram + dashboard chat",
    desc: "Full web chat with sessions, slash commands, and a Telegram bot that runs your default agent.",
  },
];

const previewSkills = [
  { name: "Wallet Tracker", category: "Solana", icon: "wallet", enabled: true },
  { name: "Token Research", category: "Solana", icon: "coins", enabled: true },
  { name: "X Post & Draft", category: "Social", icon: "send", enabled: true },
  { name: "Viral Topic Finder", category: "Social", icon: "trending-up", enabled: true },
  { name: "Solana RPC Monitor", category: "Crypto", icon: "activity", enabled: true },
  { name: "X Thread Drafter", category: "Social", icon: "pen-line", enabled: true },
];

const personas = [
  { name: "Aria", role: "Research Analyst", focus: "On-chain research & token briefings" },
  { name: "Sienna", role: "Social Lead", focus: "X drafts, threads & content calendars" },
  { name: "Marcus", role: "Ops Engineer", focus: "RPC monitoring & wallet watchlists" },
  { name: "Nova", role: "Growth Strategist", focus: "Trending topics & launch planning" },
];

const faqs = [
  {
    q: "Is AYRA a trading bot?",
    a: "No. AYRA is a developer agent platform for Solana workflows, research, and social ops. It does not execute trades or provide financial advice.",
  },
  {
    q: "Why do I need my own Postgres database?",
    a: "Privacy by design. Your chat sessions and brain tasks stay in infrastructure you control — not a shared multi-tenant store.",
  },
  {
    q: "Can I self-host?",
    a: "Yes. AYRA Agent is MIT-licensed open source. Clone the repo, configure .env, and run your own instance.",
  },
  {
    q: "How does X auto-post work?",
    a: "Auto-post is off by default. You must enable it in Settings and on each agent. Drafts are always reviewable before posting.",
  },
];

export function LandingPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-background ${SITE_BOTTOM_OFFSET}`}>
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <LandingHeroBg />

      <LandingHeader />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-2 sm:px-6 sm:pb-16 sm:pt-4">
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-center sm:text-left"
          >
            <p className="text-sm text-muted-foreground">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.{" "}
              <Link href="/dashboard" className="font-medium text-emerald-400 hover:underline">
                Open dashboard →
              </Link>
            </p>
          </motion.div>
        )}

        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            <div className="mb-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <Badge variant="secondary" className="gap-1.5 border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3" />
                Solana dev agents
              </Badge>
            </div>

            <h1 className="text-[1.75rem] font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Build trusted AI agents for{" "}
              <span className="text-gradient-animate">Solana dev workflows.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Privacy-first autonomous agents — wallet tracking, token research, X drafts,
              Telegram alerts, and scheduled brain tasks.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button size="lg" className="glow-emerald h-12 w-full sm:h-11 sm:w-auto">
                      Go to dashboard
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/docs" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="h-12 w-full sm:h-11 sm:w-auto">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Documentation
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button size="lg" className="glow-emerald h-12 w-full sm:h-11 sm:w-auto">
                      Start building free
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link
                    href="https://github.com/ayradotrun/ayra-agent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button variant="outline" size="lg" className="h-12 w-full sm:h-11 sm:w-auto">
                      <Code2 className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile quick links */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start md:hidden">
              {[
                { href: "/docs", label: "Docs" },
                { href: "/#features", label: "Features" },
                { href: "/docs/resources", label: "Resources" },
                { href: "/security", label: "Security" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-500/30 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

          <LandingAgentTerminal />
        </div>

        <ScrollReveal variant="fadeUp" delay={0.15} className="mt-10 sm:mt-16">
          <ScrollStagger className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {stats.map((stat) => (
              <ScrollStaggerItem key={stat.label}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="glass-panel min-w-[140px] shrink-0 cursor-default rounded-xl px-4 py-4 sm:min-w-0 sm:rounded-2xl sm:p-6"
                >
                  <p className="text-xl font-bold text-gradient sm:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground sm:text-sm">{stat.label}</p>
                </motion.div>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
        </ScrollReveal>
      </section>

      {/* Features */}
      <section id="features" className={`relative z-10 border-t border-border/40 bg-secondary/15 py-16 md:py-24 ${SITE_SECTION_ANCHOR}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal variant="fadeUp" className="max-w-2xl text-center md:text-left">
            <Badge variant="secondary" className="mb-4">Platform</Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to run AI agents
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Hermes-style autonomy with Solana-native skills, enterprise-grade privacy, and
              developer-friendly self-hosting.
            </p>
          </ScrollReveal>

          <ScrollStagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
            {features.map((feature) => {
              const Icon = iconMap[feature.icon] || Bot;
              return (
                <ScrollStaggerItem key={feature.title}>
                  <motion.div
                    whileHover={{ y: -6, transition: { type: "spring", stiffness: 300 } }}
                    className="glass-panel group h-full rounded-xl p-6 transition-colors hover:border-primary/30 hover:shadow-[0_0_32px_-12px_rgba(52,211,153,0.25)]"
                  >
                    <div className="mb-4 inline-flex rounded-lg border border-primary/20 bg-primary/10 p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                  </motion.div>
                </ScrollStaggerItem>
              );
            })}
          </ScrollStagger>
        </div>
      </section>

      {/* Privacy / trust */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal variant="scale" amount={0.15}>
            <div className="glass-panel glow-emerald overflow-hidden rounded-2xl">
              <div className="grid lg:grid-cols-2">
                <ScrollReveal variant="slideLeft" delay={0.1} className="p-6 sm:p-10 lg:p-12">
                  <Badge variant="secondary" className="mb-4 gap-1.5">
                    <Shield className="h-3 w-3" />
                    Privacy-first
                  </Badge>
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Your conversations never live on our shared database
                  </h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    Every account connects a private Postgres instance for chat and AYRA Brain tasks.
                    Platform DB stores auth and agent config — your messages stay in infrastructure you
                    control.
                  </p>
                  <ScrollStaggerList className="mt-6 space-y-3" stagger={0.06}>
                    {[
                      "Required BYOD Postgres on first login",
                      "Tables auto-created — no Prisma on your side",
                      "Credentials encrypted with AES-256-GCM",
                      "Open-source — audit the code yourself",
                    ].map((item) => (
                      <ScrollStaggerListItem key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {item}
                      </ScrollStaggerListItem>
                    ))}
                  </ScrollStaggerList>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/privacy">
                      <Button variant="outline" size="sm">
                        Privacy Policy
                      </Button>
                    </Link>
                    <Link href="/security">
                      <Button variant="ghost" size="sm">
                        Security details
                      </Button>
                    </Link>
                  </div>
                </ScrollReveal>

                <ScrollReveal variant="slideRight" delay={0.15} amount={0.12}>
                  <LandingArchitectureDiagram />
                </ScrollReveal>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className={`relative z-10 border-t border-border/40 bg-secondary/15 py-16 md:py-24 ${SITE_SECTION_ANCHOR}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal variant="fadeUp">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              From zero to a running agent in minutes — connect your database, pick a persona, attach skills.
            </p>
          </ScrollReveal>

          <ScrollStagger className="mt-8 grid gap-4 sm:mt-14 md:grid-cols-3" stagger={0.1}>
            {[
              {
                step: "01",
                icon: MessageSquare,
                title: "Create your workspace",
                desc: "Register, connect your private Postgres, and add your LLM API key in Settings.",
              },
              {
                step: "02",
                icon: Bot,
                title: "Configure an agent",
                desc: "Choose Aria, Sienna, Marcus, or Nova. Attach skills like wallet tracker, X draft, or RPC monitor.",
              },
              {
                step: "03",
                icon: Clock,
                title: "Run & monitor",
                desc: "Chat in the dashboard, message via Telegram, or schedule cron runs. Review logs and drafts.",
              },
            ].map((item) => (
              <ScrollStaggerItem key={item.step}>
                <motion.div
                  whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
                  className="relative h-full glass-panel rounded-xl p-5 sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-primary/15">{item.step}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </motion.div>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
        </div>
      </section>

      {/* Personas */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal variant="fadeUp">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meet your agent team</h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Pre-built personas with roles, prompts, and recommended skills — customize everything.
            </p>
          </ScrollReveal>
          <ScrollStagger className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden" stagger={0.07}>
            {personas.map((persona) => (
              <ScrollStaggerItem key={persona.name}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="glass-panel min-w-[220px] shrink-0 rounded-xl p-5 transition-shadow hover:shadow-[0_0_24px_-10px_rgba(52,211,153,0.2)] sm:min-w-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {persona.name[0]}
                  </div>
                  <h3 className="mt-4 font-semibold">{persona.name}</h3>
                  <p className="text-xs text-primary">{persona.role}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{persona.focus}</p>
                </motion.div>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className={`relative z-10 border-t border-border/40 bg-secondary/15 py-16 md:py-24 ${SITE_SECTION_ANCHOR}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal variant="fadeUp">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Skills for devs & token teams</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              14+ working skills today. Mix and match per agent. X auto-post is opt-in at account and agent level.
            </p>
          </ScrollReveal>
          <ScrollStagger className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {previewSkills.map((skill) => {
              const Icon = iconMap[skill.icon] || Bot;
              return (
                <ScrollStaggerItem key={skill.name}>
                  <motion.div
                    whileHover={{ y: -3 }}
                    className="group h-full glass-panel rounded-xl p-5 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between">
                      <Icon className="h-5 w-5 text-primary" />
                      <Badge variant={skill.enabled ? "success" : "secondary"}>
                        {skill.enabled ? "Available" : "Soon"}
                      </Badge>
                    </div>
                    <h3 className="mt-3 font-medium">{skill.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{skill.category}</p>
                  </motion.div>
                </ScrollStaggerItem>
              );
            })}
          </ScrollStagger>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <ScrollReveal variant="fadeUp" className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          </ScrollReveal>
          <ScrollStagger className="mt-12 space-y-4" stagger={0.08}>
            {faqs.map((faq) => (
              <ScrollStaggerItem key={faq.q}>
                <details className="group glass-panel rounded-xl [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-medium">
                    {faq.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="border-t border-border/40 px-5 pb-5 pt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              </ScrollStaggerItem>
            ))}
          </ScrollStagger>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-border/40 py-16 pb-28 md:py-24 md:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ScrollReveal variant="scale" amount={0.2}>
            <div className="glass-panel glow-emerald rounded-2xl px-5 py-10 text-center sm:px-12 sm:py-14">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">
                Launch your first Solana agent today
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                Free to start. Connect your database, add an API key, and deploy agents in minutes.
                Self-host anytime with the open-source repo.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="glow-emerald">
                      Open dashboard
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/register">
                    <Button size="lg" className="glow-emerald">
                      Get started free
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link href="/terms">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Terms of Service
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mobile bottom navigation */}
      <PublicBottomNav />

      <LandingFooter />
    </div>
  );
}
