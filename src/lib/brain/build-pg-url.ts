export type PrivateDbProvider = "supabase" | "neon" | "custom";

export interface PrivateDbFormFields {
  provider: PrivateDbProvider;
  password: string;
  database: string;
  /** Supabase project ref (Settings → General) */
  projectRef?: string;
  /** Supabase pooler region slug, e.g. ap-southeast-1 */
  supabaseRegion?: string;
  /** Neon host without protocol, e.g. ep-xxx.ap-southeast-1.aws.neon.tech */
  neonHost?: string;
  neonUser?: string;
  customHost?: string;
  customPort?: string;
  customUser?: string;
}

function encodePg(value: string): string {
  return encodeURIComponent(value);
}

export function buildPrivateDatabaseUrl(fields: PrivateDbFormFields): string | null {
  const password = fields.password.trim();
  const database = fields.database.trim() || "postgres";

  if (!password) return null;

  if (fields.provider === "supabase") {
    const ref = fields.projectRef?.trim();
    if (!ref) return null;
    const region = fields.supabaseRegion?.trim() || "ap-southeast-1";
    const user = `postgres.${ref}`;
    const host = `aws-0-${region}.pooler.supabase.com`;
    return `postgresql://${encodePg(user)}:${encodePg(password)}@${host}:5432/${encodePg(database)}`;
  }

  if (fields.provider === "neon") {
    const host = fields.neonHost?.trim();
    if (!host) return null;
    const user = fields.neonUser?.trim() || "neondb_owner";
    return `postgresql://${encodePg(user)}:${encodePg(password)}@${host}:5432/${encodePg(database)}`;
  }

  const host = fields.customHost?.trim();
  const user = fields.customUser?.trim() || "postgres";
  const port = fields.customPort?.trim() || "5432";
  if (!host) return null;
  return `postgresql://${encodePg(user)}:${encodePg(password)}@${host}:${port}/${encodePg(database)}`;
}

export function maskDatabaseUrl(url: string): string {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

export const PRIVATE_DB_DEFAULTS: Record<
  PrivateDbProvider,
  Partial<PrivateDbFormFields>
> = {
  supabase: {
    database: "postgres",
    supabaseRegion: "ap-southeast-1",
  },
  neon: {
    database: "neondb",
    neonUser: "neondb_owner",
  },
  custom: {
    database: "postgres",
    customPort: "5432",
    customUser: "postgres",
  },
};
