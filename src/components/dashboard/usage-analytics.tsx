"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Brain,
  ChevronDown,
  Coins,
  Sparkles,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCostUsd, formatTokenCount } from "@/lib/usage/cost-estimate";
import type { DailyUsagePoint, ModelUsagePoint, UsageRangeDays } from "@/lib/usage/analytics";

export interface UsageAnalyticsData {
  days: UsageRangeDays;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  daily: DailyUsagePoint[];
  models: ModelUsagePoint[];
}

const RANGE_OPTIONS: Array<{ days: UsageRangeDays; label: string }> = [
  { days: 1, label: "Today" },
  { days: 7, label: "7D" },
  { days: 14, label: "14D" },
  { days: 30, label: "30D" },
];

function AnimatedNumber({
  value,
  format,
  className,
  precise,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  precise?: boolean;
}) {
  const spring = useSpring(0, { stiffness: 90, damping: 18 });
  const display = useTransform(spring, (v) => format(precise ? v : Math.round(v)));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}

function MetricCard({
  title,
  value,
  format,
  icon: Icon,
  accent,
  delay,
  subtitle,
  precise,
  valueClassName,
}: {
  title: string;
  value: number;
  format: (n: number) => string;
  icon: typeof Activity;
  accent: string;
  delay: number;
  subtitle?: string;
  precise?: boolean;
  valueClassName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60",
          accent
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
              <Icon className="h-3.5 w-3.5 text-emerald-400/80" />
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {title}
            </p>
          </div>
          <p
            className={cn(
              "mt-3 tabular-nums text-[28px] font-semibold leading-none tracking-[-0.04em]",
              valueClassName
            )}
          >
            <AnimatedNumber value={value} format={format} precise={precise} />
          </p>
          {subtitle && (
            <p className="mt-2 text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function UsageCandle({
  heightPct,
  hasValue,
  bodyClass,
  wickClass,
  glowClass,
  title,
  delay,
  widthClass = "w-2.5 sm:w-3",
}: {
  heightPct: number;
  hasValue: boolean;
  bodyClass: string;
  wickClass: string;
  glowClass: string;
  title: string;
  delay: number;
  widthClass?: string;
}) {
  const bodyHeight = hasValue ? heightPct : 3;

  return (
    <div
      className={cn("flex h-full items-end justify-center", widthClass)}
      title={title}
    >
      <motion.div
        initial={{ height: 0, opacity: 0.4 }}
        animate={{ height: `${bodyHeight}%`, opacity: 1 }}
        transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative w-full min-h-[3px] rounded-[3px] bg-gradient-to-t",
          bodyClass,
          hasValue && glowClass
        )}
      >
        <span
          className={cn(
            "absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 -translate-y-full rounded-full",
            wickClass,
            !hasValue && "opacity-30"
          )}
        />
      </motion.div>
    </div>
  );
}

