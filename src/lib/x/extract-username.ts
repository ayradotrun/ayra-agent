const X_USERNAME = /^[a-zA-Z0-9_]{1,15}$/;

function normalizeUsername(raw: string): string | null {
  const handle = raw.replace(/^@/, "").trim();
  return X_USERNAME.test(handle) ? handle : null;
}

/** Extract X/Twitter handle from natural language (ID + EN). */
export function extractXUsername(text: string): string | null {
  const trimmed = text.trim();

  const atMatch = trimmed.match(/@([a-zA-Z0-9_]{1,15})\b/);
  if (atMatch) return normalizeUsername(atMatch[1]);

  const patterns = [
    /\b(?:search|cek|lihat|lookup|cari)\s+(?:akun\s+)?(?:x|twitter)\s+@?([a-zA-Z0-9_]{1,15})\b/i,
    /\b(?:akun\s+)?(?:x|twitter)\s+@?([a-zA-Z0-9_]{1,15})\b/i,
    /\bx\.com\/([a-zA-Z0-9_]{1,15})\b/i,
    /\btwitter\.com\/([a-zA-Z0-9_]{1,15})\b/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const handle = normalizeUsername(match[1]);
      if (handle) return handle;
    }
  }

  return null;
}

export function isXAccountLookupMessage(text: string): boolean {
  if (extractXUsername(text)) return true;
  return /\b(?:akun\s+x|x\s+account|twitter\s+profile|profile\s+x|search\s+akun)\b/i.test(text);
}
