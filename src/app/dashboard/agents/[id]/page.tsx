"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  Clock,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  AgentRunControl,
  agentDisplayStatusLabel,
  agentDisplayStatusVariant,
} from "@/components/agents/agent-run-control";
import type { AgentDisplayStatus } from "@/lib/agent/display-status";
import { RunsList } from "@/components/agents/runs-list";
import { LogsViewer } from "@/components/logs/logs-viewer";
import { BlueprintPicker } from "@/components/agents/blueprint-picker";
import { SkillPicker } from "@/components/skills/skill-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { scheduleLabel, getNextRunTime } from "@/lib/agent/scheduler";

interface Agent {
  id: string;
  name: string;
  description?: string | null;
  template?: string;
  status: string;
  model: string;
  effectiveChatModel?: string;
  effectiveImageModel?: string;
  imageModel?: string | null;
  schedule: string;
  systemPrompt: string;
  memoryEnabled: boolean;
  telegramNotify: boolean;
  autoPostX: boolean;
  skills: Array<{ skill: { id: string; name: string; slug: string; category: string; description: string; icon: string; isEnabled: boolean } }>;
  runs: Array<{ id: string; status: string; startedAt: string; durationMs?: number | null; tokenUsage: number; toolCalls: number; summary?: string | null; error?: string | null; output?: string | null }>;
  memories: Array<{ id: string; content: string; tags: string[]; createdAt: string }>;
  _count: { runs: number; logs: number; memories: number };
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [allSkills, setAllSkills] = useState<Array<Agent["skills"][0]["skill"]>>([]);
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [logs, setLogs] = useState<Array<Parameters<typeof LogsViewer>[0]["logs"][0]>>([]);
  const [loading, setLoading] = useState(true);
  const [displayStatus, setDisplayStatus] = useState<AgentDisplayStatus>("idle");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    description: "",
    systemPrompt: "",
  });
  const [profileDirty, setProfileDirty] = useState(false);

  const loadAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}`);
    if (res.ok) {
      const data = await res.json();
      setAgent(data);
      setSkillSlugs(data.skills.map((s: Agent["skills"][0]) => s.skill.slug));
      setProfileDraft({
        name: data.name ?? "",
        description: data.description ?? "",
        systemPrompt: data.systemPrompt ?? "",
      });
      setProfileDirty(false);
      setSkillsDirty(false);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then(setAllSkills);
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}/logs`);
    if (res.ok) setLogs(await res.json());
  }, [id]);

  useEffect(() => {
    loadAgent();
    loadLogs();
  }, [loadAgent, loadLogs]);

  async function refreshAgent() {
    await loadAgent();
    await loadLogs();
  }

  async function handleToggleAutoPostX(enabled: boolean) {
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoPostX: enabled }),
    });
    loadAgent();
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileDraft),
    });
    setSavingProfile(false);
    if (res.ok) await loadAgent();
  }

  async function handleSaveSkills() {
    setSavingSkills(true);
    const res = await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillSlugs }),
    });
    setSavingSkills(false);
    if (res.ok) {
      await loadAgent();
    }
  }

  function handleSkillChange(slugs: string[]) {
    setSkillSlugs(slugs);
    setSkillsDirty(true);
  }

  if (loading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (!agent) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Agent not found</p>
        <Link href="/dashboard/agents">
          <Button variant="outline" className="mt-4">Back to agents</Button>
        </Link>
      </div>
    );
  }

  const latestRun = agent.runs[0];
  const nextRun = getNextRunTime(agent.schedule as Parameters<typeof getNextRunTime>[0]);
  const statusVariant = agentDisplayStatusVariant(displayStatus);
  const isCustom = (agent.template ?? "custom") === "custom";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agent"
        title={agent.name}
        description={agent.description || "No description"}
        action={
          <AgentRunControl
            agentId={id}
            status={agent.status}
            latestRun={latestRun}
            onUpdated={refreshAgent}
            onDisplayStatusChange={setDisplayStatus}
          />
        }
      />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/agents" className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to agents
        </Link>
        <Badge variant={statusVariant} className="capitalize">
          {agentDisplayStatusLabel(displayStatus)}
        </Badge>
        {!isCustom && (
          <Badge variant="outline" className="text-[11px]">
            Template
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 font-medium capitalize">
                    {agentDisplayStatusLabel(displayStatus)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total runs</p>
                  <p className="mt-1 font-medium">{agent._count.runs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="mt-1 font-medium">{scheduleLabel(agent.schedule as Parameters<typeof scheduleLabel>[0])}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Next run</p>
                  <p className="mt-1 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {nextRun ? nextRun.toLocaleString() : "Manual"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {latestRun && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Latest result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={latestRun.status === "COMPLETED" ? "success" : latestRun.status === "FAILED" ? "destructive" : "warning"}>
                      {latestRun.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(latestRun.startedAt)}</span>
                  </div>
                  <p className="text-sm">{latestRun.summary || latestRun.output || latestRun.error || "No output"}</p>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="mb-3 font-medium">Enabled skills</h3>
              <div className="flex flex-wrap gap-2">
                {agent.skills.filter((s) => s.skill).map((s) => (
                  <Badge key={s.skill.slug} variant="outline">{s.skill.name}</Badge>
                ))}
                {agent.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">No skills attached</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="runs">
            <RunsList runs={agent.runs} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsViewer logs={logs} />
          </TabsContent>

          <TabsContent value="automations" className="space-y-4">
            <BlueprintPicker agentId={id} />
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <SkillPicker
              skills={allSkills}
              selectedSlugs={skillSlugs}
              onChange={handleSkillChange}
              readOnly={!isCustom}
            />
            {isCustom && skillsDirty && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSkillSlugs(agent.skills.map((s) => s.skill.slug));
                    setSkillsDirty(false);
                  }}
                >
                  Reset
                </Button>
                <Button onClick={handleSaveSkills} disabled={savingSkills}>
                  {savingSkills ? "Saving..." : "Save skills"}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="memory">
            {agent.memories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No memories stored</p>
                  <p className="mt-1 text-sm text-muted-foreground/60">Memories are created when the agent uses the Memory Storage skill</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {agent.memories.map((mem) => (
                  <Card key={mem.id}>
                    <CardContent className="p-4">
                      <p className="text-sm">{mem.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {mem.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                        ))}
                        <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(mem.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardContent className="space-y-4 p-6">
                {!isCustom && (
                  <p className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                    This is a fixed office template. To customize name, prompt, or skills, create a{" "}
                    <Link href="/dashboard/agents/new" className="text-primary underline-offset-2 hover:underline">
                      custom agent (New Hire)
                    </Link>
                    .
                  </p>
                )}

                {isCustom ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="agent-name">Name</Label>
                      <Input
                        id="agent-name"
                        value={profileDraft.name}
                        onChange={(e) => {
                          setProfileDraft((p) => ({ ...p, name: e.target.value }));
                          setProfileDirty(true);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-desc">Description</Label>
                      <Input
                        id="agent-desc"
                        value={profileDraft.description}
                        onChange={(e) => {
                          setProfileDraft((p) => ({ ...p, description: e.target.value }));
                          setProfileDirty(true);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-prompt">System prompt</Label>
                      <Textarea
                        id="agent-prompt"
                        value={profileDraft.systemPrompt}
                        onChange={(e) => {
                          setProfileDraft((p) => ({ ...p, systemPrompt: e.target.value }));
                          setProfileDirty(true);
                        }}
                        rows={8}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Operates under AYRA identity — office rules are enforced automatically.
                      </p>
                    </div>
                    {profileDirty && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setProfileDraft({
                              name: agent.name,
                              description: agent.description ?? "",
                              systemPrompt: agent.systemPrompt,
                            });
                            setProfileDirty(false);
                          }}
                        >
                          Reset
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={savingProfile}>
                          {savingProfile ? "Saving..." : "Save profile"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{agent.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">System prompt</p>
                      <pre className="max-h-48 overflow-y-auto rounded-lg bg-secondary/50 p-4 text-xs whitespace-pre-wrap">
                        {agent.systemPrompt}
                      </pre>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-xs text-muted-foreground">Chat & image models</p>
                  <p className="mt-1 font-medium font-mono text-sm">
                    {agent.effectiveChatModel ?? agent.model}
                  </p>
                  {(agent.effectiveImageModel ?? agent.imageModel) && (
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      Image: {agent.effectiveImageModel ?? agent.imageModel}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Managed in{" "}
                    <Link href="/dashboard/settings" className="text-primary underline-offset-2 hover:underline">
                      Settings → LLM
                    </Link>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Memory</p>
                  <p className="font-medium">{agent.memoryEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telegram notifications</p>
                  <p className="font-medium">{agent.telegramNotify ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                  <div>
                    <p className="text-sm font-medium">Auto-post to X</p>
                    <p className="text-xs text-muted-foreground">
                      Also enable Settings → Allow auto-post, connect X, and attach the X Post skill.
                    </p>
                  </div>
                  <Switch checked={agent.autoPostX} onCheckedChange={handleToggleAutoPostX} />
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (confirm("Delete this agent? This cannot be undone.")) {
                      await fetch(`/api/agents/${id}`, { method: "DELETE" });
                      router.push("/dashboard/agents");
                    }
                  }}
                >
                  Delete agent
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
