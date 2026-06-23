"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/lib/brain/build-pg-url";

type InputMode = "wizard" | "url";

interface PrivateDatabaseSetupProps {
  value: string;
  onChange: (url: string) => void;
  configured?: boolean;
}

export function PrivateDatabaseSetup({ value, onChange, configured }: PrivateDatabaseSetupProps) {
  const [mode, setMode] = useState<InputMode>("wizard");
  const [provider, setProvider] = useState<PrivateDbProvider>("supabase");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("postgres");
  const [projectRef, setProjectRef] = useState("");
  const [supabaseRegion, setSupabaseRegion] = useState("ap-southeast-1");
  const [neonHost, setNeonHost] = useState("");
  const [neonUser, setNeonUser] = useState("neondb_owner");
  const [customHost, setCustomHost] = useState("");
  const [customPort, setCustomPort] = useState("5432");
  const [customUser, setCustomUser] = useState("postgres");

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

  useEffect(() => {
    if (mode !== "wizard" || !builtUrl) return;
    onChange(builtUrl);
  }, [mode, builtUrl, onChange]);

  function switchProvider(next: PrivateDbProvider) {
    setProvider(next);
    const defaults = PRIVATE_DB_DEFAULTS[next];
    setDatabase(defaults.database ?? "postgres");
    if (defaults.supabaseRegion) setSupabaseRegion(defaults.supabaseRegion);
    if (defaults.neonUser) setNeonUser(defaults.neonUser);
    if (defaults.customPort) setCustomPort(defaults.customPort);
    if (defaults.customUser) setCustomUser(defaults.customUser);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("wizard")}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            mode === "wizard"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          Setup wizard
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            mode === "url"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          Paste full URL
        </button>
      </div>

      {mode === "wizard" ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/10 p-4">
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
                    → <strong>New project</strong>
                  </li>
                  <li>
                    <strong>Settings → General</strong> → copy <strong>Reference ID</strong> (project
                    ref)
                  </li>
                  <li>
                    <strong>Settings → Database</strong> → copy <strong>Database password</strong> (the
                    one you set when creating the project)
                  </li>
                  <li>Fill in the form below → <strong>Save settings</strong></li>
                </ol>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="supabase-ref">Project Reference ID *</Label>
                  <Input
                    id="supabase-ref"
                    value={projectRef}
                    onChange={(e) => setProjectRef(e.target.value)}
                    placeholder="abcdefghijklmnop"
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
                  <Label htmlFor="supabase-region">Pooler region</Label>
                  <Input
                    id="supabase-region"
                    value={supabaseRegion}
                    onChange={(e) => setSupabaseRegion(e.target.value)}
                    placeholder="ap-southeast-1"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Find this in your Supabase connection string:{" "}
                    <code className="text-foreground/80">aws-0-REGION.pooler.supabase.com</code>
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
                    <strong>Dashboard → Connection details</strong> → copy <strong>Host</strong> (without{" "}
                    <code>https://</code>)
                  </li>
                  <li>
                    Copy your password and database name (often <code>neondb</code>)
                  </li>
                  <li>Fill in the form below → <strong>Save settings</strong></li>
                </ol>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="neon-host">Host *</Label>
                  <Input
                    id="neon-host"
                    value={neonHost}
                    onChange={(e) => setNeonHost(e.target.value)}
                    placeholder="ep-cool-name-123456.ap-southeast-1.aws.neon.tech"
                  />
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
                <Label htmlFor="custom-port">Port</Label>
                <Input
                  id="custom-port"
                  value={customPort}
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
            <div className="rounded-md border border-border/60 bg-background/50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Preview URL
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-foreground/90">
                {maskDatabaseUrl(builtUrl)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-500/90">
              Complete all required fields (*) — the connection URL will be generated automatically.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="brain-database-url">Postgres connection URL *</Label>
          <Input
            id="brain-database-url"
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/postgres"
          />
          {configured && !value && (
            <p className="text-xs text-muted-foreground">Saved. Enter a new URL only to replace it.</p>
          )}
        </div>
      )}
    </div>
  );
}
