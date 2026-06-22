import tls from "tls";
import { z } from "zod";
import type { SkillDefinition } from "./base";
import { fetchText, stripHtml } from "./helpers";

function getSslExpiry(host: string, port = 443): Promise<{ validTo: Date; daysLeft: number }> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert.valid_to) {
        reject(new Error("No certificate found"));
        return;
      }
      const validTo = new Date(cert.valid_to);
      const daysLeft = Math.floor((validTo.getTime() - Date.now()) / 86400000);
      resolve({ validTo, daysLeft });
    });
    socket.on("error", reject);
    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error("SSL check timeout"));
    });
  });
}

export const sslMonitor: SkillDefinition = {
  id: "ssl-monitor",
  name: "SSL Monitor",
  slug: "ssl-monitor",
  category: "Website",
  description: "Check SSL certificate expiry for a domain.",
  icon: "shield",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("HTTPS URL to check"),
  }),
  async execute(input, ctx) {
    const host = new URL(input.url).hostname;
    await ctx.log("INFO", `SSL check: ${host}`, "ssl-monitor");
    const { validTo, daysLeft } = await getSslExpiry(host);
    const status = daysLeft < 0 ? "expired" : daysLeft < 14 ? "critical" : daysLeft < 30 ? "warning" : "ok";
    return { host, validTo: validTo.toISOString(), daysLeft, status, ok: daysLeft >= 0 };
  },
};

export const domainExpiryMonitor: SkillDefinition = {
  id: "domain-expiry-monitor",
  name: "Domain Expiry Monitor",
  slug: "domain-expiry-monitor",
  category: "Website",
  description: "Look up domain registration via RDAP.",
  icon: "calendar",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    domain: z.string().min(3).describe("Domain name e.g. example.com"),
  }),
  async execute(input, ctx) {
    const domain = input.domain.replace(/^https?:\/\//, "").split("/")[0];
    await ctx.log("INFO", `RDAP lookup: ${domain}`, "domain-expiry-monitor");
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
    });
    if (!res.ok) throw new Error(`RDAP ${res.status}`);
    const data = (await res.json()) as {
      events?: Array<{ eventAction: string; eventDate: string }>;
    };
    const expiry = data.events?.find((e) => e.eventAction === "expiration")?.eventDate;
    return { domain, expiry: expiry ?? null, events: data.events ?? [], ok: !!expiry };
  },
};

export const performanceAudit: SkillDefinition = {
  id: "performance-audit",
  name: "Performance Audit",
  slug: "performance-audit",
  category: "Website",
  description: "Measure page load latency and response size.",
  icon: "gauge",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("URL to audit"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Performance audit: ${input.url}`, "performance-audit");
    const start = Date.now();
    const response = await fetch(input.url, { redirect: "follow" });
    const body = await response.text();
    const latencyMs = Date.now() - start;
    const rating = latencyMs < 800 ? "fast" : latencyMs < 2500 ? "moderate" : "slow";
    return {
      url: input.url,
      status: response.status,
      latencyMs,
      sizeBytes: body.length,
      rating,
      ok: response.ok,
    };
  },
};

export const seoAudit: SkillDefinition = {
  id: "seo-audit",
  name: "SEO Audit",
  slug: "seo-audit",
  category: "Website",
  description: "Basic SEO check — title, meta description, headings.",
  icon: "bar-chart",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("Page URL"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `SEO audit: ${input.url}`, "seo-audit");
    const html = await fetchText(input.url);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const metaDesc =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
      "";
    const h1Count = (html.match(/<h1/gi) ?? []).length;
    const issues: string[] = [];
    if (!title) issues.push("Missing title tag");
    if (title.length > 60) issues.push("Title may be too long");
    if (!metaDesc) issues.push("Missing meta description");
    if (h1Count === 0) issues.push("No H1 found");
    if (h1Count > 1) issues.push("Multiple H1 tags");
    return {
      url: input.url,
      title: stripHtml(title),
      metaDescription: metaDesc,
      h1Count,
      issues,
      score: Math.max(0, 100 - issues.length * 20),
      ok: issues.length === 0,
    };
  },
};
