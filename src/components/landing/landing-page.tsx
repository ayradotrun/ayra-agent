"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  Coins,
  Send,
  Activity,
  ArrowRight,
  Wallet,
  TrendingUp,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AyraLogo } from "@/components/brand/ayra-logo";

const iconMap: Record<string, React.ElementType> = {
  wallet: Wallet,
  coins: Coins,
  send: Send,
  activity: Activity,
  "pen-line": PenLine,
  "trending-up": TrendingUp,
  brain: Bot,
};

const previewSkills = [
  { name: "Wallet Tracker", category: "Solana", icon: "wallet", enabled: true },
  { name: "Token Research", category: "Solana", icon: "coins", enabled: true },
  { name: "X Post & Draft", category: "Social", icon: "send", enabled: true },
  { name: "Viral Topic Finder", category: "Social", icon: "trending-up", enabled: true },
  { name: "Solana RPC Monitor", category: "Crypto", icon: "activity", enabled: true },
  { name: "X Thread Drafter", category: "Social", icon: "pen-line", enabled: true },
];

const useCases = [
  { title: "Monitor Solana wallets", desc: "Track SOL balance and SPL tokens for dev wallets or treasuries." },
  { title: "Research token on-chain", desc: "Mint info, supply, authorities — dev briefing, not trading signals." },
  { title: "Auto-post to X", desc: "Draft threads or post when you opt in — Settings + Agent toggles required." },
  { title: "Token launch assistant", desc: "Templates for dev updates, community posts, and launch checklists." },
  { title: "Telegram alerts", desc: "Get notified when scheduled agent runs complete." },
  { title: "Agent memory", desc: "Agents remember context across runs for ongoing projects." },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <AyraLogo size={36} priority className="ring-1 ring-primary/30" />
          <span className="font-semibold tracking-tight">AYRA Agent</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Start Building</Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <Badge variant="secondary" className="mb-6">Solana dev agent platform</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            AI agents for{" "}
            <span className="text-gradient">Solana devs & token builders.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Autonomous AYRA agents built for developers: wallet tracking, token research,
            X drafts & optional auto-post, Telegram alerts, and a growing skill marketplace.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/register">
              <Button size="lg" className="glow-emerald">
                Start Building
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#skills">
              <Button variant="outline" size="lg">View Skills</Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-20 glass-panel glow-emerald rounded-2xl p-6"
        >
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Agent preview — Aria (Research Analyst)
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {previewSkills.slice(0, 3).map((skill) => {
              const Icon = iconMap[skill.icon] || Bot;
              return (
                <div key={skill.name} className="rounded-lg border border-border/60 bg-secondary/30 p-4">
                  <Icon className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">{skill.name}</p>
                  <p className="text-xs text-muted-foreground">{skill.category}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 border-t border-border/40 bg-secondary/20 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Built for Solana dev workflows</h2>
          <p className="mt-2 text-muted-foreground">On-chain monitoring, social growth, and launch ops — not trading bots.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-xl p-6"
              >
                <h3 className="font-medium">{uc.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Pick a team member", desc: "Aria, Sienna, Marcus, Nina, Kai, Leo, or Ravi — each with a role and skills." },
              { step: "02", title: "Attach skills", desc: "Wallet tracker, token research, X post, RPC monitor, memory." },
              { step: "03", title: "Run on schedule", desc: "Manual or cron. Review logs, drafts, and Telegram alerts." },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-4xl font-bold text-primary/20">{item.step}</span>
                <h3 className="mt-2 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="skills" className="relative z-10 border-t border-border/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Skills for devs & token teams</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            14+ working skills today. X auto-post is opt-in at account and agent level.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previewSkills.map((skill) => {
              const Icon = iconMap[skill.icon] || Bot;
              return (
                <div key={skill.name} className="group glass-panel rounded-xl p-5 transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between">
                    <Icon className="h-5 w-5 text-primary" />
                    <Badge variant={skill.enabled ? "success" : "secondary"}>
                      {skill.enabled ? "Available" : "Soon"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-medium">{skill.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{skill.category}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-border/40 py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Launch your first Solana agent.</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Setup in minutes. Copy <code className="text-foreground/80">.env.example</code> to{" "}
            <code className="text-foreground/80">.env</code> and see the README for full setup.
          </p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg" className="glow-emerald">
              Get started free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AYRA Agent</span>
          <span>Solana dev agents · Not financial advice</span>
        </div>
      </footer>
    </div>
  );
}
