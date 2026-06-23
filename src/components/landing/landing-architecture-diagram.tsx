"use client";

import { motion, useReducedMotion } from "framer-motion";

const platformItems = ["Users", "Agents", "Auth", "Settings"];
const channelItems = ["Dashboard", "Telegram", "Worker"];
const privateItems = ["chat_session", "chat_message", "brain_task"];

function FlowLine({
  d,
  delay,
  reduced,
}: {
  d: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      {!reduced && (
        <>
          <motion.path
            d={d}
            fill="none"
            stroke="rgba(52,211,153,0.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay, ease: "easeInOut" }}
          />
          <circle r="3" fill="#34d399" opacity="0.9">
            <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${delay + 0.8}s`} path={d} />
          </circle>
        </>
      )}
    </g>
  );
}

function NodeBox({
  title,
  subtitle,
  items,
  variant,
  delay,
}: {
  title: string;
  subtitle?: string;
  items: string[];
  variant: "platform" | "channel" | "private";
  delay: number;
}) {
  const styles = {
    platform: {
      border: "border-white/10",
      bg: "bg-white/[0.04]",
      glow: "",
      title: "text-foreground/90",
    },
    channel: {
      border: "border-white/8",
      bg: "bg-white/[0.03]",
      glow: "",
      title: "text-muted-foreground",
    },
    private: {
      border: "border-emerald-500/35",
      bg: "bg-emerald-500/[0.07]",
      glow: "shadow-[0_0_32px_-8px_rgba(52,211,153,0.35)]",
      title: "text-emerald-300/90",
    },
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 120 }}
      className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${styles.border} ${styles.bg} ${styles.glow}`}
    >
      <p className={`font-mono text-[10px] font-medium uppercase tracking-wider sm:text-[11px] ${styles.title}`}>
        {title}
      </p>
      {subtitle && (
        <p className="mt-0.5 font-mono text-[9px] text-emerald-400/80 sm:text-[10px]">{subtitle}</p>
      )}
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <motion.span
              key={item}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: delay + 0.08 * i }}
              className="rounded-md border border-white/[0.06] bg-black/20 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground sm:text-[10px]"
            >
              {item}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function LandingArchitectureDiagram() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="relative flex min-h-[280px] flex-col justify-center border-t border-border/40 bg-[#0a0c0e] p-5 sm:p-8 lg:min-h-full lg:border-l lg:border-t-0 lg:p-10">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="font-mono text-[10px] uppercase tracking-wider text-primary/70"
      >
        Architecture
      </motion.p>

      <div className="relative mt-5 flex flex-col gap-3 sm:gap-4">
        <NodeBox
          title="Platform Postgres"
          items={platformItems}
          variant="platform"
          delay={0.05}
        />

        {/* SVG connectors — desktop layout */}
        <div className="relative hidden h-16 sm:block">
          <svg
            viewBox="0 0 320 64"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <FlowLine d="M 160 0 L 160 20" delay={0.2} reduced={reduced} />
            <FlowLine d="M 160 20 L 56 20 L 56 40" delay={0.35} reduced={reduced} />
            <FlowLine d="M 160 20 L 160 40" delay={0.45} reduced={reduced} />
            <FlowLine d="M 160 20 L 264 20 L 264 40" delay={0.55} reduced={reduced} />
            <FlowLine d="M 56 52 L 56 56 L 160 56 L 160 64" delay={0.7} reduced={reduced} />
            <FlowLine d="M 160 52 L 160 64" delay={0.75} reduced={reduced} />
            <FlowLine d="M 264 52 L 264 56 L 160 56" delay={0.8} reduced={reduced} />
          </svg>
        </div>

        {/* Mobile vertical connector */}
        <div className="flex justify-center sm:hidden">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            className="h-6 w-px origin-top bg-gradient-to-b from-white/10 via-emerald-500/40 to-white/10"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {channelItems.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 + i * 0.08 }}
              whileHover={{ y: -2, borderColor: "rgba(52,211,153,0.25)" }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3 text-center transition-colors sm:py-4"
            >
              <p className="font-mono text-[10px] text-muted-foreground sm:text-[11px]">{name}</p>
            </motion.div>
          ))}
        </div>

        <div className="relative hidden h-10 sm:block">
          <svg viewBox="0 0 320 40" className="absolute inset-0 h-full w-full" aria-hidden>
            <FlowLine d="M 160 0 L 160 40" delay={0.85} reduced={reduced} />
          </svg>
        </div>

        <div className="flex justify-center sm:hidden">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="h-6 w-px origin-top bg-gradient-to-b from-emerald-500/30 to-emerald-500/60"
          />
        </div>

        <NodeBox
          title="Your Private Postgres"
          subtitle="required · you control this"
          items={privateItems}
          variant="private"
          delay={0.95}
        />

        {!reduced && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2 }}
            className="mt-1 flex items-center justify-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[10px] text-emerald-400/80">data flows to your database</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
