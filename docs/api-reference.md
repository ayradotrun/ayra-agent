# API reference

AYRA exposes REST APIs under `/api/*`. All dashboard routes require an authenticated session (NextAuth cookie) unless noted.

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/request` | Request email verification code |
| POST | `/api/auth/register/verify` | Verify code + create account |
| POST | `/api/auth/register` | Legacy register (if enabled) |
| POST | `/api/auth/forgot-password` | Send password reset code |
| POST | `/api/auth/reset-password` | Reset password with code |
| * | `/api/auth/[...nextauth]` | NextAuth sign-in / sign-out |

Sign in via `/login` (credentials provider). Set `NEXTAUTH_URL` to your public HTTPS URL on production VPS.

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Read settings flags (no raw secrets) |
| PATCH | `/api/settings` | Update profile, models, toggles |
| POST | `/api/settings/private-database` | Connect private Postgres |
| GET/POST | `/api/settings/secrets` | Encrypted secret fields |
| GET | `/api/settings/models` | Available LLM models |
| POST | `/api/settings/test-llm` | Test LLM key |

## Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/chat/sessions` | List or create sessions |
| GET/PATCH/DELETE | `/api/chat/sessions/[id]` | Session CRUD |
| GET/POST | `/api/chat/sessions/[id]/messages` | Messages (POST runs agent) |
| POST | `/api/chat/upload` | Image upload for chat |

## Agents & skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/agents` | List or create agents |
| GET/PATCH/DELETE | `/api/agents/[id]` | Agent CRUD |
| POST | `/api/agents/[id]/run` | Run agent once |
| GET | `/api/agents/[id]/runs` | Run history |
| GET | `/api/skills` | Skill catalog |
| GET | `/api/dashboard` | Overview stats |

## Telegram & X

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/telegram/status` | Bot status |
| POST | `/api/telegram/webhook/[secret]` | Webhook receiver |
| GET | `/api/x/connect` | Start X OAuth |
| GET | `/api/x/callback` | OAuth callback |

## Errors

- `401` — not signed in
- `403` — forbidden (wrong user or not admin)
- `400` — validation error (check JSON body)
- `500` — server error (check worker logs and `.env`)

See [Troubleshooting](/docs/troubleshooting) and [FAQ](/docs/faq).
