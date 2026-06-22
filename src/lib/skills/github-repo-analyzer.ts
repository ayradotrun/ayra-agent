import { z } from "zod";
import type { SkillDefinition } from "./base";
import { githubApi, parseGithubRepo, runLlm } from "./helpers";

const inputSchema = z.object({
  repoUrl: z.string().describe("GitHub repository URL or owner/repo"),
});

export const githubRepoAnalyzer: SkillDefinition = {
  id: "github-repo-analyzer",
  name: "GitHub Repo Analyzer",
  slug: "github-repo-analyzer",
  category: "Research",
  description: "Analyze a GitHub repository — stats, languages, recent activity.",
  icon: "github",
  permission: "network",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const parsed =
      parseGithubRepo(input.repoUrl) ??
      (input.repoUrl.includes("/")
        ? { owner: input.repoUrl.split("/")[0], repo: input.repoUrl.split("/")[1] }
        : null);

    if (!parsed) {
      return { analyzed: false, error: "Invalid GitHub repository URL", ok: false };
    }

    const { owner, repo } = parsed;
    await ctx.log("INFO", `Analyzing repo: ${owner}/${repo}`, "github-repo-analyzer");

    const [meta, languages, issues, pulls] = await Promise.all([
      githubApi<{
        full_name: string;
        description: string | null;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        default_branch: string;
        pushed_at: string;
        html_url: string;
      }>(`/repos/${owner}/${repo}`),
      githubApi<Record<string, number>>(`/repos/${owner}/${repo}/languages`),
      githubApi<Array<{ title: string; number: number }>>(
        `/repos/${owner}/${repo}/issues?state=open&per_page=5`
      ),
      githubApi<Array<{ title: string; number: number }>>(
        `/repos/${owner}/${repo}/pulls?state=open&per_page=5`
      ),
    ]);

    let summary = "";
    try {
      summary = await runLlm(
        ctx.userId,
        "Summarize this GitHub repo for a developer team. 3-5 bullet points. Factual only.",
        `Repo: ${meta.full_name}\nDescription: ${meta.description}\nStars: ${meta.stargazers_count}\nLanguages: ${Object.keys(languages).join(", ")}\nOpen issues: ${meta.open_issues_count}`
      );
    } catch {
      summary = meta.description || "No description available.";
    }

    return {
      analyzed: true,
      repository: {
        name: meta.full_name,
        url: meta.html_url,
        description: meta.description,
        stars: meta.stargazers_count,
        forks: meta.forks_count,
        defaultBranch: meta.default_branch,
        lastPush: meta.pushed_at,
      },
      languages,
      openIssues: issues.filter((i) => !("pull_request" in i)).slice(0, 5),
      openPullRequests: pulls.slice(0, 5),
      summary,
      ok: true,
    };
  },
};
