"use client";

import { useEffect, useState, Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelPicker } from "@/components/agents/model-picker";
import { DEFAULT_MODEL, DEFAULT_IMAGE_MODEL } from "@/lib/models";
import { DEFAULT_LLM_BASE_URL } from "@/lib/llm-config";
import { TELEGRAM_COMMANDS_UI } from "@/lib/telegram/commands";
import { PrivateDatabaseSetup } from "@/components/settings/private-database-setup";
import { XManualKeysGuide } from "@/components/settings/x-manual-keys-guide";

interface AgentOption {
  id: string;
  name: string;
  status: string;
}

interface XConnection {
  connected?: boolean;
  verified?: boolean;
  authMethod?: string | null;
  username?: string | null;
  connectedAt?: string | null;
  autoPostEnabled?: boolean;
}

interface Settings {
  name?: string | null;
  email?: string | null;
  defaultModel?: string;
  defaultImageModel?: string;
  llmBaseUrl?: string | null;
  effectiveLlmBaseUrl?: string;
  telegramChatId?: string | null;
  telegramChatEnabled?: boolean;
  telegramDefaultAgentId?: string | null;
  emailNotifications?: boolean;
  telegramNotifications?: boolean;
  xAutoPostEnabled?: boolean;
  solanaDefaultRpc?: string | null;
  agents?: AgentOption[];
  webhookUrl?: string | null;
  telegramPollingMode?: boolean;
  webhookStatus?: string;
  xConnection?: XConnection;
  xOAuthConfigured?: boolean;
  xOAuthCallbackUrl?: string;
  hasOpenRouterKey?: boolean;
  hasLlmApiKey?: boolean;
  hasTelegramToken?: boolean;
  hasXCredentials?: boolean;
  hasXApiKey?: boolean;
  hasXApiSecret?: boolean;
  hasXAccessToken?: boolean;
  hasXAccessSecret?: boolean;
  hasSolanaRpcApiKey?: boolean;
  hasBrainDatabaseUrl?: boolean;
}

async function fetchSettingsData(): Promise<Settings> {
  const res = await fetch("/api/settings");
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Settings API returned ${res.status} (expected JSON)`);
  }
  const data = (await res.json()) as Settings & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Failed to load settings (${res.status})`);
  }
  return data;
}

