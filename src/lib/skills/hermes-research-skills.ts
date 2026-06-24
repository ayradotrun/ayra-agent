/**
 * Research & market skills ported from Hermes skill bundles.
 */

import { z } from "zod";
import type { SkillDefinition } from "./base";
import { fetchText } from "./helpers";

const GAMMA = "https://gamma-api.polymarket.com";

function parseJsonField(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

function fmtPct(price: string): string {
  const n = Number.parseFloat(price);
  return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : price;
}

function fmtVolume(vol: unknown): string {
  const v = Number.parseFloat(String(vol ?? 0));
  if (!Number.isFinite(v)) return String(vol ?? "");
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export const polymarketSearch: SkillDefinition = {
  id: "polymarket-search",
  name: "Polymarket Search",
  slug: "polymarket-search",
  category: "Research",
  description:
    "Search Polymarket prediction markets — odds, volume, event probabilities (read-only).",
  icon: "bar-chart-2",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query (event, topic, question)"),
    limit: z.number().min(1).max(10).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Polymarket search: ${input.query}`, "polymarket-search");
    const limit = input.limit ?? 5;
    const url = `${GAMMA}/public-search?q=${encodeURIComponent(input.query)}`;
    const raw = await fetchText(url);
    const data = JSON.parse(raw) as {
      events?: Array<{
        title?: string;
        slug?: string;
        markets?: Array<Record<string, unknown>>;
      }>;
    };

    const markets: Array<{
      question: string;
      slug?: string;
      prices: string;
      volume: string;
      closed?: boolean;
    }> = [];

    for (const event of data.events ?? []) {
      for (const m of event.markets ?? []) {
        if (markets.length >= limit) break;
        const prices = parseJsonField(m.outcomePrices);
        const outcomes = parseJsonField(m.outcomes);
        let priceStr = "";
        if (Array.isArray(prices) && prices.length >= 2) {
          const labels = Array.isArray(outcomes) ? outcomes : ["Yes", "No"];
          priceStr = prices
            .slice(0, 2)
            .map((p, i) => `${labels[i] ?? (i === 0 ? "Yes" : "No")}: ${fmtPct(String(p))}`)
            .join(" / ");
        }
        markets.push({
          question: String(m.question ?? event.title ?? "?"),
          slug: String(m.slug ?? event.slug ?? ""),
          prices: priceStr,
          volume: fmtVolume(m.volume),
          closed: Boolean(m.closed),
        });
      }
    }

    return {
      ok: markets.length > 0,
      query: input.query,
      markets,
      count: markets.length,
      source: "polymarket-gamma-api",
    };
  },
};

export const polymarketTrending: SkillDefinition = {
  id: "polymarket-trending",
  name: "Polymarket Trending",
  slug: "polymarket-trending",
  category: "Research",
  description: "Top trending Polymarket events by volume.",
  icon: "trending-up",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    limit: z.number().min(1).max(15).optional(),
  }),
  async execute(input, ctx) {
    const limit = input.limit ?? 8;
    await ctx.log("INFO", "Polymarket trending", "polymarket-trending");
    const url = `${GAMMA}/events?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`;
    const raw = await fetchText(url);
    const events = JSON.parse(raw) as Array<{
      title?: string;
      slug?: string;
      volume?: number;
      markets?: Array<Record<string, unknown>>;
    }>;

    const items = (Array.isArray(events) ? events : []).slice(0, limit).map((e) => ({
      title: e.title ?? "?",
      slug: e.slug,
      volume24h: fmtVolume(e.volume),
      topMarket: e.markets?.[0]?.question,
    }));

    return { ok: items.length > 0, items, count: items.length };
  },
};

export const HERMES_RESEARCH_SKILLS = [polymarketSearch, polymarketTrending];
