/**
 * Automation blueprints — parameterized recurring agent tasks.
 * Ported from hermes-agent cron/blueprint_catalog.py (Hermes → AYRA).
 */

import type { AutomationBlueprint, BlueprintSlot } from "./types";

const TIME = (defaultTime = "08:00"): BlueprintSlot => ({
  name: "time",
  type: "time",
  label: "What time?",
  default: defaultTime,
  help: "24h local time, e.g. 08:00",
});

const DELIVER: BlueprintSlot = {
  name: "deliver",
  type: "enum",
  label: "Where to deliver?",
  default: "telegram",
  options: ["telegram", "internal"],
  strict: false,
  help: "telegram = notify via Telegram; internal = run only",
};

export const BLUEPRINT_CATALOG: AutomationBlueprint[] = [
  {
    key: "morning-brief",
    title: "Morning briefing",
    description:
      "A short daily briefing: today's calendar, weather, and anything urgent waiting on you.",
    category: "daily",
    scheduleTemplate: "{minute} {hour} * * *",
    promptTemplate:
      "Produce a concise morning briefing for the user: today's calendar events, the local weather, and any urgent items. Keep it short and scannable. If no data sources are connected, give a brief good-morning with the date and offer to connect calendar/email.",
    slots: [TIME("08:00"), DELIVER],
    tags: ["daily", "briefing"],
  },
  {
    key: "important-mail",
    title: "Important-mail monitor",
    description:
      "Check your inbox periodically and ping you ONLY about mail that actually needs attention.",
    category: "email",
    scheduleTemplate: "*/{interval_min} * * * *",
    promptTemplate:
      "Check the user's inbox for new messages since the last run. Surface ONLY mail matching: {criteria}. Deliver only what clears the bar; if nothing does, respond with [SILENT]. Requires a connected mail source; if none is configured, explain how to connect one and stop.",
    slots: [
      {
        name: "interval_min",
        type: "enum",
        label: "How often?",
        default: "30",
        options: ["15", "30", "60"],
        help: "minutes between checks",
      },
      {
        name: "criteria",
        type: "text",
        label: "Only notify me if the mail…",
        default: "needs a reply today, is from my manager or family, or mentions a deadline",
      },
      DELIVER,
    ],
    tags: ["email", "monitor"],
  },
  {
    key: "weekly-review",
    title: "Weekly review",
    description: "A weekly recap: what got done, what's still open, and what's coming up.",
    category: "weekly",
    scheduleTemplate: "{minute} {hour} * * {dow}",
    promptTemplate:
      "Produce a weekly review for the user: what was accomplished this week, still-open items, and next week's calendar. Pull from connected sources. Keep it tight.",
    slots: [
      TIME("18:00"),
      {
        name: "day",
        type: "enum",
        label: "Which day?",
        default: "sunday",
        options: ["sunday", "monday", "friday", "saturday"],
      },
      DELIVER,
    ],
    tags: ["weekly", "review"],
  },
  {
    key: "workday-start",
    title: "Workday start reminder",
    description: "A weekday nudge with your agenda and top priorities.",
    category: "daily",
    scheduleTemplate: "{minute} {hour} * * 1-5",
    promptTemplate:
      "Give the user a brief weekday start-of-day nudge: today's calendar and the 1-3 highest-priority things to focus on, inferred from recent context and any task tools. Encouraging, short, one message.",
    slots: [TIME("09:00"), DELIVER],
    tags: ["daily", "focus"],
  },
  {
    key: "custom-reminder",
    title: "Custom reminder",
    description: "A recurring reminder in your own words, on your schedule.",
    category: "general",
    scheduleTemplate: "{minute} {hour} * * {dow}",
    promptTemplate: "Remind the user: {what}",
    slots: [
      {
        name: "what",
        type: "text",
        label: "Remind me to…",
        default: "take a break and stretch",
      },
      TIME("14:00"),
      {
        name: "recurrence",
        type: "weekdays",
        label: "Repeat on",
        default: "everyday",
        options: ["everyday", "weekdays", "weekends"],
      },
      DELIVER,
    ],
    tags: ["reminder"],
  },
  {
    key: "evening-winddown",
    title: "Evening wind-down",
    description: "End-of-day check-in: tomorrow's calendar and anything to prep tonight.",
    category: "daily",
    scheduleTemplate: "{minute} {hour} * * *",
    promptTemplate:
      "Give the user a short evening wind-down: tomorrow's calendar, any early commitments to prep for, and one gentle nudge to wrap up loose ends from today. Keep it calm and brief — one message.",
    slots: [TIME("21:00"), DELIVER],
    tags: ["daily", "evening"],
  },
  {
    key: "news-digest",
    title: "Topic news digest",
    description: "Recurring digest on a topic — only genuinely new items.",
    category: "general",
    scheduleTemplate: "{minute} {hour} * * {dow}",
    promptTemplate:
      "Search the web for new and noteworthy items about: {topic}. Dedupe against what you sent in previous runs — only include genuinely new developments. Deliver a tight digest of at most {count} bullets, each one line with a link. If nothing new since last run, respond with [SILENT].",
    slots: [
      {
        name: "topic",
        type: "text",
        label: "What topic?",
        default: "AI and technology",
      },
      TIME("18:00"),
      {
        name: "recurrence",
        type: "weekdays",
        label: "Repeat on",
        default: "weekdays",
        options: ["everyday", "weekdays", "weekends"],
      },
      {
        name: "count",
        type: "enum",
        label: "How many bullets?",
        default: "5",
        options: ["3", "5", "8"],
      },
      DELIVER,
    ],
    tags: ["digest", "research"],
    skills: ["web-search", "news-digest"],
  },
  {
    key: "habit-checkin",
    title: "Habit check-in",
    description: "Recurring nudge to keep a habit on track.",
    category: "general",
    scheduleTemplate: "{minute} {hour} * * {dow}",
    promptTemplate:
      "Nudge the user about their habit: {habit}. Ask whether they did it today, keep it warm and non-judgmental. One short message.",
    slots: [
      {
        name: "habit",
        type: "text",
        label: "Which habit?",
        default: "20 minutes of reading",
      },
      TIME("20:00"),
      {
        name: "recurrence",
        type: "weekdays",
        label: "Repeat on",
        default: "everyday",
        options: ["everyday", "weekdays", "weekends"],
      },
      DELIVER,
    ],
    tags: ["habit", "wellbeing"],
  },
  {
    key: "learn-daily",
    title: "Daily learning drip",
    description: "One bite-sized lesson a day on a topic you want to learn.",
    category: "daily",
    scheduleTemplate: "{minute} {hour} * * {dow}",
    promptTemplate:
      "Teach the user one bite-sized lesson about: {topic}. Build on earlier lessons so it progresses. Keep it to a couple of short paragraphs with one concrete example.",
    slots: [
      {
        name: "topic",
        type: "text",
        label: "Learn about…",
        default: "Solana development",
      },
      TIME("08:30"),
      {
        name: "recurrence",
        type: "weekdays",
        label: "Repeat on",
        default: "weekdays",
        options: ["everyday", "weekdays", "weekends"],
      },
      DELIVER,
    ],
    tags: ["learning", "daily"],
  },
  {
    key: "on-this-day",
    title: "On-this-day discovery",
    description: "Daily dose of curiosity: history, fact, or word of the day.",
    category: "daily",
    scheduleTemplate: "{minute} {hour} * * *",
    promptTemplate:
      "Give the user one interesting '{flavor}' item for today — short, surprising, genuinely interesting. One or two sentences.",
    slots: [
      {
        name: "flavor",
        type: "enum",
        label: "What kind?",
        default: "on this day in history",
        options: ["on this day in history", "word of the day", "science fact", "quote of the day"],
      },
      TIME("07:30"),
      DELIVER,
    ],
    tags: ["daily", "curiosity"],
  },
];

const catalogByKey = new Map(BLUEPRINT_CATALOG.map((b) => [b.key, b]));

export function getBlueprint(key: string): AutomationBlueprint | undefined {
  return catalogByKey.get(key);
}

export function listBlueprintCategories(): string[] {
  return Array.from(new Set(BLUEPRINT_CATALOG.map((b) => b.category))).sort();
}
