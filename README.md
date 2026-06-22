# AYRA Agent

**Build and run AI agents for Solana devs and token builders.**

AYRA Agent is a developer-focused platform (Hermes-style autonomous agents) specialized for **Solana**, **token projects**, and **X (Twitter)** workflows. Track wallets, research tokens on-chain, draft or auto-post to X, get Telegram alerts, and extend via skills — without building the agent stack from scratch.

## Features

- **Agent builder** — Templates: Solana Token Scout, X Growth Agent, Dev Launch Assistant
- **Solana skills** — Wallet tracker, token tracker, token research, RPC monitor
- **X skills** — Draft generator, thread drafter, viral topics, optional auto-post (opt-in)
- **Agent runtime** — OpenRouter-powered execution with tool calling, timeouts, and rate limits
- **Scheduling** — Manual, 5min, 15min, hourly, or daily runs via worker process
- **Logs & runs** — Terminal-style log viewer and run history with token usage
- **Memory** — Persistent agent memory with search
- **Notifications** — Telegram alerts on run completion
- **Security** — Encrypted credentials, rate limits, max tool calls, explicit permissions

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion
- Prisma + PostgreSQL
- NextAuth (credentials)
- OpenRouter API
- Telegram Bot API
- node-cron (scheduler)
- Zod
- PM2 compatible

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenRouter API key (optional for dev — set in env or user settings)

### Environment Setup

```bash
cp .env.example .env
```

Fill in the required values (same file for dev and production — production notes are inline in `.env.example`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (use pooler port 6543 + `pgbouncer=true` for Supabase) |
| `DIRECT_DATABASE_URL` | Direct/session URL for Prisma migrations (Supabase port 5432) |
| `NEXTAUTH_SECRET` | Random secret for session encryption |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` dev, `https://your-domain.com` prod) |
| `ENCRYPTION_KEY` | 32+ char key for credential encryption |
| `X_CLIENT_ID` | X OAuth 2.0 Client ID — enables **Connect with X** in Settings |
| `X_CLIENT_SECRET` | X OAuth 2.0 Client Secret |
| `X_CALLBACK_URL` | OAuth callback (`http://localhost:3000/api/x/callback` dev) |
| `OPENROUTER_API_KEY` | Optional global fallback (users set own key in Settings) |
| `TELEGRAM_BOT_TOKEN` | Optional default Telegram bot |
| `TELEGRAM_POLLING` | `true` for local Telegram chat (run worker); `false` in production |

**Supabase:** use the transaction pooler (`6543` + `pgbouncer=true`) for `DATABASE_URL` and the session pooler (`5432`) for `DIRECT_DATABASE_URL`. Copy exact hosts from Supabase Dashboard → Connect.

**X OAuth:** create an app at [developer.x.com](https://developer.x.com), enable OAuth 2.0, set callback to `X_CALLBACK_URL`, and add scopes `tweet.read`, `tweet.write`, `users.read`, `offline.access`.

### Install & Database

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Running Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Running Worker

The worker process handles scheduled agent runs:

```bash
npm run worker
```

Run alongside the dev server in a separate terminal.

**Important:** Only run **one** worker instance. A second worker causes duplicate Telegram replies.

The worker also runs **AYRA alerts** when `AYRA_ALERTS_ENABLED=true` (see `.env.example`).
Enable per-user in Dashboard → Settings → **Auto AYRA alerts**.

### Running with PM2

```bash
npm run build
pm2 start ecosystem.config.js
```

This starts both the Next.js web server and the agent worker.

## Adding New Skills

1. Create a skill file in `src/lib/skills/` implementing the `SkillDefinition` interface:

```typescript
import { z } from "zod";
import type { SkillDefinition } from "./base";

export const mySkill: SkillDefinition = {
  id: "my-skill",
  name: "My Skill",
  slug: "my-skill",
  category: "Developer",
  description: "What it does",
  icon: "zap",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({ input: z.string() }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Running my skill", "my-skill");
    return { result: "done" };
  },
};
```

2. Register it in `src/lib/skills/index.ts` (`WORKING_SKILLS` array)
3. Add to `ALL_SKILL_DEFINITIONS` for the marketplace
4. Run `npm run prisma:seed` to sync to database

## Safety Model

- API keys are never exposed to the frontend
- Tool credentials are encrypted at rest with AES-256-GCM
- Rate limits on API routes (60 req/min default)
- Max tool calls per run (default: 5)
- Run timeout (default: 60 seconds)
- No shell execution by default
- All agent actions are logged
- Tool permissions must be explicitly enabled per agent
- X Draft Generator never auto-posts

## Working Skills (v1)

| Skill | Category | Status |
|-------|----------|--------|
| Website Health Check | Website | ✅ Working |
| Telegram Notify | Notification | ✅ Working |
| RSS Reader | Research | ✅ Working |
| Solana RPC Monitor | Crypto | ✅ Working |
| Memory Storage | Agent Core | ✅ Working |
| Memory Search | Agent Core | ✅ Working |
| X Draft Generator | Social | ✅ Working (draft only) |
| GitHub Repo Analyzer | Developer | ✅ Placeholder |

## Future Integrations

- Discord, Slack, and email notifications
- GitHub API integration for repo analysis
- BullMQ + Redis for distributed job queue
- Webhook triggers
- Custom skill SDK
- Team workspaces
- API key management for external access

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Seed skills to database |
| `npm run worker` | Start agent scheduler worker |

## License

Private — All rights reserved.
