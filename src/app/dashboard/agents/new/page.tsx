"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  Lock,
  MessageSquare,
  Radar,
  Server,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SkillPicker } from "@/components/skills/skill-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENT_TEMPLATES, SCHEDULE_OPTIONS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  isEnabled: boolean;
}

const TEMPLATE_ICONS: Record<string, typeof Bot> = {
  "ayra-full": Sparkles,
  "nova-ayra": Brain,
  "aria-research": Radar,
  "sienna-comms": MessageSquare,
  "marcus-network": Zap,
  "nina-infra": Server,
  "kai-devrel": Users,
  "ravi-intelligence": Bot,
  custom: Shield,
};

export default function CreateAgentPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("ayra-full");
  const [form, setForm] = useState({
    name: "",
    description: "",
    memoryEnabled: true,
    schedule: "MANUAL" as string,
    telegramNotify: false,
    autoPostX: false,
    skillSlugs: [] as string[],
  });

  useEffect(() => {
    applyTemplate("ayra-full");
    fetch("/api/skills")
      .then((r) => r.json())
      .then(setSkills);
  }, []);

  function applyTemplate(templateId: string) {
    const resolvedId = templateId === "nova-hermes" ? "nova-ayra" : templateId;
    setSelectedTemplate(resolvedId);
    const template = AGENT_TEMPLATES.find((t) => t.id === resolvedId);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      name: template.id === "custom" ? prev.name : template.name,
      description: template.description,
      schedule: template.schedule,
      skillSlugs: [...template.skills],
      telegramNotify: template.telegramNotify ?? false,
      autoPostX: template.autoPostX ?? false,
    }));
  }

  function setSkillSlugs(slugs: string[]) {
    setForm((prev) => ({ ...prev, skillSlugs: slugs }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, template: selectedTemplate }),
    });

    setLoading(false);
    if (res.ok) {
      const agent = await res.json();
      router.push(`/dashboard/agents/${agent.id}`);
    }
  }

  const enabledSkills = skills.filter((s) => s.isEnabled);
  const isCustom = selectedTemplate === "custom";
  const templateMeta = AGENT_TEMPLATES.find((t) => t.id === selectedTemplate);
  const scheduleLabel =
    SCHEDULE_OPTIONS.find((s) => s.value === form.schedule)?.label ?? form.schedule;
  const TemplateIcon = TEMPLATE_ICONS[selectedTemplate] ?? Bot;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Create"
        title="New agent"
        description={
          isCustom
            ? "Name your agent, pick skills and schedule — AYRA manages behavior and safety automatically."
            : "Pick an office role. Skills, schedule, and AI behavior are pre-configured and locked."
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-foreground">Managed behavior</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            System prompts are not shown or editable. Every agent runs AYRA&apos;s locked protocol —
            tool discipline, safety rules, and role-specific workflows — applied server-side.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="overflow-hidden border-white/[0.08]">
          <CardHeader>
            <CardTitle className="text-base">Choose a role</CardTitle>
            <CardDescription>
              Template agents ship ready to work. Use <strong>New Hire</strong> to pick your own
              skills and schedule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...AGENT_TEMPLATES]
                .sort((a, b) => (a.id === "ayra-full" ? -1 : b.id === "ayra-full" ? 1 : 0))
                .map((t) => {
                  const Icon = TEMPLATE_ICONS[t.id] ?? Bot;
                  const selected = selectedTemplate === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "relative rounded-xl border p-4 text-left transition-colors",
                        selected
                          ? "border-emerald-500/40 bg-emerald-500/[0.08] ring-1 ring-emerald-500/25"
                          : "border-border/60 hover:border-border bg-white/[0.02]",
                        t.id === "ayra-full" && !selected && "border-emerald-500/15"
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="template-glow"
                          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      <div className="relative flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                            selected
                              ? "border-emerald-500/30 bg-emerald-500/15"
                              : "border-white/[0.08] bg-white/[0.04]"
                          )}
                        >
                          <Icon className="h-4 w-4 text-emerald-400/90" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{t.name}</p>
                            {"skills" in t && t.skills.length > 0 && (
                              <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                                {t.skills.length}
                              </span>
                            )}
                          </div>
                          {"role" in t && t.role && (
                            <p className="text-[11px] text-emerald-400/80">{t.role}</p>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <AnimatePresence mode="wait">
          {!isCustom && templateMeta && (
            <motion.div
              key={selectedTemplate}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                      <TemplateIcon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{templateMeta.name}</CardTitle>
                      <CardDescription>
                        {"role" in templateMeta && templateMeta.role ? templateMeta.role : "Office template"} ·{" "}
                        {scheduleLabel}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{templateMeta.description}</p>

                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground/90">
                      <Lock className="h-3.5 w-3.5 text-emerald-400/80" />
                      Behavior profile locked
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Role-specific workflows, tool rules, and safety guardrails are applied automatically —
                      not configurable from the dashboard.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Included skills ({form.skillSlugs.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.skillSlugs.slice(0, 12).map((slug) => {
                        const skill = enabledSkills.find((s) => s.slug === slug);
                        return (
                          <Badge key={slug} variant="outline" className="text-[11px]">
                            {skill?.name ?? slug}
                          </Badge>
                        );
                      })}
                      {form.skillSlugs.length > 12 && (
                        <Badge variant="secondary" className="text-[11px]">
                          +{form.skillSlugs.length - 12} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                    Models from{" "}
                    <Link href="/dashboard/settings" className="text-primary underline-offset-2 hover:underline">
                      Settings → LLM
                    </Link>
                    . Agent starts <strong className="text-foreground">active</strong> immediately.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {isCustom && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Custom agent</CardTitle>
                  <CardDescription>
                    You control name, description, skills, and schedule. Behavior follows AYRA&apos;s
                    standard protocol — same safety and tool rules as office templates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agent name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. My Research Bot"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What should this agent focus on? (for your reference)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Select value={form.schedule} onValueChange={(v) => setForm({ ...form, schedule: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Shield className="h-3.5 w-3.5 text-emerald-400/80" />
                      AYRA protocol (locked)
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Tool discipline, anti-hallucination rules, and crypto safety guardrails are enforced
                      server-side. Customize what the agent can do via skills below.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <p className="text-sm font-medium">Memory</p>
                    <p className="text-xs text-muted-foreground">Store and recall context across runs</p>
                  </div>
                  <Switch
                    checked={form.memoryEnabled}
                    onCheckedChange={(v) => setForm({ ...form, memoryEnabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <p className="text-sm font-medium">Auto-post to X</p>
                    <p className="text-xs text-muted-foreground">Requires X API keys in Settings</p>
                  </div>
                  <Switch
                    checked={form.autoPostX}
                    onCheckedChange={(v) => setForm({ ...form, autoPostX: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                  <div>
                    <p className="text-sm font-medium">Telegram notifications</p>
                    <p className="text-xs text-muted-foreground">Notify on run completion</p>
                  </div>
                  <Switch
                    checked={form.telegramNotify}
                    onCheckedChange={(v) => setForm({ ...form, telegramNotify: v })}
                  />
                </div>
              </div>

              <SkillPicker
                skills={enabledSkills}
                selectedSlugs={form.skillSlugs}
                onChange={setSkillSlugs}
                emphasize
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mobile-form-actions flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || (isCustom && !form.name.trim())}>
            {loading ? "Creating..." : "Create agent"}
          </Button>
        </div>
      </form>
    </div>
  );
}
