"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SkillPicker } from "@/components/skills/skill-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AGENT_TEMPLATES, DEFAULT_AGENT_PROMPT, SCHEDULE_OPTIONS } from "@/lib/utils";
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

export default function CreateAgentPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("ayra-full");
  const [form, setForm] = useState({
    name: "",
    description: "",
    systemPrompt: DEFAULT_AGENT_PROMPT,
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
      systemPrompt: template.systemPrompt,
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Create"
        title="New agent"
        description={
          isCustom
            ? "Build a custom agent under AYRA — name, prompt, skills, and schedule are yours to configure."
            : "Office templates are fixed. Pick a role, then create — chat & image models come from Settings → LLM."
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
            <CardDescription>
              Template agents cannot be renamed or reconfigured. Use <strong>New Hire</strong> for full
              control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...AGENT_TEMPLATES]
                .sort((a, b) => (a.id === "ayra-full" ? -1 : b.id === "ayra-full" ? 1 : 0))
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      selectedTemplate === t.id
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 hover:border-border",
                      t.id === "ayra-full" && selectedTemplate !== t.id && "border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{t.name}</p>
                      {"skills" in t && t.skills.length > 0 && (
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {t.skills.length} skills
                        </span>
                      )}
                    </div>
                    {"role" in t && t.role && (
                      <p className="text-xs text-primary/80">{t.role}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>

        {!isCustom && templateMeta && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{templateMeta.name}</CardTitle>
              <CardDescription>
                {"role" in templateMeta && templateMeta.role ? templateMeta.role : "Office template"} ·{" "}
                {scheduleLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{templateMeta.description}</p>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">System prompt (fixed)</p>
                <pre className="max-h-40 overflow-y-auto rounded-lg bg-secondary/50 p-3 text-[11px] whitespace-pre-wrap">
                  {form.systemPrompt}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Skills ({form.skillSlugs.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {form.skillSlugs.map((slug) => {
                    const skill = enabledSkills.find((s) => s.slug === slug);
                    return (
                      <Badge key={slug} variant="outline" className="text-[11px]">
                        {skill?.name ?? slug}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                Chat & image models use your{" "}
                <Link href="/dashboard/settings" className="text-primary underline-offset-2 hover:underline">
                  Settings → LLM Provider
                </Link>
                . Agent starts <strong className="text-foreground">active</strong> and is ready for chat
                immediately.
              </div>
            </CardContent>
          </Card>
        )}

        {isCustom && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom agent</CardTitle>
              <CardDescription>
                Fully configurable. The agent still operates under AYRA rules and identity in every
                conversation.
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
                  placeholder="What does this agent do?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">System prompt</Label>
                <Textarea
                  id="prompt"
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  rows={6}
                />
                <p className="text-[11px] text-muted-foreground">
                  AYRA office identity is added automatically if not already in your prompt.
                </p>
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
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                Models come from{" "}
                <Link href="/dashboard/settings" className="text-primary underline-offset-2 hover:underline">
                  Settings → LLM Provider
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        )}

        {isCustom && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div>
                  <p className="text-sm font-medium">Memory</p>
                  <p className="text-xs text-muted-foreground">Allow agent to store and recall memories</p>
                </div>
                <Switch
                  checked={form.memoryEnabled}
                  onCheckedChange={(v) => setForm({ ...form, memoryEnabled: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div>
                  <p className="text-sm font-medium">Auto-post to X</p>
                  <p className="text-xs text-muted-foreground">
                    Requires X API keys in Settings + explicit postNow in skill
                  </p>
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
          </>
        )}

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
