export type SupabaseUrlKind = "direct" | "pooler" | "other";

export interface SupabaseDirectUrlParts {
  ref: string;
  password: string;
  database: string;
  port: string;
}

export interface SupabasePoolerUrlParts {
  ref: string;
  region: string;
  password: string;
  database: string;
  port: string;
  poolerPrefix: string;
}

/** Supabase Session pooler regions (AWS slug in host aws-0-{region}.pooler.supabase.com). */
export const SUPABASE_POOLER_REGIONS = [
  { value: "eu-central-1", label: "Europe — Frankfurt (recommended for EU VPS)" },
  { value: "eu-west-1", label: "Europe — Ireland" },
  { value: "eu-west-2", label: "Europe — London" },
  { value: "eu-west-3", label: "Europe — Paris" },
  { value: "eu-north-1", label: "Europe — Stockholm" },
  { value: "us-east-1", label: "US — East (N. Virginia)" },
  { value: "us-west-1", label: "US — West (N. California)" },
  { value: "us-west-2", label: "US — West (Oregon)" },
  { value: "ap-southeast-1", label: "Asia — Singapore" },
  { value: "ap-southeast-2", label: "Asia — Sydney" },
  { value: "ap-northeast-1", label: "Asia — Tokyo" },
  { value: "ap-northeast-2", label: "Asia — Seoul" },
  { value: "ap-south-1", label: "Asia — Mumbai" },
  { value: "sa-east-1", label: "South America — São Paulo" },
  { value: "ca-central-1", label: "Canada — Central" },
] as const;

/**
 * Normalize a Supabase pooler region slug.
 * Fixes common mistakes such as eu-ap-southeast-1 → ap-southeast-1.
 */
export function normalizeSupabasePoolerRegion(raw: string): string {
  let region = raw.trim().toLowerCase();
  region = region.replace(/^aws-\d+-/, "");
  region = region.replace(/\.pooler\.supabase\.com.*$/, "");
  region = region.replace(/\.pool.*$/, "");

  if (/^eu-ap-/.test(region)) {
    region = region.replace(/^eu-ap-/, "ap-");
  } else if (/^eu-us-/.test(region)) {
    region = region.replace(/^eu-us-/, "us-");
  } else if (/^eu-eu-/.test(region)) {
    region = region.replace(/^eu-eu-/, "eu-");
  }

  return region;
}

/** Fix aws-0-{region}.pooler.supabase.com when region was mistyped. */
export function normalizeSupabasePoolerHostname(hostname: string): string {
  const match = hostname.match(/^(aws-\d+-)(.+)\.pooler\.supabase\.com$/i);
  if (!match) return hostname;
  const region = normalizeSupabasePoolerRegion(match[2]);
  return `${match[1]}${region}.pooler.supabase.com`;
}

function parsePgUrl(url: string): URL {
  const trimmed = url.trim().replace(/^postgres:\/\//, "postgresql://");
  return new URL(trimmed);
}

function encodePg(value: string): string {
  return encodeURIComponent(value);
}

export function detectSupabaseUrlKind(url: string): SupabaseUrlKind {
  try {
    const host = parsePgUrl(url).hostname.toLowerCase();
    if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(host)) return "direct";
    if (/^aws-\d+-.+\.pooler\.supabase\.com$/i.test(host)) return "pooler";
  } catch {
    /* ignore */
  }
  return "other";
}

/** Supabase direct host db.[ref].supabase.co — IPv6-only on most projects. */
export function parseSupabaseDirectUrl(url: string): SupabaseDirectUrlParts | null {
  try {
    const parsed = parsePgUrl(url);
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!match) return null;
    if (!parsed.password) return null;
    return {
      ref: match[1],
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, "") || "postgres",
      port: parsed.port || "5432",
    };
  } catch {
    return null;
  }
}

export function parseSupabasePoolerUrl(url: string): SupabasePoolerUrlParts | null {
  try {
    const parsed = parsePgUrl(url);
    const hostMatch = parsed.hostname.match(/^(aws-\d+-)(.+)\.pooler\.supabase\.com$/i);
    const userMatch = parsed.username.match(/^postgres\.([a-z0-9]+)$/i);
    if (!hostMatch || !userMatch || !parsed.password) return null;
    return {
      ref: userMatch[1],
      region: normalizeSupabasePoolerRegion(hostMatch[2]),
      poolerPrefix: hostMatch[1],
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, "") || "postgres",
      port: parsed.port || "5432",
    };
  } catch {
    return null;
  }
}

export function buildSupabasePoolerUrl(input: {
  ref: string;
  password: string;
  region: string;
  database?: string;
  port?: string;
  poolerPrefix?: string;
}): string {
  const region = normalizeSupabasePoolerRegion(input.region);
  const prefix = input.poolerPrefix ?? "aws-0-";
  const host = `${prefix}${region}.pooler.supabase.com`;
  const port = input.port ?? "5432";
  const database = input.database ?? "postgres";
  const user = `postgres.${input.ref}`;
  return `postgresql://${encodePg(user)}:${encodePg(input.password)}@${host}:${port}/${encodePg(database)}`;
}

/** Convert Supabase direct (IPv6) URL to Session pooler (IPv4-friendly). */
export function upgradeSupabaseDirectToPooler(url: string, region: string): string | null {
  const direct = parseSupabaseDirectUrl(url);
  if (!direct) return null;
  return buildSupabasePoolerUrl({
    ref: direct.ref,
    password: direct.password,
    region,
    database: direct.database,
    port: direct.port,
  });
}