function SecretField({
  id,
  label,
  value,
  onChange,
  configured,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  configured?: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const masked = configured && !value && !editing;
  const displayValue = masked ? "••••••••••••••••" : value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {configured && (
          <span className="shrink-0 text-xs font-medium text-emerald-500">Saved ✓</span>
        )}
      </div>
      <Input
        id={id}
        type="password"
        value={displayValue}
        onFocus={() => {
          if (configured && !value) setEditing(true);
        }}
        onBlur={() => {
          if (!value) setEditing(false);
        }}
        onChange={(e) => {
          setEditing(true);
          onChange(e.target.value);
        }}
        placeholder={configured ? undefined : placeholder}
        readOnly={masked}
        className={masked ? "text-muted-foreground" : undefined}
      />
      {configured && !editing && !value && (
        <p className="text-xs text-muted-foreground">
          Saved. Type a new value only if you want to replace this key.
        </p>
      )}
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showXAdvanced, setShowXAdvanced] = useState(false);
  const [disconnectingX, setDisconnectingX] = useState(false);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [xApiKey, setXApiKey] = useState("");
  const [xApiSecret, setXApiSecret] = useState("");
  const [xAccessToken, setXAccessToken] = useState("");
  const [xAccessSecret, setXAccessSecret] = useState("");
  const [solanaRpcApiKey, setSolanaRpcApiKey] = useState("");
  const [brainDatabaseUrl, setBrainDatabaseUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const xStatus = searchParams.get("x");
    const xError = searchParams.get("x_error");
    const handle = searchParams.get("handle");
    if (xStatus === "connected") {
      setMessage(`X connected as @${handle || "user"}`);
    } else if (xError) {
      setMessage(`X login failed: ${xError}`);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSettingsData()
      .then(setSettings)
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  async function disconnectX() {
    if (!confirm("Disconnect X account from AYRA Agent?")) return;
    setDisconnectingX(true);
    await fetch("/api/x/disconnect", { method: "POST" });
    const refreshed = await fetchSettingsData();
    setSettings(refreshed);
    setMessage("X account disconnected");
    setDisconnectingX(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    if (!settings.hasBrainDatabaseUrl && !brainDatabaseUrl.trim()) {
      setMessage("Private Database (AYRA) is required. Paste your Postgres connection URL above.");
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      name: settings.name,
      defaultModel: settings.defaultModel,
      defaultImageModel: settings.defaultImageModel,
      llmBaseUrl: settings.llmBaseUrl ?? "",
      telegramChatId: settings.telegramChatId,
      telegramChatEnabled: settings.telegramChatEnabled,
      telegramDefaultAgentId: settings.telegramDefaultAgentId,
      emailNotifications: settings.emailNotifications,
      telegramNotifications: settings.telegramNotifications,
      xAutoPostEnabled: settings.xAutoPostEnabled,
      solanaDefaultRpc: settings.solanaDefaultRpc,
    };
    if (llmApiKey) body.llmApiKey = llmApiKey;
    if (telegramToken) body.telegramBotToken = telegramToken;
    if (xApiKey) body.xApiKey = xApiKey;
    if (xApiSecret) body.xApiSecret = xApiSecret;
    if (xAccessToken) body.xAccessToken = xAccessToken;
    if (xAccessSecret) body.xAccessSecret = xAccessSecret;
    if (solanaRpcApiKey) body.solanaRpcApiKey = solanaRpcApiKey;
    if (brainDatabaseUrl.trim()) body.brainDatabaseUrl = brainDatabaseUrl.trim();

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Settings saved");
      setLlmApiKey("");
      setTelegramToken("");
      setXApiKey("");
      setXApiSecret("");
      setXAccessToken("");
      setXAccessSecret("");
      setSolanaRpcApiKey("");
      setBrainDatabaseUrl("");
      const refreshed = await fetchSettingsData();
      setSettings(refreshed);
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage(err.error || "Failed to save settings");
    }
  }

  if (loading) {
    return <p className="text-[13px] text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage profile, model defaults, and notification integrations."
      />

      {!settings.hasBrainDatabaseUrl && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-50">Private Database (AYRA) is required</p>
          <p className="mt-1 text-xs text-amber-100/80">
            Connect your Postgres URL below before using chat, brain tasks, or agents. Dashboard access is
            limited to this page until it is saved.
          </p>
        </div>
      )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card id="private-database">
            <CardHeader>
              <CardTitle className="text-base">
                Private Database (AYRA) <span className="text-destructive">*</span>
              </CardTitle>
              <CardDescription>
                {settings.hasBrainDatabaseUrl
                  ? "Private Postgres connected — chat history, brain tasks & calendar live in your database"
                  : "Required — paste your Postgres connection URL so chat and brain data stay in your database"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PrivateDatabaseSetup
                value={brainDatabaseUrl}
                onChange={setBrainDatabaseUrl}
                configured={settings.hasBrainDatabaseUrl}
              />
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-muted-foreground space-y-2">
                <p className="text-sm font-medium text-foreground">After you save</p>
                <p>
                  AYRA automatically creates{" "}
                  <code className="text-foreground/80">chat_session</code>,{" "}
                  <code className="text-foreground/80">chat_message</code>, and{" "}
                  <code className="text-foreground/80">brain_task</code> tables — no Prisma or manual
                  migrations required.
                </p>
                <p>
                  See{" "}
                  <code className="text-foreground/80">docs/private-database.md</code> in the repo.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={settings.name || ""}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={settings.email || ""} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">LLM Provider</CardTitle>
              <CardDescription>
                Configure base URL, API key, and default models. Default provider is OpenRouter — use any
                OpenAI-compatible endpoint (Ollama, Together, Groq, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-base-url">Base URL</Label>
                <Input
                  id="llm-base-url"
                  value={settings.llmBaseUrl ?? ""}
                  onChange={(e) => setSettings({ ...settings, llmBaseUrl: e.target.value })}
                  placeholder={DEFAULT_LLM_BASE_URL}
                />
                <p className="text-xs text-muted-foreground">
                  OpenAI-compatible API root. Leave empty for OpenRouter (
                  <code className="text-[11px]">{DEFAULT_LLM_BASE_URL}</code>
                  ). Examples: Ollama{" "}
                  <code className="text-[11px]">http://localhost:11434/v1</code>, Together{" "}
                  <code className="text-[11px]">https://api.together.xyz/v1</code>
                </p>
              </div>
              <SecretField
                id="llm-api-key"
                label="API Key"
                value={llmApiKey}
                onChange={setLlmApiKey}
                configured={settings.hasLlmApiKey ?? settings.hasOpenRouterKey}
                placeholder="sk-or-... or provider API key"
              />
              <ModelPicker
                value={settings.defaultModel || DEFAULT_MODEL}
                onChange={(defaultModel) => setSettings({ ...settings, defaultModel })}
                label="Chat model"
                tiers={["free", "standard", "premium"]}
                showHint={false}
              />
              <ModelPicker
                value={settings.defaultImageModel || DEFAULT_IMAGE_MODEL}
                onChange={(defaultImageModel) => setSettings({ ...settings, defaultImageModel })}
                label="Image model"
                tiers={["image-free", "image"]}
                presetFallback={DEFAULT_IMAGE_MODEL}
                customLabel="Custom image model (optional)"
                showHint={false}
              />
              <p className="text-xs text-muted-foreground">
                Models sync with your Telegram default agent. Use{" "}
                <code className="text-[11px]">/model</code>,{" "}
                <code className="text-[11px]">/imagemodel</code>, or{" "}
                <code className="text-[11px]">/status</code> in Telegram to verify.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Telegram</CardTitle>
              <CardDescription>
                {settings.hasTelegramToken
                  ? "Bot token configured ✓ — notifications + chat commands"
                  : "Add bot token from @BotFather for notifications and chat"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SecretField
                id="telegram-token"
                label="Bot Token"
                value={telegramToken}
                onChange={setTelegramToken}
                configured={settings.hasTelegramToken}
                placeholder="Bot token from @BotFather"
              />
              <div className="space-y-2">
                <Label htmlFor="telegram-chat">Chat ID</Label>
                <Input
                  id="telegram-chat"
                  value={settings.telegramChatId || ""}
                  onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                  placeholder="Your Telegram chat ID (or send /start to auto-link)"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div>
                  <p className="text-sm font-medium">Telegram chat commands</p>
                  <p className="text-xs text-muted-foreground">Reply to messages and run your default agent</p>
                </div>
                <Switch
                  checked={settings.telegramChatEnabled ?? true}
                  onCheckedChange={(v) => setSettings({ ...settings, telegramChatEnabled: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default agent for Telegram</Label>
                <Select
                  value={settings.telegramDefaultAgentId || "auto"}
                  onValueChange={(v) =>
                    setSettings({
                      ...settings,
                      telegramDefaultAgentId: v === "auto" ? null : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Latest active agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Latest active agent</SelectItem>
                    {(settings.agents ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">How to use</p>
                <p>Send any message to your bot → agent runs and replies.</p>
                <div>
                  <p className="font-medium text-foreground/90 mb-1">Commands</p>
                  <ul className="space-y-0.5">
                    {TELEGRAM_COMMANDS_UI.map((item) => (
                      <li key={item.cmd}>
                        <code className="text-[11px] text-foreground/80">{item.cmd}</code>
                        {" — "}
                        {item.desc}
                      </li>
                    ))}
                  </ul>
                </div>
                {settings.telegramPollingMode ? (
                  <p className="text-amber-400/90">Local dev: run `npm run worker` in a separate terminal (TELEGRAM_POLLING=true)</p>
                ) : settings.webhookUrl ? (
                  <p className="break-all">Webhook: {settings.webhookUrl}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">X (Twitter)</CardTitle>
              <CardDescription>
                Login with X so agents can read profiles, timelines, and post autonomously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.xConnection?.connected ? (
                <div
                  className={`rounded-lg border p-4 ${
                    settings.xConnection.verified
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  {settings.xConnection.verified && settings.xConnection.username ? (
                    <p className="text-sm font-medium text-emerald-400">
                      Connected as @{settings.xConnection.username}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-amber-400">
                        X keys saved but not verified
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Missing username usually means incomplete or invalid manual keys. Disconnect,
                        then use <strong>Connect with X</strong> (recommended) or re-save all 4 keys
                        with <strong>Read + Write</strong> permissions from developer.x.com.
                      </p>
                    </>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Method: {settings.xConnection.authMethod === "oauth2" ? "OAuth login" : "Manual keys"}
                  </p>
                  {settings.xOAuthConfigured && settings.xConnection.authMethod !== "oauth2" && (
                    <Link href="/api/x/connect" className="mt-3 inline-block">
                      <Button type="button" size="sm" className="gap-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white">
                        Switch to Connect with X
                      </Button>
                    </Link>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 ml-0 sm:ml-2"
                    disabled={disconnectingX}
                    onClick={disconnectX}
                  >
                    {disconnectingX ? "Disconnecting..." : "Disconnect X"}
                  </Button>
                </div>
              ) : settings.xOAuthConfigured ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect X — agents can lookup @handles, read timelines, and post when auto-post is on.
                  </p>
                  <Link href="/api/x/connect">
                    <Button type="button" className="gap-2 bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white">
                      Connect with X
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
                  <p className="font-medium text-amber-400/90">X OAuth is not configured on the server</p>
                  <p className="text-xs text-muted-foreground">
                    Admin: set <code className="text-[11px]">X_CLIENT_ID</code> and{" "}
                    <code className="text-[11px]">X_CLIENT_SECRET</code> in <code className="text-[11px]">.env</code>, then restart the server.
                  </p>
                  {settings.xOAuthCallbackUrl && (
                    <p className="text-xs text-muted-foreground break-all">
                      Callback URL (register at developer.x.com):{" "}
                      <span className="text-foreground">{settings.xOAuthCallbackUrl}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div>
                  <p className="text-sm font-medium">Allow auto-post to X</p>
                  <p className="text-xs text-muted-foreground">Off by default. Agent must also enable auto-post.</p>
                </div>
                <Switch
                  checked={settings.xAutoPostEnabled ?? false}
                  onCheckedChange={(v) => setSettings({ ...settings, xAutoPostEnabled: v })}
                />
              </div>

              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setShowXAdvanced((v) => !v)}
              >
                {showXAdvanced ? "Hide" : "Show"} manual API keys (advanced)
              </button>
              {!showXAdvanced && (
                <p className="text-xs text-muted-foreground">
                  Manual setup: X Developer Portal → Read and write → 4 keys. Guide opens when you expand
                  above.
                </p>
              )}

              {showXAdvanced && (
                <div className="grid gap-4 sm:grid-cols-2 border-t border-border/40 pt-4">
                  <XManualKeysGuide />
                  <SecretField
                    id="x-api-key"
                    label="API Key"
                    value={xApiKey}
                    onChange={setXApiKey}
                    configured={settings.hasXApiKey}
                  />
                  <SecretField
                    id="x-api-secret"
                    label="API Secret"
                    value={xApiSecret}
                    onChange={setXApiSecret}
                    configured={settings.hasXApiSecret}
                  />
                  <SecretField
                    id="x-access-token"
                    label="Access Token"
                    value={xAccessToken}
                    onChange={setXAccessToken}
                    configured={settings.hasXAccessToken}
                  />
                  <SecretField
                    id="x-access-secret"
                    label="Access Secret"
                    value={xAccessSecret}
                    onChange={setXAccessSecret}
                    configured={settings.hasXAccessSecret}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Solana</CardTitle>
              <CardDescription>
                RPC for wallet & token skills. Premium providers (Helius, QuickNode) need an API key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="solana-rpc">Default RPC URL</Label>
                <Input
                  id="solana-rpc"
                  value={settings.solanaDefaultRpc || ""}
                  onChange={(e) => setSettings({ ...settings, solanaDefaultRpc: e.target.value })}
                  placeholder="https://mainnet.helius-rpc.com"
                />
                <p className="text-xs text-muted-foreground">
                  Examples: Helius, QuickNode, Alchemy. Leave empty to use server default.
                </p>
              </div>
              <SecretField
                id="solana-rpc-key"
                label="RPC API Key"
                value={solanaRpcApiKey}
                onChange={setSolanaRpcApiKey}
                configured={settings.hasSolanaRpcApiKey}
                placeholder="Helius / QuickNode API key"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Telegram notifications</p>
                  <p className="text-xs text-muted-foreground">Receive alerts via Telegram</p>
                </div>
                <Switch
                  checked={settings.telegramNotifications ?? true}
                  onCheckedChange={(v) => setSettings({ ...settings, telegramNotifications: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
                <Switch
                  checked={settings.emailNotifications ?? false}
                  onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {message && <p className="text-sm text-primary">{message}</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </form>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            <CardDescription>Permanently delete your account and all agents</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={async () => {
                if (confirm("Delete your account? All agents, runs, and data will be permanently removed.")) {
                  await fetch("/api/settings", { method: "DELETE" });
                  signOut({ callbackUrl: "/" });
                }
              }}
            >
              Delete account
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-[13px] text-muted-foreground">Loading settings...</p>}>
      <SettingsContent />
    </Suspense>
  );
}
