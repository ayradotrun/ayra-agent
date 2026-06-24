"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface BlueprintField {
  name: string;
  type: string;
  label: string;
  default: string | null;
  options: string[];
  optional?: boolean;
  help?: string;
}

interface BlueprintEntry {
  key: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  fields: BlueprintField[];
  scheduleHuman: string;
  command: string;
  skills?: string[];
}

interface CronSuggestion {
  key: string;
  title: string;
  description: string;
  jobSpec: {
    prompt: string;
    schedule: string;
    name: string;
    deliver: string;
  };
}

interface BlueprintPickerProps {
  agentId: string;
}

export function BlueprintPicker({ agentId }: BlueprintPickerProps) {
  const [blueprints, setBlueprints] = useState<BlueprintEntry[]>([]);
  const [suggestions, setSuggestions] = useState<CronSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cron/blueprints")
      .then((r) => r.json())
      .then((data) => {
        setBlueprints(data.blueprints ?? []);
        setSuggestions(data.suggestions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => blueprints.find((b) => b.key === selectedKey) ?? null,
    [blueprints, selectedKey]
  );

  const selectBlueprint = useCallback((bp: BlueprintEntry) => {
    setSelectedKey(bp.key);
    setMessage("");
    setError("");
    const defaults: Record<string, string> = {};
    for (const f of bp.fields) {
      if (f.default != null && f.default !== "") defaults[f.name] = String(f.default);
    }
    setValues(defaults);
  }, []);

  async function handleSchedule() {
    if (!selected) return;
    setScheduling(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/cron/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprintKey: selected.key,
          agentId,
          values,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule");
      setMessage(
        `Scheduled "${data.name}" — next run ${new Date(data.scheduledAt).toLocaleString()}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to schedule");
    } finally {
      setScheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading automations…
      </div>
    );
  }

  const categories = Array.from(new Set(blueprints.map((b) => b.category))).sort();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Automation blueprints
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Recurring tasks ported from AYRA cron (adapted from Hermes). Pick one, customize, then
          schedule — runs via brain worker + Telegram delivery.
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{cat}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {blueprints
              .filter((b) => b.category === cat)
              .map((bp) => (
                <button
                  key={bp.key}
                  type="button"
                  onClick={() => selectBlueprint(bp)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    selectedKey === bp.key
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border hover:bg-muted/20"
                  }`}
                >
                  <p className="font-medium text-sm">{bp.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{bp.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      <CalendarClock className="mr-1 h-3 w-3" />
                      {bp.scheduleHuman}
                    </Badge>
                    {bp.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ))}

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selected.title}</CardTitle>
            <CardDescription>{selected.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`bp-${field.name}`}>{field.label}</Label>
                {field.type === "enum" || field.type === "weekdays" ? (
                  <Select
                    value={values[field.name] ?? field.default ?? ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
                  >
                    <SelectTrigger id={`bp-${field.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "time" ? (
                  <Input
                    id={`bp-${field.name}`}
                    type="time"
                    value={values[field.name] ?? field.default ?? "08:00"}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`bp-${field.name}`}
                    value={values[field.name] ?? field.default ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  />
                )}
                {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button onClick={handleSchedule} disabled={scheduling} className="gap-2">
                {scheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Scheduling…
                  </>
                ) : (
                  "Schedule automation"
                )}
              </Button>
              {message && (
                <span className="flex items-center gap-1 text-xs text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {message}
                </span>
              )}
              {error && (
                <span className="flex items-center gap-1 text-xs text-red-400">
                  <XCircle className="h-3.5 w-3.5" /> {error}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/5 p-4">
          <p className="text-xs font-medium">Quick-start suggestions</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {suggestions.map((s) => (
              <li key={s.key}>
                <strong className="text-foreground">{s.title}</strong> — {s.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
