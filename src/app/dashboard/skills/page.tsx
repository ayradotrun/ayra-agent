"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SkillCard } from "@/components/skills/skill-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SKILL_CATEGORIES } from "@/lib/skills/catalog";
import { Search } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  isEnabled: boolean;
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then(setSkills)
      .finally(() => setLoading(false));
  }, []);

  const filtered = skills.filter((s) => {
    if (category && s.category !== category) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const enabledCount = skills.filter((s) => s.isEnabled).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Marketplace"
        title="Skills"
        description={`Attach capabilities to your agents. ${enabledCount} available, ${skills.length - enabledCount} coming soon.`}
      />

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={category === null ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCategory(null)}
            >
              All
            </Button>
            {SKILL_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading skills...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            No skills match your search
          </div>
        )}
    </div>
  );
}
