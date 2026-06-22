import { prisma } from "@/lib/prisma";
import { callOpenRouter } from "@/lib/openrouter";
import { buildLlmCallParams } from "@/lib/llm-config";
import { getDecryptedUserKey } from "@/lib/user-keys";

export async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "AYRA-Agent/1.0",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGithubRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export async function githubApi<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "AYRA-Agent",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchUserLlmParams(userId: string, modelOverride?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { llmBaseUrl: true, openRouterApiKey: true, defaultModel: true },
  });
  return buildLlmCallParams(user ?? {}, getDecryptedUserKey(user?.openRouterApiKey), modelOverride);
}

export async function runLlm(
  userId: string,
  system: string,
  userMessage: string,
  maxTokens = 600
): Promise<string> {
  const llm = await fetchUserLlmParams(userId);

  const response = await callOpenRouter({
    ...llm,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    maxTokens,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export async function measureUrl(url: string): Promise<{ status: number; latencyMs: number }> {
  const start = Date.now();
  const response = await fetch(url, { method: "GET", redirect: "follow" });
  return { status: response.status, latencyMs: Date.now() - start };
}
