/** Strip model artifacts and detect useless meta-replies from free LLMs. */

/** Detect LLM markdown tables or legacy Banana-bot branding — prefer structured formatters. */
export function isMessyCryptoReply(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/banana-bot/i.test(t)) return true;
  if (/meme-coin scan results/i.test(t)) return true;
  if (/\|\s*Mint\s*\|/i.test(t)) return true;
  if (/\|\s*Symbol\s*\|.*\|\s*Name\s*\|/i.test(t)) return true;
  if ((t.match(/\|/g)?.length ?? 0) >= 6 && /rug.?score/i.test(t)) return true;
  return false;
}

export function sanitizeAgentOutput(text: string): string {
  return text
    .replace(/<\|[^|]+\|>/g, "")
    .replace(/^\*Ayra\*\s*/i, "")
    .replace(/^✅\s*\*?Ayra\*?\s*/i, "")
    .replace(/\(Banana-bot style\)/gi, "")
    .replace(/Banana-bot style/gi, "AYRA style")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isUselessAgentReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (/<\|[^|]+\|>/.test(text)) return true;
  if (/assistance_completed/.test(t)) return true;
  if (/the request aligns with the available tools/.test(t)) return true;
  if (/a concise confirmation is provided/.test(t)) return true;
  if (/aligns with.*tools/.test(t) && t.length < 200) return true;
  if (/i'll look up|i will look up/.test(t) && t.length < 150) return true;
  return false;
}
