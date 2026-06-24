/**
 * GitHub skills inspired by Hermes skills/github/* bundles.
 */

import { z } from "zod";
import type { SkillDefinition } from "./base";

const GITHUB_API = "https://api.github.com";

async function githubFetch(path: string, token?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "AYRA-Agent",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

export const githubIssueSearch: SkillDefinition = {
  id: "github-issue-search",
  name: "GitHub Issue Search",
  slug: "github-issue-search",
  category: "Developer",
  description: "Search GitHub issues in a repository (Hermes github-issues bundle).",
  icon: "github",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
    query: z.string().optional().describe("Search query (labels, text)"),
    state: z.enum(["open", "closed", "all"]).optional(),
    limit: z.number().min(1).max(30).optional(),
  }),
  async execute(input, ctx) {
    const token = process.env.GITHUB_TOKEN;
    await ctx.log("INFO", `GitHub issues: ${input.owner}/${input.repo}`, "github-issue-search");

    const state = input.state ?? "open";
    const perPage = input.limit ?? 10;
    let path = `/repos/${input.owner}/${input.repo}/issues?state=${state}&per_page=${perPage}`;

    const items = (await githubFetch(path, token)) as Array<Record<string, unknown>>;
    let filtered = items.filter((i) => !i.pull_request);

    if (input.query?.trim()) {
      const q = input.query.toLowerCase();
      filtered = filtered.filter((i) => {
        const title = String(i.title ?? "").toLowerCase();
        const body = String(i.body ?? "").toLowerCase();
        return title.includes(q) || body.includes(q);
      });
    }

    return {
      ok: true,
      repository: `${input.owner}/${input.repo}`,
      count: filtered.length,
      issues: filtered.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        url: i.html_url,
        labels: Array.isArray(i.labels)
          ? i.labels.map((l: { name?: string }) => l.name).filter(Boolean)
          : [],
      })),
    };
  },
};

export const githubRepoInfo: SkillDefinition = {
  id: "github-repo-info",
  name: "GitHub Repo Info",
  slug: "github-repo-info",
  category: "Developer",
  description: "Fetch GitHub repository metadata (Hermes github-repo-management).",
  icon: "github",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    owner: z.string().min(1),
    repo: z.string().min(1),
  }),
  async execute(input, ctx) {
    const token = process.env.GITHUB_TOKEN;
    await ctx.log("INFO", `GitHub repo: ${input.owner}/${input.repo}`, "github-repo-info");
    const data = (await githubFetch(`/repos/${input.owner}/${input.repo}`, token)) as Record<
      string,
      unknown
    >;
    return {
      ok: true,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      defaultBranch: data.default_branch,
      language: data.language,
      url: data.html_url,
    };
  },
};

export const HERMES_GITHUB_SKILLS = [githubIssueSearch, githubRepoInfo];
