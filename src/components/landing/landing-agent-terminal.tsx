"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const terminalLines = [
  { type: "system", text: "AYRA Agent v0.1 — agent runtime ready" },
  { type: "user", text: "Scan trending Solana memes and draft a thread" },
  { type: "tool", text: "▸ meme-coin-scanner · 12 tokens scanned" },
  { type: "tool", text: "▸ token-quality-report · 3 passed filters" },
  { type: "tool", text: "▸ x-thread-drafter · 5-post thread generated" },
  { type: "agent", text: "Draft ready. Review in dashboard or /post when approved." },
] as const;

export function LandingAgentTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  const currentLine = visibleCount < terminalLines.length ? terminalLines[visibleCount] : null;
  const displayedText = currentLine ? currentLine.text.slice(0, charIndex) : "";

  useEffect(() => {
    if (!currentLine) {
      const reset = setTimeout(() => {
        setVisibleCount(0);
        setCharIndex(0);
        setCycle((c) => c + 1);
      }, 2800);
      return () => clearTimeout(reset);
    }

    if (charIndex < currentLine.text.length) {
      const speed = currentLine.type === "tool" ? 18 : 28;
      const t = setTimeout(() => setCharIndex((c) => c + 1), speed);
      return () => clearTimeout(t);
    }

    const pause = currentLine.type === "agent" ? 2200 : 400;
    const t = setTimeout(() => {
      setVisibleCount((c) => c + 1);
      setCharIndex(0);
    }, pause);
    return () => clearTimeout(t);
  }, [charIndex, currentLine, visibleCount]);

  const rendered = terminalLines.slice(0, visibleCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      whileHover={{ scale: 1.01 }}
      className="terminal-panel glow-emerald overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_60px_-12px_rgba(52,211,153,0.35)]"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="h-2 w-2 rounded-full bg-red-500/70 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-amber-500/70 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/70 sm:h-2.5 sm:w-2.5" />
        <span className="ml-1 truncate font-mono text-[10px] text-muted-foreground sm:ml-2 sm:text-[11px]">
          aria · research
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[9px] text-emerald-400 sm:gap-1.5 sm:text-[10px]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          live
        </span>
      </div>

      <div
        key={cycle}
        className="min-h-[168px] space-y-1.5 p-3 font-mono text-[11px] leading-relaxed sm:min-h-[200px] sm:space-y-2 sm:p-5 sm:text-[13px]"
      >
        {rendered.map((line, i) => (
          <motion.div
            key={`${cycle}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={
              line.type === "user"
                ? "text-emerald-300/90"
                : line.type === "tool"
                  ? "text-muted-foreground"
                  : line.type === "agent"
                    ? "text-foreground/90"
                    : "text-muted-foreground/70"
            }
          >
            {line.type === "user" && <span className="text-primary/60">you › </span>}
            {line.type === "agent" && <span className="text-primary/60">aria › </span>}
            <span className="break-words">{line.text}</span>
          </motion.div>
        ))}

        {currentLine && (
          <div
            className={
              currentLine.type === "user"
                ? "text-emerald-300/90"
                : currentLine.type === "tool"
                  ? "text-muted-foreground"
                  : currentLine.type === "agent"
                    ? "text-foreground/90"
                    : "text-muted-foreground/70"
            }
          >
            {currentLine.type === "user" && <span className="text-primary/60">you › </span>}
            {currentLine.type === "agent" && <span className="text-primary/60">aria › </span>}
            <span className="break-words">{displayedText}</span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] bg-emerald-400"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
