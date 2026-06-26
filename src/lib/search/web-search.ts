import { stripHtml } from "@/lib/skills/helpers";
import { resolveJinaApiKey } from "@/lib/search/jina-api-key";

export interface WebSearchResult {
  query: string;
  summary: string | null;
  sourceUrl: string | null;
  related: Array<{ title: string; url?: string; snippet?: string }>;
  provider?: string;
  ok: boolean;
  error?: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function jinaAuthHeaders(apiKey?: string): Record<string, string> {
  if (!apiKey?.trim()) return {};
  return { Authorization: `Bearer ${apiKey.trim()}` };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function resolveBingRedirectUrl(href: string): string {
  const decoded = decodeHtmlEntities(href);
  if (!decoded.includes("bing.com/ck/a")) return decoded;

  const match = decoded.match(/[?&]u=([^&]+)/i);
  if (!match) return decoded;

  try {
    let encoded = decodeURIComponent(match[1]);
    if (encoded.startsWith("a1")) encoded = encoded.slice(2);
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return decoded;
  }
}

function looksLikeDomain(query: string): string | null {
  const trimmed = query.trim().replace(/^https?:\/\//i, "").split(/[/?#\s]/)[0];
  if (!trimmed || trimmed.includes("@")) return null;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return null;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "AYRA-Agent/1.0",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Agent-Reach style web search via Jina Reader (s.jina.ai).
 * Fetches top results with page content as markdown — no Exa/mcporter required.
 * @see https://github.com/Panniantong/Agent-Reach
 */
export function parseJinaSearchMarkdown(
  markdown: string,
  maxResults: number
): Pick<WebSearchResult, "summary" | "sourceUrl" | "related"> {
  const related: Array<{ title: string; url?: string; snippet?: string }> = [];
  const blocks = markdown.split(/\n(?=Title:\s)/i).filter((b) => b.trim());

  for (const block of blocks) {
    const title = block.match(/^Title:\s*(.+)$/im)?.[1]?.trim();
    const url =
      block.match(/^URL Source:\s*(.+)$/im)?.[1]?.trim() ||
      block.match(/^URL:\s*(.+)$/im)?.[1]?.trim();
    const contentMatch = block.match(/Markdown Content:\s*\n([\s\S]*?)(?=\nTitle:\s|$)/i);
    const snippet = contentMatch?.[1]?.replace(/\s+/g, " ").trim().slice(0, 280);

    if (title) {
      related.push({ title, url: url || undefined, snippet: snippet || undefined });
    }
    if (related.length >= maxResults) break;
  }

  if (related.length === 0) {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(markdown)) && related.length < maxResults) {
      related.push({ title: match[1].trim(), url: match[2] });
    }
  }

  const first = related[0];
  const summary =
    first?.snippet ||
    markdown.replace(/^Title:[\s\S]*?Markdown Content:\s*\n/i, "").trim().slice(0, 600) ||
    null;

  return {
    summary: summary?.trim() || null,
    sourceUrl: first?.url || null,
    related,
  };
}

async function searchJina(
  query: string,
  maxResults: number,
  jinaApiKey?: string
): Promise<WebSearchResult | null> {
  const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: "text/plain",
        "User-Agent": BROWSER_UA,
        ...jinaAuthHeaders(jinaApiKey),
      },
    },
    25_000
  );

  if (!response.ok) return null;

  const text = (await response.text()).trim();
  if (!text || text.length < 40) return null;

  const parsed = parseJinaSearchMarkdown(text, maxResults);
  if (parsed.related.length === 0 && !parsed.summary) return null;

  return {
    query,
    summary: parsed.summary,
    sourceUrl: parsed.sourceUrl,
    related: parsed.related,
    provider: "jina",
    ok: true,
  };
}

/** Agent-Reach style page read via Jina Reader (r.jina.ai). */
async function readJinaPage(
  pageUrl: string,
  jinaApiKey?: string
): Promise<{ title: string; excerpt: string; url: string } | null> {
  const target = normalizeUrl(pageUrl);
  const jinaUrl = `https://r.jina.ai/${target}`;
  const response = await fetchWithTimeout(
    jinaUrl,
    {
      headers: {
        Accept: "text/plain",
        "User-Agent": BROWSER_UA,
        ...jinaAuthHeaders(jinaApiKey),
      },
    },
    25_000
  );
  if (!response.ok) return null;

  const text = (await response.text()).trim();
  if (!text) return null;

  const title = text.match(/^Title:\s*(.+)$/im)?.[1]?.trim() || target;
  const body = text.replace(/^Title:[^\n]*\n?/im, "").trim();
  const excerpt = body.slice(0, 500);

  return { title, excerpt, url: target };
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResult | null> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const related = (data.RelatedTopics ?? [])
    .filter((topic) => topic.Text)
    .slice(0, maxResults)
    .map((topic) => ({ title: topic.Text!, url: topic.FirstURL }));

  if (!data.AbstractText && related.length === 0) return null;

  return {
    query,
    summary: data.AbstractText || null,
    sourceUrl: data.AbstractURL || null,
    related,
    provider: "duckduckgo",
    ok: true,
  };
}

