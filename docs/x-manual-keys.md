# Connect X with manual API keys

Use this if you **cannot** use **Connect with X** (OAuth) — for example when the server admin has not set `X_CLIENT_ID` / `X_CLIENT_SECRET`.

> **Recommended:** If your AYRA instance shows a **Connect with X** button in Settings, use that instead. OAuth is easier and refreshes tokens automatically.

---

## What you need

Four values from the [X Developer Portal](https://developer.x.com/en/portal/dashboard):

| AYRA Settings field | X Developer Portal name |
|---------------------|-------------------------|
| API Key | Consumer Key / API Key |
| API Secret | Consumer Secret / API Key Secret |
| Access Token | Access Token |
| Access Secret | Access Token Secret |

**All four are required.** Auto-post also requires **Read and write** app permissions (not read-only).

---

## Step-by-step

### 1. Open the developer portal

1. Go to [developer.x.com](https://developer.x.com/en/portal/dashboard).
2. Sign in with the X account that should post tweets.
3. Create a **Project** and **App** if you do not have one yet.

### 2. Set app permissions to Read and write

1. Open your **App** → **Settings** (or **User authentication settings**).
2. Set **App permissions** to **Read and write**.
3. Save changes.

If you change permissions later, **regenerate the Access Token** (step 4).

### 3. Copy API Key and API Secret

1. In the app, open **Keys and tokens**.
2. Under **Consumer Keys**, copy:
   - **API Key** → paste into AYRA **API Key**
   - **API Key Secret** → paste into AYRA **API Secret**

If keys are hidden, use **Regenerate** only if you are OK updating all integrations.

### 4. Generate Access Token and Secret (Read + Write)

1. Still on **Keys and tokens**.
2. Under **Authentication Tokens**, click **Generate** (or **Regenerate**) for **Access Token and Secret**.
3. When prompted, choose **Read and write** (required for auto-post).
4. Copy immediately (shown once):
   - **Access Token** → AYRA **Access Token**
   - **Access Token Secret** → AYRA **Access Secret**

### 5. Paste into AYRA

1. Open **Dashboard → Settings → X (Twitter)**.
2. Click **Show manual API keys (advanced)**.
3. Paste all **four** values.
4. Click **Save settings**.

AYRA verifies the keys against the X API. On success you should see:

**Connected as @your_username**

If save fails, read the error message — usually missing keys, read-only token, or wrong copy/paste.

### 6. Enable auto-post (two switches + skill)

Auto-post is **off by default** on purpose.

1. **Settings → Allow auto-post to X** → ON  
2. **Dashboard → Agents → [your agent] → Settings tab → Auto-post to X** → ON  
3. **Agent → Skills** → enable **X Post** (and optionally X Draft Generator)

Test from Telegram:

```
/post Hello from AYRA — test tweet
```

Or ask in chat: *"post this to X: …"* — the agent uses the `x_post` tool.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Connected as @** (empty username) | Keys incomplete or invalid. Disconnect X, re-enter all 4 keys, Save again. |
| Save error: credentials rejected | Wrong keys, expired token, or read-only access token. Regenerate with **Read and write**. |
| Auto-post still saves draft only | Turn on both account + agent auto-post switches. |
| 401 / 403 from X | Regenerate tokens; confirm app is not suspended; check X API tier limits. |
| OAuth button available | Prefer **Connect with X** — no manual copy/paste. |

---

## Security notes

- Never share keys in chat, screenshots, or public repos.
- AYRA encrypts keys at rest with your instance `ENCRYPTION_KEY`.
- Use **Disconnect X** in Settings to revoke stored credentials on AYRA (revoke/regenerate on developer.x.com as well if keys were exposed).

---

## Related

- Server OAuth setup (admin): `.env.example` → `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_CALLBACK_URL`
- [Security overview](../SECURITY.md)
