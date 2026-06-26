# Starter kits

Quick paths to run AYRA depending on your environment.

## Local development

```bash
git clone https://github.com/ayradotrun/ayra-agent.git
cd ayra-agent
cp .env.example .env
npm install
npm run setup
npm run dev          # terminal 1
npm run worker       # terminal 2
```

Open [http://localhost:3000/register](http://localhost:3000/register).

## Docker (all-in-one)

```bash
cp .env.example .env
docker compose up --build
```

See `docker-compose.yml` for Postgres + app + worker split.

## VPS + PM2 (production)

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

One **web** + one **worker** process. See [Deployment](/docs/deployment).

## Cloud Postgres

| Provider | Platform DB (`.env`) | Private DB (Settings) |
|----------|----------------------|------------------------|
| Supabase | Project A, region X | Project B, **same region X** |
| Neon | Branch / project | Second DB, same region |

Never mix regions — see [Private database](/docs/private-database).

## Solo operator (one Postgres)

Set `AYRA_ALLOW_PLATFORM_BRAIN_DB=true` and paste `DIRECT_DATABASE_URL` in **Settings → Private Database**.

## Checklist after install

1. [Getting started](/docs/getting-started)
2. [Private database](/docs/private-database)
3. [Settings](/docs/settings)
4. [Best practices](/docs/best-practices)