function parseBingHtml(html: string, maxResults: number): Array<{ title: string; url: string; snippet?: string }> {
  const results: Array<{ title: string; url: string; snippet?: string }> = [];
  const seen = new Set<string>();
  const blockRegex = /<li class="b_algo"[\s\S]*?<\/li>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) && results.length < maxResults) {
    const section = blockMatch[0];
    const titleMatch = section.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = section.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!titleMatch) continue;

    const href = resolveBingRedirectUrl(titleMatch[1]);
    if (seen.has(href)) continue;
    seen.add(href);

    const title = stripHtml(titleMatch[2]);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : undefined;
    if (title) results.push({ title, url: href, snippet });
  }

  return results;
}

async function searchBing(query: string, maxResults: number): Promise<WebSearchResult | null> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": BROWSER_UA,
    },
  });
  if (!response.ok) return null;

  const html = await response.text();
  const related = parseBingHtml(html, maxResults);
  if (related.length === 0) return null;

  return {
    query,
    summary: related[0]?.snippet || null,
    sourceUrl: related[0]?.url || null,
    related,
    provider: "bing",
    ok: true,
  };
}

async function fetchDomainSummary(
  domain: string,
  jinaApiKey?: string
): Promise<{ title: string; description: string; url: string } | null> {
  const jina = await readJinaPage(`https://${domain}`, jinaApiKey);
  if (jina) {
    return { title: jina.title, description: jina.excerpt, url: jina.url };
  }

  for (const scheme of ["https", "http"]) {
    try {
      const url = `${scheme}://${domain}`;
      const response = await fetchWithTimeout(url, {
        headers: { Accept: "text/html", "User-Agent": BROWSER_UA },
      });
      if (!response.ok) continue;

      const html = await response.text();
      const title = stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
      const description =
        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]?.trim() ||
        "";

      if (title || description) {
        return { title, description, url };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function performWebSearch(
  query: string,
  maxResults = 5,
  userId?: string
): Promise<WebSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, summary: null, sourceUrl: null, related: [], ok: false, error: "Empty search query." };
  }

  const jinaApiKey = await resolveJinaApiKey(userId);

  const domain = looksLikeDomain(trimmed);
  let domainResult: WebSearchResult | null = null;

  if (domain) {
    try {
      const site = await fetchDomainSummary(domain, jinaApiKey);
      if (site) {
        domainResult = {
          query: trimmed,
          summary: site.description || site.title,
          sourceUrl: site.url,
          related: [{ title: site.title || domain, url: site.url, snippet: site.description }],
          provider: "jina",
          ok: true,
        };
      }
    } catch (error) {
      void error;
    }
  }

  const providers: Array<() => Promise<WebSearchResult | null>> = [
    () => searchJina(trimmed, maxResults, jinaApiKey),
    () => searchBing(trimmed, maxResults),
    () => searchDuckDuckGo(trimmed, maxResults),
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) {
        if (domainResult) {
          const seen = new Set(domainResult.related.map((item) => item.url).filter(Boolean));
          const merged = [...domainResult.related];
          for (const item of result.related) {
            if (item.url && seen.has(item.url)) continue;
            merged.push(item);
            if (merged.length >= maxResults) break;
          }
          return {
            ...domainResult,
            related: merged,
            summary: domainResult.summary || result.summary,
          };
        }
        return result;
      }
    } catch (error) {
      errors.push(formatSearchFetchError(error));
    }
  }

  if (domainResult) return domainResult;

  return {
    query: trimmed,
    summary: null,
    sourceUrl: null,
    related: [],
    ok: false,
    error:
      errors.length > 0
        ? `Search unavailable (${errors[0]}). Try again later.`
        : "No results found for this query.",
  };
}

export function formatSearchFetchError(error: unknown): string {
  if (!(error instanceof Error)) return "network error";

  const cause = error.cause as { code?: string } | undefined;
  const code = cause?.code;

  if (code === "CERT_HAS_EXPIRED") return "upstream TLS certificate expired";
  if (error.name === "AbortError") return "request timed out";
  if (error.message === "fetch failed") {
    return code ? `network ${code.toLowerCase()}` : "network connection failed";
  }

  return error.message;
}
