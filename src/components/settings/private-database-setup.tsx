"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Database, Info, Loader2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildPrivateDatabaseUrl,
  maskDatabaseUrl,
  PRIVATE_DB_DEFAULTS,
  type PrivateDbProvider,
  describeDatabaseHost,
} from "@/lib/brain/build-pg-url";
import {
  SUPABASE_POOLER_REGIONS,
  detectSupabaseUrlKind,
  normalizePrivateDatabaseUrl,
  upgradeSupabaseDirectToPooler,
} from "@/lib/brain/normalize-pg-url";

type InputMode = "wizard" | "url";

export interface PrivateDatabaseConnectResult {
  brainDatabaseUrl: string;
  hasBrainDatabaseUrl: boolean;
  host?: string;
  message?: string;
}

interface PrivateDatabaseSetupProps {
  /** Draft URL while editing (empty when connected and not changing). */
  value: string;
  onChange: (url: string) => void;
  configured?: boolean;
  /** Saved URL from server — used for masked display only. */
  savedUrl?: string | null;
  /** Called after Connect succeeds (URL is auto-saved on the server). */
  onConnected?: (result: PrivateDatabaseConnectResult) => void;
  /** Solo self-host — may use same Postgres as platform DATABASE_URL */
  allowPlatformBrainDb?: boolean;
}

