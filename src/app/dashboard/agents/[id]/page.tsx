"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Play,
  Pause,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RunsList } from "@/components/agents/runs-list";
import { LogsViewer } from "@/components/logs/logs-viewer";
import { SkillPicker } from "@/components/skills/skill-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { scheduleLabel, getNextRunTime } from "@/lib/agent/scheduler";

interface Agent {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  model: string;
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
  const [running, setRunning] = useState(false);

  const loadAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}`);
    if (res.ok) {
      const data = await res.json();
      setAgent(data);
      setSkillSlugs(data.skills.map((s: Agent["skills"][0]) => s.skill.slug));
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

  async function handleRun() {
    setRunning(true);
    await fetch(`/api/agents/${id}/run`, { method: "POST" });
    await loadAgent();
    await loadLogs();
    setRunning(false);
  }

  async function handleToggle() {
    if (!agent) return;
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: agent.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
    });
    loadAgent();
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
  const statusVariant = agent.status === "ACTIVE" ? "success" : agent.status === "PAUSED" ? "warning" : "destructive";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agent"
        title={agent.name}
        description={agent.description || "No description"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="h-9" onClick={handleToggle}>
              {agent.status === "ACTIVE" ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {agent.status === "ACTIVE" ? "Pause" : "Resume"}
            </Button>
            <Button className="h-9" onClick={handleRun} disabled={running || agent.status !== "ACTIVE"}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? "Running..." : "Run now"}
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/agents" className="inline-flex items-center text-[12px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to agents
        </Link>
        <Badge variant={statusVariant} className="capitalize">{agent.status.toLowerCase()}</Badge>
      </div>

      <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 font-medium capitalize">{agent.status.toLowerCase()}</p>
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

          <TabsContent value="skills" className="space-y-4">
            <SkillPicker
              skills={allSkills}
              selectedSlugs={skillSlugs}
              onChange={handleSkillChange}
            />
            {skillsDirty && (
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
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium">{agent.model}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Memory</p>
                  <p className="font-medium">{agent.memoryEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telegram notifications</p>
                  <p className="font-medium">{agent.telegramNotify ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Auto-post to X</p>
                  <p className="font-medium">{agent.autoPostX ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">System prompt</p>
                  <pre className="rounded-lg bg-secondary/50 p-4 text-xs whitespace-pre-wrap">{agent.systemPrompt}</pre>
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
