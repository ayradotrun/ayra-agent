"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { SkillCard } from "@/components/skills/skill-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SkillOption {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  isEnabled: boolean;
}

interface SkillPickerProps {
  skills: SkillOption[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  /** Highlight skills section for blank custom agents */
  emphasize?: boolean;
  /** Template agents — display only */
  readOnly?: boolean;
}

export function SkillPicker({ skills, selectedSlugs, onChange, emphasize, readOnly }: SkillPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const available = useMemo(() => skills.filter((s) => s.isEnabled), [skills]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(available.map((s) => s.category))).sort();
    return ["All", ...cats];
  }, [available]);

  const filtered =
    activeCategory === "All"
      ? available
      : available.filter((s) => s.category === activeCategory);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of available) {
      if (selectedSlugs.includes(s.slug)) {
        map[s.category] = (map[s.category] ?? 0) + 1;
      }
    }
    return map;
  }, [available, selectedSlugs]);

  function toggle(slug: string) {
    if (readOnly) return;
    onChange(
      selectedSlugs.includes(slug)
        ? selectedSlugs.filter((s) => s !== slug)
        : [...selectedSlugs, slug]
    );
  }

  function selectCategory(cat: string) {
    const slugs = available.filter((s) => s.category === cat).map((s) => s.slug);
    const merged = Array.from(new Set([...selectedSlugs, ...slugs]));
    onChange(merged);
  }

  function clearCategory(cat: string) {
    const slugs = new Set(available.filter((s) => s.category === cat).map((s) => s.slug));
    onChange(selectedSlugs.filter((s) => !slugs.has(s)));
  }

  function selectOnlyCategory(cat: string) {
    onChange(available.filter((s) => s.category === cat).map((s) => s.slug));
    setActiveCategory(cat);
  }

  return (
    <div className={cn("space-y-4", emphasize && "rounded-xl border border-primary/20 bg-primary/[0.02] p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Skills</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {readOnly
              ? "Fixed for this template — create a custom agent to change skills."
              : "Select skills for this agent — focus on one category for better accuracy."}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {selectedSlugs.length} / {available.length} selected
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = cat === "All" ? selectedSlugs.length : categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                activeCategory === cat
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 hover:border-border"
              )}
            >
              {cat}
              {count > 0 && cat !== "All" && (
                <span className="ml-1 opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {activeCategory !== "All" && !readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => selectOnlyCategory(activeCategory)}
          >
            <Check className="mr-1 h-3 w-3" />
            {activeCategory} only
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => selectCategory(activeCategory)}
          >
            + Add all {activeCategory}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => clearCategory(activeCategory)}
          >
            <X className="mr-1 h-3 w-3" />
            Remove {activeCategory}
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((skill) => (
          <div key={skill.id} className="relative">
            {selectedSlugs.includes(skill.slug) && (
              <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-3 w-3" />
              </div>
            )}
            <SkillCard
              skill={skill}
              selected={selectedSlugs.includes(skill.slug)}
              onToggle={readOnly ? () => {} : toggle}
              compact
            />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No skills in this category.
        </p>
      )}
    </div>
  );
}