export function PrivateDatabaseSetup({
  value,
  onChange,
  configured,
  savedUrl,
  onConnected,
  allowPlatformBrainDb = false,
}: PrivateDatabaseSetupProps) {
  const [editing, setEditing] = useState(!configured);
  const [mode, setMode] = useState<InputMode>("url");
  const [provider, setProvider] = useState<PrivateDbProvider>("supabase");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("postgres");
  const [projectRef, setProjectRef] = useState("");
  const [supabaseRegion, setSupabaseRegion] = useState("eu-central-1");
  const [neonHost, setNeonHost] = useState("");
  const [neonUser, setNeonUser] = useState("neondb_owner");
  const [customHost, setCustomHost] = useState("");
  const [customPort, setCustomPort] = useState("");
  const [customUser, setCustomUser] = useState("postgres");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");
  /** Region for converting Supabase direct (IPv6) URLs in paste mode. */
  const [pasteSupabaseRegion, setPasteSupabaseRegion] = useState("ap-southeast-1");

  const builtUrl = useMemo(
    () =>
      buildPrivateDatabaseUrl({
        provider,
        password,
        database,
        projectRef,
        supabaseRegion,
        neonHost,
        neonUser,
        customHost,
        customPort,
        customUser,
      }),
    [
      provider,
      password,
      database,
      projectRef,
      supabaseRegion,
      neonHost,
      neonUser,
      customHost,
      customPort,
      customUser,
    ]
  );

  const pastedSupabaseKind = useMemo(
    () => (mode === "url" && value.trim() ? detectSupabaseUrlKind(value) : "other"),
    [mode, value]
  );

  const convertedPoolerPreview = useMemo(() => {
    if (pastedSupabaseKind !== "direct" || !value.trim()) return null;
    return upgradeSupabaseDirectToPooler(value.trim(), pasteSupabaseRegion);
  }, [pastedSupabaseKind, value, pasteSupabaseRegion]);

  const urlToConnect = useMemo(() => {
    if (mode === "wizard") return builtUrl;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (pastedSupabaseKind === "direct") return trimmed;
    return normalizePrivateDatabaseUrl(trimmed);
  }, [mode, builtUrl, value, pastedSupabaseKind]);

  function switchProvider(next: PrivateDbProvider) {
    setProvider(next);
    const defaults = PRIVATE_DB_DEFAULTS[next];
    setDatabase(defaults.database ?? "postgres");
    if (defaults.neonUser) setNeonUser(defaults.neonUser);
    if (defaults.customPort) setCustomPort(defaults.customPort);
    if (defaults.customUser) setCustomUser(defaults.customUser);
    setConnectError("");
    setConnectSuccess("");
  }

  function startEditing() {
    setEditing(true);
    onChange("");
    setMode("url");
    setPassword("");
    setProjectRef("");
    setSupabaseRegion("eu-central-1");
    setNeonHost("");
    setCustomHost("");
    setPasteSupabaseRegion("ap-southeast-1");
    setConnectError("");
    setConnectSuccess("");
  }

  function cancelEditing() {
    if (configured) {
      setEditing(false);
      onChange("");
      setConnectError("");
      setConnectSuccess("");
    }
  }

  async function handleConnect() {
    if (!urlToConnect) {
      setConnectError("Enter or build a Postgres URL first.");
      return;
    }

    setConnecting(true);
    setConnectError("");
    setConnectSuccess("");

    try {
      const payload: { url: string; supabaseRegion?: string } = { url: urlToConnect };
      if (mode === "url" && pastedSupabaseKind === "direct") {
        payload.supabaseRegion = pasteSupabaseRegion;
      }

      const res = await fetch("/api/settings/private-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");

      setEditing(false);
      onChange("");
      setPassword("");
      setConnectSuccess(data.message || "Private database connected");
      onConnected?.({
        hasBrainDatabaseUrl: true,
        brainDatabaseUrl: data.brainDatabaseUrl,
        host: data.host,
        message: data.message,
      });
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  if (configured && savedUrl && !editing) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-emerald-50">Private database connected</p>
            <p className="text-xs text-muted-foreground">
              Chat and brain data are stored in <strong>your</strong> Postgres — not shared with
              other users.
            </p>
            <p className="break-all font-mono text-[11px] text-foreground/80">
              {maskDatabaseUrl(savedUrl)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Host: {describeDatabaseHost(savedUrl)}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={startEditing}>
          Change database URL
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground/90">Recommended: database server in Germany</p>
        <p className="mt-1 leading-relaxed">
          For lower latency, we recommend hosting your private Postgres in{" "}
          <strong className="text-foreground/90">Germany</strong> (e.g. Supabase region{" "}
          <code className="text-[11px] text-foreground/80">eu-central-1</code>, Neon{" "}
          <code className="text-[11px] text-foreground/80">eu-central-1</code>). Other regions
          (Singapore, US, etc.) still work but may feel slower for chat and brain tasks.
        </p>
      </div>

      {configured && editing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          <span>Paste a new URL and click Connect to replace your current private database.</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditing}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("url");
            setConnectError("");
          }}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            mode === "url"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          Paste full URL
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("wizard");
            setConnectError("");
          }}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            mode === "wizard"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          Setup wizard
        </button>
      </div>

      {mode === "wizard" ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Create a <strong className="text-foreground/90">new empty</strong> database on your own
            Supabase / Neon account — not the AYRA platform database.
          </div>

          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => switchProvider(v as PrivateDbProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supabase">Supabase (recommended)</SelectItem>
                <SelectItem value="neon">Neon</SelectItem>
                <SelectItem value="custom">Other / self-hosted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "supabase" && (
            <>
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground/90">Supabase setup</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Open{" "}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      supabase.com/dashboard
                    </a>{" "}
                    → <strong>New project</strong> → we recommend region{" "}
                    <strong>Europe (Frankfurt) / eu-central-1</strong>
                  </li>
                  <li>
                    <strong>Settings → General</strong> → copy <strong>Reference ID</strong>
                  </li>
                  <li>
                    <strong>Settings → Database</strong> → copy your <strong>database password</strong>
                  </li>
                  <li>Fill the form → click <strong>Connect</strong></li>
                </ol>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="supabase-ref">Project Reference ID *</Label>
                  <Input
                    id="supabase-ref"
                    value={projectRef}
                    onChange={(e) => setProjectRef(e.target.value)}
                    placeholder="your-project-ref"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supabase-password">Database password *</Label>
                  <Input
                    id="supabase-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your Supabase database password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supabase-db">Database name</Label>
                  <Input
                    id="supabase-db"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="postgres"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="supabase-region">Pooler region *</Label>
                  <Select value={supabaseRegion} onValueChange={setSupabaseRegion}>
                    <SelectTrigger id="supabase-region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPABASE_POOLER_REGIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label} ({r.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Must match your Supabase project region. Host looks like{" "}
                    <code className="text-foreground/80">
                      aws-0-{supabaseRegion || "eu-central-1"}.pooler.supabase.com
                    </code>
                    . Singapore = <strong className="text-foreground/90">ap-southeast-1</strong> (not
                    eu-ap-southeast-1).
                  </p>
                </div>
              </div>
            </>
          )}

          {provider === "neon" && (
            <>
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground/90">Neon setup</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Open{" "}
                    <a
                      href="https://console.neon.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      console.neon.tech
                    </a>{" "}
                    → Create project
                  </li>
                  <li>
                    We recommend <strong>Europe (Frankfurt) / eu-central-1</strong> for the project
                    region
                  </li>
                  <li>Copy host, password, and database name from Connection details</li>
                  <li>Fill the form → click <strong>Connect</strong></li>
                </ol>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="neon-host">Host *</Label>
                  <Input
                    id="neon-host"
                    value={neonHost}
                    onChange={(e) => setNeonHost(e.target.value)}
                    placeholder="ep-xxxx.eu-central-1.aws.neon.tech"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Recommended: <strong className="text-foreground/90">eu-central-1</strong>{" "}
                    (Germany) for lower latency.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neon-user">User</Label>
                  <Input
                    id="neon-user"
                    value={neonUser}
                    onChange={(e) => setNeonUser(e.target.value)}
                    placeholder="neondb_owner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neon-password">Password *</Label>
                  <Input
                    id="neon-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="neon-db">Database name</Label>
                  <Input
                    id="neon-db"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="neondb"
                  />
                </div>
              </div>
            </>
          )}

          {provider === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="custom-host">Host *</Label>
                <Input
                  id="custom-host"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="db.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-user">User</Label>
                <Input
                  id="custom-user"
                  value={customUser}
                  onChange={(e) => setCustomUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-password">Password *</Label>
                <Input
                  id="custom-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-port">Port (optional)</Label>
                <Input
                  id="custom-port"
                  value={customPort}
                  placeholder="default if empty"
                  onChange={(e) => setCustomPort(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-db">Database *</Label>
                <Input
                  id="custom-db"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                />
              </div>
            </div>
          )}

          {builtUrl ? (
            <div className="space-y-2">
              <div className="rounded-md border border-border/60 bg-background/50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Preview URL
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-foreground/90">
                  {maskDatabaseUrl(builtUrl)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-500/90">
              Complete all required fields (*) — then click Connect.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="brain-database-url">Postgres connection URL *</Label>
          <Input
            id="brain-database-url"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setConnectError("");
              setConnectSuccess("");
            }}
            placeholder="postgresql://postgres:password@db.your-ref.supabase.co/postgres"
            className="font-mono text-xs"
          />
          {pastedSupabaseKind === "direct" && (
            <div className="space-y-3 rounded-lg border border-amber-500/35 bg-amber-500/8 p-4">
              <div className="flex gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-amber-100">Direct Supabase URL detected (IPv6-only)</p>
                  <p className="leading-relaxed text-muted-foreground">
                    Host <code className="text-foreground/85">db.*.supabase.co</code> usually has no IPv4
                    address — most VPS and home networks cannot connect. Pick your Supabase project
                    region below; AYRA converts to Session pooler (IPv4) automatically.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paste-supabase-region">Supabase project region *</Label>
                <Select value={pasteSupabaseRegion} onValueChange={setPasteSupabaseRegion}>
                  <SelectTrigger id="paste-supabase-region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPABASE_POOLER_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label} ({r.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {convertedPoolerPreview && (
                <div className="rounded-md border border-border/60 bg-background/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Will connect via (IPv4 pooler)
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-foreground/90">
                    {maskDatabaseUrl(convertedPoolerPreview)}
                  </p>
                </div>
              )}
            </div>
          )}
          {pastedSupabaseKind === "pooler" && (
            <div className="flex gap-2 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
              <p className="leading-relaxed">
                Session pooler URL detected (IPv4). If Connect fails with a DNS error, paste the{" "}
                <strong className="text-foreground/90">direct</strong> URI from Supabase (
                <code className="text-foreground/85">db.[ref].supabase.co</code>) instead — AYRA
                will convert it using your project region.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {allowPlatformBrainDb ? (
              <>
                Solo / self-host: paste platform <code className="text-[11px]">DATABASE_URL</code> or{" "}
                <code className="text-[11px]">DIRECT_DATABASE_URL</code>. For Supabase, the direct URL (
                <code className="text-[11px]">db.*.supabase.co</code>) is fine — pick region when prompted.
              </>
            ) : (
              <>
                <strong>Supabase tip:</strong> paste the direct URI from Settings → Database (
                <code className="text-[11px]">db.[ref].supabase.co</code>) — not the pooler string if
                DNS fails. Select your project region and AYRA uses IPv4 Session pooler under the hood.
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleConnect}
          disabled={connecting || !urlToConnect}
          className="gap-2"
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            "Connect"
          )}
        </Button>
        {connectSuccess && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {connectSuccess}
          </span>
        )}
        {connectError && (
          <span className="flex items-center gap-1 text-xs text-red-400">
            <XCircle className="h-3.5 w-3.5" />
            {connectError}
          </span>
        )}
      </div>
    </div>
  );
}
