# SDK & automation

AYRA does not ship a separate npm SDK today. Automate via **REST APIs**, **webhooks**, and the **worker** process.

## REST automation

Use session cookies or run scripts from a trusted server after sign-in:

```bash
# Example: list agents (requires session cookie from browser or scripted login)
curl -s https://your-domain.com/api/agents \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

For production automation, prefer a dedicated service account user and rotate credentials.

## Worker & brain tasks

Scheduled work runs in the **private database** (`brain_task` table) and is processed by:

```bash
npm run worker
# or PM2: ayra-agent-worker
```

Agents create brain tasks via chat (“schedule a tweet tomorrow 9am UTC”). See [Agents & skills](/docs/agents-and-skills).

## Python runtime

Cron blueprints and Hermes-compatible scheduling use the Python sidecar (`python/ayra/`). Sync after repo changes:

```bash
npm run sync:python
npm run python:setup
```

See [Deployment](/docs/deployment) and `docs/ayra-cron-blueprints.md` in the GitHub repo.

## Telegram as mobile SDK

Connect Telegram in Settings — users interact with agents via bot commands documented in [Telegram bot](/docs/telegram).

## Future

A formal TypeScript SDK may be published later. Track updates in [Changelog](/docs/changelog).
