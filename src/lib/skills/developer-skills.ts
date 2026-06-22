import { z } from "zod";
import type { SkillDefinition } from "./base";
import { githubApi, parseGithubRepo, runLlm, fetchText } from "./helpers";

export const githubReader: SkillDefinition = {
  id: "github-reader",
  name: "GitHub Reader",
  slug: "github-reader",
  category: "Developer",
  description: "Read GitHub issues and pull requests from a repository.",
  icon: "github",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    repo: z.string().describe("GitHub repo URL or owner/repo"),
    type: z.enum(["issues", "pulls", "both"]).optional(),
    limit: z.number().min(1).max(20).optional(),
  }),
  async execute(input, ctx) {
    const parsed = parseGithubRepo(input.repo) ?? (input.repo.includes("/") ? { owner: input.repo.split("/")[0], repo: input.repo.split("/")[1] } : null);
    if (!parsed) return { ok: false, error: "Invalid repo format" };

    const { owner, repo } = parsed;
    const limit = input.limit ?? 10;
    await ctx.log("INFO", `Reading ${owner}/${repo}`, "github-reader");

    const type = input.type ?? "both";
    const issues =
      type !== "pulls"
        ? await githubApi<Array<{ number: number; title: string; state: string; html_url: string }>>(
            `/repos/${owner}/${repo}/issues?state=open&per_page=${limit}`
          )
        : [];
    const pulls =
      type !== "issues"
        ? await githubApi<Array<{ number: number; title: string; state: string; html_url: string }>>(
            `/repos/${owner}/${repo}/pulls?state=open&per_page=${limit}`
          )
        : [];

    return {
      repository: `${owner}/${repo}`,
      issues: issues.filter((i) => !i.html_url.includes("/pull/")).slice(0, limit),
      pullRequests: pulls.slice(0, limit),
      ok: true,
    };
  },
};

export const issueAssistant: SkillDefinition = {
  id: "issue-assistant",
  name: "Issue Assistant",
  slug: "issue-assistant",
  category: "Developer",
  description: "Triage and suggest responses for GitHub issues.",
  icon: "bug",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    issueTitle: z.string().min(1),
    issueBody: z.string().optional(),
    repo: z.string().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Triaging issue", "issue-assistant");
    const triage = await runLlm(
      ctx.userId,
      "Triage a GitHub issue. Return JSON: { priority, labels, summary, suggestedReply, nextSteps }",
      `Repo: ${input.repo || "unknown"}\nTitle: ${input.issueTitle}\n\n${input.issueBody || ""}`
    );
    let parsed: Record<string, unknown> = { raw: triage };
    try {
      parsed = JSON.parse(triage.replace(/```json?\s*|\s*```/g, ""));
    } catch {
      /* keep raw */
    }
    return { ...parsed, ok: true };
  },
};

export const codeReviewAssistant: SkillDefinition = {
  id: "code-review-assistant",
  name: "Code Review Assistant",
  slug: "code-review-assistant",
  category: "Developer",
  description: "Review code snippets and suggest improvements.",
  icon: "code",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    code: z.string().min(1).describe("Code to review"),
    language: z.string().optional(),
    focus: z.string().optional().describe("Security, performance, readability, etc."),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Reviewing code", "code-review-assistant");
    const review = await runLlm(
      ctx.userId,
      "You are a senior code reviewer. Be constructive. Cover bugs, security, and clarity.",
      `Language: ${input.language || "auto"}\nFocus: ${input.focus || "general"}\n\n\`\`\`\n${input.code.slice(0, 8000)}\n\`\`\``
    );
    return { review, ok: true };
  },
};

export const errorAnalyzer: SkillDefinition = {
  id: "error-analyzer",
  name: "Error Analyzer",
  slug: "error-analyzer",
  category: "Developer",
  description: "Analyze error logs and stack traces.",
  icon: "alert-triangle",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    error: z.string().min(1).describe("Error message or stack trace"),
    context: z.string().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Analyzing error", "error-analyzer");
    const analysis = await runLlm(
      ctx.userId,
      "Analyze the error. Return: root cause, severity, fix steps, prevention. Be specific.",
      `Context: ${input.context || "none"}\n\nError:\n${input.error.slice(0, 6000)}`
    );
    return { analysis, ok: true };
  },
};

export const deploymentMonitor: SkillDefinition = {
  id: "deployment-monitor",
  name: "Deployment Monitor",
  slug: "deployment-monitor",
  category: "Developer",
  description: "Check deployment URL health and version endpoint.",
  icon: "rocket",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("Deployment or health check URL"),
    versionPath: z.string().optional().describe("Optional version endpoint path"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Checking deployment: ${input.url}`, "deployment-monitor");
    const start = Date.now();
    const response = await fetch(input.url, { redirect: "follow" });
    const latencyMs = Date.now() - start;
    let version: string | null = null;
    if (input.versionPath) {
      try {
        const vUrl = new URL(input.versionPath, input.url).toString();
        version = (await fetchText(vUrl)).slice(0, 200);
      } catch {
        version = null;
      }
    }
    return {
      url: input.url,
      status: response.status,
      latencyMs,
      healthy: response.ok,
      version,
      ok: response.ok,
    };
  },
};

export const logReader: SkillDefinition = {
  id: "log-reader",
  name: "Log Reader",
  slug: "log-reader",
  category: "Developer",
  description: "Parse and summarize log file content.",
  icon: "file-text",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    logs: z.string().min(1).describe("Log text content"),
    filter: z.string().optional().describe("Filter keyword e.g. ERROR"),
    maxLines: z.number().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Parsing logs", "log-reader");
    let lines = input.logs.split(/\r?\n/);
    if (input.filter) {
      const f = input.filter.toLowerCase();
      lines = lines.filter((l: string) => l.toLowerCase().includes(f));
    }
    lines = lines.slice(-(input.maxLines ?? 100));
    const errorCount = lines.filter((l: string) => /error|exception|fatal/i.test(l)).length;
    const warnCount = lines.filter((l: string) => /warn/i.test(l)).length;
    return {
      lineCount: lines.length,
      errors: errorCount,
      warnings: warnCount,
      sample: lines.slice(-20),
      ok: true,
    };
  },
};
