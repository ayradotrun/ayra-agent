import {
  extractTickerFromMessage,
  isSolanaMint,
} from "@/lib/agent/token-card";
import { runSkillFast, runTokenLookupFast } from "./skill-runner";
import { QUALITY_MAX_PAIR_AGE_HOURS } from "@/lib/agent/meme-quality";

const SOL_PRICE_PATTERN =
  /\b(harga|price|cek|check|berapa|brp|kurs|nilai).{0,20}\b(sol|solana)\b|\b(sol|solana).{0,20}\b(harga|price)\b/i;
const NETWORK_PATTERN = /\b(tps|network stat|status jaringan|jaringan solana|solana network)\b/i;
const RUGCHECK_PATTERN = /\b(rug ?check|cek keamanan|safe|scam|rug)\b/i;
const MINT_PATTERN = /\b([1-9A-HJ-NP-Za-km-z]{32,50})\b/;
const SNS_PATTERN = /\b([a-z0-9_-]{1,40})\.sol\b/i;
const TRENDING_PATTERN = /\b(trending|tren|hot token|token hot|token viral)\b/i;
const AYRA_SCAN_PATTERN = /\b(ayra scan|ayrascan|meme scan|scan memes?|ayra alert|ayra alerts?)\b/i;
const QUALITY_PATTERN = /\b(quality|ayra quality|meme quality|quality report|pass filters?)\b/i;

export async function tryTelegramFastPath(
  userId: string,
  agentId: string,
  text: string
): Promise<{ handled: boolean; message?: string; imagePaths?: string[] }> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("/")) {
    return { handled: false };
  }

  if (isSolanaMint(trimmed)) {
    return runTokenLookupFast(userId, agentId, trimmed);
  }

  const mintMatch = trimmed.match(MINT_PATTERN)?.[1];

  if (mintMatch && RUGCHECK_PATTERN.test(trimmed)) {
    return runSkillFast(userId, agentId, "rugcheck", { mint: mintMatch }, "Could not scan token safety.");
  }

  if (mintMatch && trimmed.split(/\s+/).length <= 3) {
    return runTokenLookupFast(userId, agentId, mintMatch);
  }

  const snsMatch = trimmed.match(SNS_PATTERN)?.[1];
  if (snsMatch && trimmed.split(/\s+/).length <= 4) {
    return runSkillFast(userId, agentId, "sns-resolver", { domain: snsMatch }, "Domain not found.");
  }

  if (AYRA_SCAN_PATTERN.test(trimmed) && trimmed.split(/\s+/).length <= 6) {
    return runSkillFast(userId, agentId, "meme-coin-scanner", { limit: 8 }, "AYRA scan failed.");
  }

  if (mintMatch && QUALITY_PATTERN.test(trimmed)) {
    return runSkillFast(
      userId,
      agentId,
      "token-quality-report",
      { mint: mintMatch, maxPairAgeHours: QUALITY_MAX_PAIR_AGE_HOURS },
      "Could not run quality report."
    );
  }

  if (TRENDING_PATTERN.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
    return runSkillFast(userId, agentId, "trending-tokens", {}, "Could not fetch trending tokens.");
  }

  if (NETWORK_PATTERN.test(trimmed)) {
    return runSkillFast(userId, agentId, "network-stats", {}, "Could not fetch network status.");
  }

  if (SOL_PRICE_PATTERN.test(trimmed)) {
    return runSkillFast(userId, agentId, "sol-price-checker", {}, "Could not fetch SOL price.");
  }

  const ticker = extractTickerFromMessage(trimmed);
  if (ticker) {
    return runTokenLookupFast(userId, agentId, ticker);
  }

  return { handled: false };
}
