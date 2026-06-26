/** Resolve Postgres hostname to IPv4 — works in Next.js API routes (no bundled node:dns). */

function isIpv4Host(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isLocalPgHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local");
}

type DohAnswer = { type: number; data: string };

async function resolveViaGoogleDoh(hostname: string): Promise<string | null> {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { Answer?: DohAnswer[] };
  const a = json.Answer?.find((entry) => entry.type === 1);
  return a?.data ?? null;
}

async function resolveViaCloudflareDoh(hostname: string): Promise<string | null> {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { Answer?: DohAnswer[] };
  const a = json.Answer?.find((entry) => entry.type === 1);
  return a?.data ?? null;
}

async function resolveViaNodeDns(hostname: string): Promise<string | null> {
  try {
    const { resolve4 } = await import("node:dns/promises");
    const ips = await resolve4(hostname);
    return ips[0] ?? null;
  } catch {
    return null;
  }
}

/** Resolve hostname to IPv4. Returns original host if already IPv4/local. */
export async function resolveHostToIpv4(hostname: string): Promise<string | null> {
  const host = hostname.trim().toLowerCase();
  if (!host || isLocalPgHost(host) || isIpv4Host(host)) return host;

  for (const resolver of [
    resolveViaGoogleDoh,
    resolveViaCloudflareDoh,
    resolveViaNodeDns,
  ]) {
    try {
      const ip = await resolver(host);
      if (ip) return ip;
    } catch {
      /* try next */
    }
  }

  return null;
}
