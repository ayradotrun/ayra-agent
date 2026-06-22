"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { SkillPicker } from "@/components/skills/skill-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENT_TEMPLATES, DEFAULT_AGENT_PROMPT, SCHEDULE_OPTIONS } from "@/lib/utils";
import { DEFAULT_MODEL, DEFAULT_IMAGE_MODEL } from "@/lib/models";
import { ModelPicker } from "@/components/agents/model-picker";
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
    model: DEFAULT_MODEL,
    imageModel: DEFAULT_IMAGE_MODEL,
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

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Create"
        title="New agent"
        description="Pick an office agent template, then customize skills and schedule."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Aria"
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
                  rows={5}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModelPicker
                  value={form.model}
                  onChange={(model) => setForm({ ...form, model })}
                  label="Chat model"
                  tiers={["free", "standard", "premium"]}
                />
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select value={form.schedule} onValueChange={(v) => setForm({ ...form, schedule: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <ModelPicker
                value={form.imageModel}
                onChange={(imageModel) => setForm({ ...form, imageModel })}
                label="Image model"
                tiers={["image-free", "image"]}
                presetFallback={DEFAULT_IMAGE_MODEL}
                customLabel="Custom image model (optional)"
                showHint={false}
              />
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
                  <p className="text-xs text-muted-foreground">Requires X API keys in Settings + explicit postNow in skill</p>
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
            </CardContent>
          </Card>

          <SkillPicker
            skills={enabledSkills}
            selectedSlugs={form.skillSlugs}
            onChange={setSkillSlugs}
            emphasize={isCustom}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.name}>
              {loading ? "Creating..." : "Create agent"}
            </Button>
          </div>
        </form>
    </div>
  );
}
