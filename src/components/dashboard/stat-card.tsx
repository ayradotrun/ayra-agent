import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
}

export function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  return (
    <Card className="surface-card group overflow-hidden">
      <CardContent className="relative p-5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-emerald-400/70" />
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {title}
              </p>
            </div>
            <p className="mt-3 tabular-nums text-[32px] font-semibold leading-none tracking-[-0.04em]">
              {value}
            </p>
            {subtitle && (
              <p className="mt-2 text-[12px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] py-16 px-6 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/[0.06] bg-white/[0.03]">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-[15px] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this section. Try refreshing the page.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] px-5 py-4">
      <p className="text-[14px] font-medium text-red-300">{title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
