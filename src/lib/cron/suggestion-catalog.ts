/**
 * Starter cron suggestions — curated automations for new AYRA users.
 * Ported from hermes-agent cron/suggestion_catalog.py
 */

import type { CronSuggestionEntry } from "./types";

export const CRON_SUGGESTION_CATALOG: CronSuggestionEntry[] = [
  {
    key: "catalog:daily-briefing",
    title: "Daily briefing",
    description:
      "Every morning at 8am, a short briefing: today's calendar, weather, and anything urgent waiting on you.",
    jobSpec: {
      prompt:
        "Produce a concise morning briefing for the user: today's calendar events, the local weather, and any urgent items. Keep it short and scannable. If you have no connected data sources, give a brief general good-morning with the date.",
      schedule: "0 8 * * *",
      name: "Daily briefing",
      deliver: "telegram",
    },
  },
  {
    key: "catalog:weekly-review",
    title: "Weekly review",
    description:
      "Every Sunday evening, a recap of the week: what got done, what's still open, and what's coming up.",
    jobSpec: {
      prompt:
        "Produce a weekly review for the user: summarize what was accomplished this week, list still-open items, and preview next week's calendar. Keep it tight.",
      schedule: "0 18 * * 0",
      name: "Weekly review",
      deliver: "telegram",
    },
  },
  {
    key: "catalog:standup-reminder",
    title: "Workday start reminder",
    description: "A weekday nudge at 9am with your day's agenda and top priorities.",
    jobSpec: {
      prompt:
        "Give the user a brief weekday start-of-day nudge: their calendar for today and the 1-3 highest-priority things to focus on. Encouraging, short, one message.",
      schedule: "0 9 * * 1-5",
      name: "Workday start reminder",
      deliver: "telegram",
    },
  },
  {
    key: "catalog:solana-digest",
    title: "Solana market digest",
    description: "Daily digest of trending Solana tokens and notable on-chain activity.",
    jobSpec: {
      prompt:
        "Use trending-tokens and web-search skills to produce a concise Solana market digest. Max 5 bullets with links. If nothing notable, respond with [SILENT]. Not financial advice.",
      schedule: "0 9 * * *",
      name: "Solana market digest",
      deliver: "telegram",
    },
  },
];

export function getCronSuggestion(key: string): CronSuggestionEntry | undefined {
  return CRON_SUGGESTION_CATALOG.find((e) => e.key === key);
}