function CostTrackBar({
  heightPct,
  costUsd,
  hasValue,
  delay,
}: {
  heightPct: number;
  costUsd: number;
  hasValue: boolean;
  delay: number;
}) {
  const widthPct = hasValue ? Math.max(heightPct, 6) : 0;

  return (
    <div
      className="group/cost relative h-5 w-full overflow-hidden"
      title={`Cost: ${formatCostUsd(costUsd)}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]" />
      <div className="relative h-full overflow-hidden">
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: `${widthPct}%`, opacity: hasValue ? 1 : 0.25 }}
          transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "absolute left-0 top-1/2 h-2 min-w-[4px] -translate-y-1/2 rounded-full bg-gradient-to-r from-red-700/90 via-red-500 to-red-400/95",
            hasValue && "shadow-[0_0_12px_rgba(248,113,113,0.4)]"
          )}
        >
          {hasValue && (
            <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-red-300/40 bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ActivityChart({
  daily,
  days,
}: {
  daily: DailyUsagePoint[];
  days: UsageRangeDays;
}) {
  const maxTokens = Math.max(
    ...daily.flatMap((d) => [d.inputTokens, d.outputTokens]),
    1
  );
  const maxCost = Math.max(...daily.map((d) => d.costUsd), 0.000001);

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Request activity
        </p>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-1.5 rounded-[2px] bg-gradient-to-t from-amber-600 to-yellow-400" />
            Input tokens
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-1.5 rounded-[2px] bg-gradient-to-t from-emerald-600 to-emerald-400" />
            Output tokens
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-gradient-to-r from-red-700 to-red-400" />
            Cost (USD)
          </span>
          <span className="text-muted-foreground/60">
            {days === 1 ? "By 4h blocks" : "Daily"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-1">
        <div className="flex flex-col justify-between pt-1 text-[8px] leading-none text-muted-foreground/40">
          <span>tok</span>
          <span className="pb-6 text-red-400/50">$</span>
        </div>

        <div className="flex min-w-0 gap-1 sm:gap-1.5">
          {daily.map((point, i) => {
            const inputPct = (point.inputTokens / maxTokens) * 100;
            const outputPct = (point.outputTokens / maxTokens) * 100;
            const costPct = (point.costUsd / maxCost) * 100;
            const hasActivity =
              point.requests > 0 ||
              point.inputTokens > 0 ||
              point.outputTokens > 0 ||
              point.costUsd > 0;

            return (
              <div key={point.date} className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex h-28 w-full items-end justify-center gap-0.5 rounded-lg border border-white/[0.03] bg-white/[0.015] px-0.5 pb-1 pt-2 sm:gap-1 sm:px-1">
                  <UsageCandle
                    heightPct={inputPct}
                    hasValue={point.inputTokens > 0}
                    bodyClass="from-amber-600/90 to-yellow-400/95"
                    wickClass="bg-yellow-300/70"
                    glowClass="shadow-[0_0_14px_rgba(250,204,21,0.35)]"
                    title={`Input: ${formatTokenCount(point.inputTokens)}`}
                    delay={i * 0.03}
                    widthClass="w-3 sm:w-3.5"
                  />
                  <UsageCandle
                    heightPct={outputPct}
                    hasValue={point.outputTokens > 0}
                    bodyClass="from-emerald-600/90 to-emerald-400/95"
                    wickClass="bg-emerald-300/70"
                    glowClass="shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                    title={`Output: ${formatTokenCount(point.outputTokens)}`}
                    delay={i * 0.03 + 0.01}
                    widthClass="w-2 sm:w-2.5"
                  />
                </div>

                <CostTrackBar
                  heightPct={costPct}
                  costUsd={point.costUsd}
                  hasValue={point.costUsd > 0}
                  delay={i * 0.03 + 0.05}
                />

                <span
                  className={cn(
                    "truncate text-center text-[9px]",
                    hasActivity ? "text-muted-foreground/90" : "text-muted-foreground/50"
                  )}
                >
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModelActivityRow({
  model,
  rank,
  barPct,
  compact,
}: {
  model: ModelUsagePoint;
  rank: number;
  barPct: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5",
        compact && "py-2"
      )}
      title={model.model}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 w-4 shrink-0 text-center text-[10px] tabular-nums text-muted-foreground/60">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[12px] font-medium leading-tight text-foreground">
              {model.label}
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatRelativeTime(model.lastUsedAt)}
            </span>
          </div>

          {!compact && (
            <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/65">
              {model.model}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600/90 via-emerald-400 to-cyan-400/90"
                style={{ width: `${barPct}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-foreground/85">
              {model.requests} req
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-muted-foreground">
            <span>
              In{" "}
              <span className="tabular-nums text-yellow-400/90">
                {formatTokenCount(model.inputTokens)}
              </span>
            </span>
            <span>
              Out{" "}
              <span className="tabular-nums text-emerald-400/90">
                {formatTokenCount(model.outputTokens)}
              </span>
            </span>
            <span className="tabular-nums text-red-400/90">{formatCostUsd(model.costUsd)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const MODEL_ACTIVITY_INITIAL = 5;

function ModelActivityPanel({
  models,
  days,
}: {
  models: ModelUsagePoint[];
  days: UsageRangeDays;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxRequests = Math.max(...models.map((m) => m.requests), 1);
  const hasMore = models.length > MODEL_ACTIVITY_INITIAL;
  const visibleModels = expanded ? models : models.slice(0, MODEL_ACTIVITY_INITIAL);
  const useCompactRows = expanded && models.length > 8;

  if (models.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-[12px] text-muted-foreground">
        No model activity in this period.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-emerald-400/80" />
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Model activity
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/70">
          {days === 1 ? "Last 24 hours" : `Last ${days} days`} · {models.length} model
          {models.length === 1 ? "" : "s"}
        </p>
      </div>

      <div
        className={cn(
          "rounded-xl border border-white/[0.06] bg-black/10 p-2 sm:p-2.5",
          expanded && hasMore && "max-h-[min(22rem,52vh)] overflow-y-auto scrollbar-hide"
        )}
      >
        <div
          className={cn(
            "grid gap-1.5",
            expanded && models.length > 6 && "sm:grid-cols-2 xl:grid-cols-3"
          )}
        >
          {visibleModels.map((model, i) => {
            const barPct = (model.requests / maxRequests) * 100;
            return (
              <ModelActivityRow
                key={model.model}
                model={model}
                rank={i + 1}
                barPct={barPct}
                compact={useCompactRows}
              />
            );
          })}
        </div>
      </div>

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((open) => !open)}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
            {expanded
              ? "Show less"
              : `Show all ${models.length} models`}
          </Button>
        </div>
      )}
    </div>
  );
}

interface UsageAnalyticsProps {
  data: UsageAnalyticsData | null;
  loading: boolean;
  days: UsageRangeDays;
  onDaysChange: (days: UsageRangeDays) => void;
  scope?: "user" | "platform";
}

export function UsageAnalytics({
  data,
  loading,
  days,
  onDaysChange,
  scope = "user",
}: UsageAnalyticsProps) {
  const isPlatform = scope === "platform";
  const rangeLayoutId = isPlatform ? "usage-range-pill-admin" : "usage-range-pill";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalTokens = useMemo(
    () => (data ? data.totalInputTokens + data.totalOutputTokens : 0),
    [data]
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-cyan-500/[0.04] p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.12),transparent_55%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
        animate={{ x: [0, 24, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Usage & Analytics</h2>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {isPlatform
                ? "Combined requests, token usage, and estimated LLM cost across all users."
                : "Requests, token usage, and estimated LLM cost for your agents."}
            </p>
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-black/20 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => onDaysChange(opt.days)}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                  days === opt.days
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/90"
                )}
              >
                {days === opt.days && (
                  <motion.span
                    layoutId={rangeLayoutId}
                    className="absolute inset-0 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-xl" />
            ))}
            <Skeleton className="col-span-full h-32 rounded-xl" />
            <Skeleton className="col-span-full h-48 rounded-xl" />
          </div>
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={data.days}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total requests"
                  value={data.totalRequests}
                  format={(n) => n.toLocaleString("en-US")}
                  icon={BarChart3}
                  accent="bg-emerald-500/20"
                  delay={0.05}
                  subtitle={
                    isPlatform
                      ? `All users · last ${data.days === 1 ? "24 hours" : `${data.days} days`}`
                      : `Last ${data.days === 1 ? "24 hours" : `${data.days} days`}`
                  }
                />
                <MetricCard
                  title="Input tokens"
                  value={data.totalInputTokens}
                  format={formatTokenCount}
                  icon={ArrowDownToLine}
                  accent="bg-yellow-500/15"
                  delay={0.1}
                  valueClassName="text-yellow-400"
                />
                <MetricCard
                  title="Output tokens"
                  value={data.totalOutputTokens}
                  format={formatTokenCount}
                  icon={ArrowUpFromLine}
                  accent="bg-emerald-500/15"
                  delay={0.15}
                  valueClassName="text-emerald-400"
                />
                <MetricCard
                  title="Est. cost"
                  value={data.estimatedCostUsd}
                  format={formatCostUsd}
                  icon={Coins}
                  accent="bg-red-500/15"
                  delay={0.2}
                  precise
                  valueClassName="text-red-400"
                  subtitle={
                    data.estimatedCostUsd === 0
                      ? "Free models — $0"
                      : `${formatTokenCount(totalTokens)} total tokens`
                  }
                />
              </div>

              {mounted && data.daily.length > 0 && (
                <ActivityChart daily={data.daily} days={data.days} />
              )}

              {mounted && (
                <ModelActivityPanel models={data.models} days={data.days} />
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] py-12 text-center text-[13px] text-muted-foreground">
            {isPlatform
              ? "No platform usage yet. Activity appears here once users run agents."
              : "No usage data yet. Run an agent from chat or Telegram to see analytics here."}
          </div>
        )}
      </div>
    </section>
  );
}