/** Convert Supabase Session pooler (5432) → Transaction pooler (6543) for app runtime. */
export function toSupabaseTransactionPoolerUrl(url: string): string {
  try {
    const parsed = parsePgUrl(url);
    if (!/\.pooler\.supabase\.com$/i.test(parsed.hostname)) return url;
    const port = parsed.port || "5432";
    if (port === "6543") return url;
    parsed.port = "6543";
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isSupabaseSessionPoolerUrl(url: string): boolean {
  try {
    const parsed = parsePgUrl(url);
    return (
      /\.pooler\.supabase\.com$/i.test(parsed.hostname) &&
      (parsed.port || "5432") === "5432"
    );
  } catch {
    return false;
  }
}

export function readPgHostFromUrl(url: string): string | undefined {
  try {
    return parsePgUrl(url).hostname;
  } catch {
    const match = url.match(/@([^:/]+)/);
    return match?.[1];
  }
}

export interface NormalizePrivateDatabaseUrlOptions {
  /** Required to upgrade Supabase direct (IPv6) URLs to Session pooler. */
  supabaseRegion?: string;
}

/**
 * Normalize pasted or wizard-built Postgres URLs before connecting.
 * - Fixes mistyped Supabase pooler regions in the hostname
 * - Upgrades db.[ref].supabase.co → Session pooler when region is known
 */
export function normalizePrivateDatabaseUrl(
  url: string,
  options?: NormalizePrivateDatabaseUrlOptions
): string {
  const regionHint =
    options?.supabaseRegion?.trim() ||
    (() => {
      try {
        const parsed = parsePgUrl(url);
        return (
          parsed.searchParams.get("pooler_region") ||
          parsed.searchParams.get("supabase_region") ||
          parsed.searchParams.get("supabase_pooler_region") ||
          undefined
        );
      } catch {
        return undefined;
      }
    })();

  if (regionHint && detectSupabaseUrlKind(url) === "direct") {
    const upgraded = upgradeSupabaseDirectToPooler(url, regionHint);
    if (upgraded) return normalizePrivateDatabaseUrl(upgraded);
  }

  let parsed: URL;
  try {
    parsed = parsePgUrl(url);
  } catch {
    return url.trim();
  }

  if (/\.pooler\.supabase\.com$/i.test(parsed.hostname)) {
    parsed.hostname = normalizeSupabasePoolerHostname(parsed.hostname.toLowerCase());
  }

  return parsed.toString();
}

export function supabaseDirectUrlNeedsRegion(url: string): boolean {
  return detectSupabaseUrlKind(url) === "direct";
}

/** Supabase may use aws-0 or aws-1 pooler prefix — try both when connecting. */
export function expandSupabasePoolerCandidates(url: string): string[] {
  try {
    const parsed = parsePgUrl(url);
    const match = parsed.hostname.match(/^(aws-)(\d+)(-.+\.pooler\.supabase\.com)$/i);
    if (!match) return [url];

    const out = new Set<string>();
    for (const n of ["0", "1"]) {
      parsed.hostname = `${match[1]}${n}${match[3]}`.toLowerCase();
      out.add(parsed.toString());
    }
    return Array.from(out);
  } catch {
    return [url];
  }
}

export function formatPrivateDatabaseConnectError(
  error: unknown,
  attemptedUrl: string
): string {
  const base = error instanceof Error ? error.message : "Connection failed";

  if (/EMAXCONNSESSION|max clients reached/i.test(base)) {
    return (
      "Supabase Session pooler connection limit reached (max ~15). " +
      "Restart the app, wait 1–2 minutes for idle connections to close, then reconnect in Settings " +
      "(AYRA saves Transaction pooler port 6543 after connect to prevent this)."
    );
  }

  const host = readPgHostFromUrl(attemptedUrl);

  if (!/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(base) || !host) {
    return base;
  }

  const poolerMatch = host.match(/^aws-\d+-(.+)\.pooler\.supabase\.com$/);
  if (poolerMatch) {
    const badRegion = poolerMatch[1];
    const fixed = normalizeSupabasePoolerRegion(badRegion);
    if (fixed !== badRegion) {
      return (
        `database host "${host}" could not be found. ` +
        `Region looks wrong — use aws-0-${fixed}.pooler.supabase.com instead ` +
        `(Singapore = ap-southeast-1, Frankfurt = eu-central-1). ` +
        `Copy the Session pooler URI from Supabase → Settings → Database.`
      );
    }
    return (
      `database host "${host}" could not be found on this server (DNS lookup failed). ` +
      `Easiest fix: paste your Supabase direct URL (db.[ref].supabase.co from Settings → Database) ` +
      `and select your project region — AYRA converts it to Session pooler (IPv4). Or use Setup wizard.`
    );
  }

  if (/^db\.[a-z0-9]+\.supabase\.co$/i.test(host)) {
    return (
      `direct Supabase host "${host}" is IPv6-only — most VPS and home networks cannot reach it. ` +
      `Paste the same URL and pick your Supabase project region below; AYRA converts it to Session pooler (IPv4) automatically.`
    );
  }

  return (
    `${base}. If this is Supabase, paste the direct URL (db.*.supabase.co) and select your project region — ` +
    `AYRA will use Session pooler (IPv4) instead of IPv6-only direct connection.`
  );
}
