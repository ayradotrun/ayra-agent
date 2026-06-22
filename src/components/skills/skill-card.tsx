"use client";

import { getSkillIcon } from "@/lib/skill-icons";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillCardProps {
  skill: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string;
    icon: string;
    isEnabled: boolean;
  };
  selected?: boolean;
  onToggle?: (slug: string) => void;
  compact?: boolean;
}

export function SkillCard({ skill, selected, onToggle, compact }: SkillCardProps) {
  const Icon = getSkillIcon(skill.icon);

  return (
    <Card
      className={cn(
        "surface-card transition-all duration-200",
        onToggle && "cursor-pointer hover:border-emerald-500/20 hover:bg-white/[0.02]",
        selected && "border-emerald-500/30 bg-emerald-500/[0.04] ring-1 ring-emerald-500/10",
        !skill.isEnabled && "opacity-55"
      )}
      onClick={() => onToggle?.(skill.slug)}
    >
      <CardContent className={cn("p-5", compact && "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/[0.06] bg-white/[0.03]">
            <Icon className="h-4 w-4 text-emerald-400/90" />
          </div>
          <Badge variant={skill.isEnabled ? "success" : "secondary"} className="shrink-0">
            {skill.isEnabled ? "Available" : "Soon"}
          </Badge>
        </div>
        <h3 className="mt-3 text-[14px] font-medium tracking-[-0.01em]">{skill.name}</h3>
        {!compact && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
            {skill.description}
          </p>
        )}
        <Badge variant="outline" className="mt-3 border-white/[0.08] bg-white/[0.02] text-[10px]">
          {skill.category}
        </Badge>
      </CardContent>
    </Card>
  );
}
