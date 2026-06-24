const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(value));
}

export function usernameValidationMessage(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 30) return "Username must be at most 30 characters";
  if (!USERNAME_PATTERN.test(username)) {
    return "Username may only contain lowercase letters, numbers, and underscores";
  }
  return null;
}

export function deriveUsernameFromEmail(email: string): string {
  const local = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "user";
  const trimmed = local.replace(/^_+|_+$/g, "").slice(0, 30);
  const base = trimmed.length >= 3 ? trimmed : `${trimmed}_ayra`.slice(0, 30);
  return base.padEnd(3, "0");
}
