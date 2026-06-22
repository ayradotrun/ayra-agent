import { stripHtml } from "@/lib/skills/helpers";

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

    const url = resolveBingRedirectUrl(titleMatch[1]);
    if (seen.has(url)) continue;
    seen.add(url);

    const title = stripHtml(titleMatch[2]);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : undefined;
    if (title) results.push({ title, url, snippet });
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

async function fetchDomainSummary(domain: string): Promise<{ title: string; description: string; url: string } | null> {
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

export async function performWebSearch(query: string, maxResults = 5): Promise<WebSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, summary: null, sourceUrl: null, related: [], ok: false, error: "Empty search query." };
  }

  const domain = looksLikeDomain(trimmed);
  let domainResult: WebSearchResult | null = null;

  if (domain) {
    try {
      const site = await fetchDomainSummary(domain);
      if (site) {
        domainResult = {
          query: trimmed,
          summary: site.description || site.title,
          sourceUrl: site.url,
          related: [{ title: site.title || domain, url: site.url, snippet: site.description }],
          provider: "direct",
          ok: true,
        };
      }
    } catch (error) {
      // Continue to web search providers.
      void error;
    }
  }

  const providers: Array<() => Promise<WebSearchResult | null>> = [
    () => searchDuckDuckGo(trimmed, maxResults),
    () => searchBing(trimmed, maxResults),
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
