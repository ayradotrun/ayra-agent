import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const PLAIN_PREFIX = "plain:";

function getKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) return null;
  return crypto.createHash("sha256").update(key).digest();
}

export function canEncrypt(): boolean {
  return getKey() !== null;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function encryptSafe(plaintext: string): string {
  try {
    return encrypt(plaintext);
  } catch {
    return `${PLAIN_PREFIX}${plaintext}`;
  }
}

export function decrypt(ciphertext: string): string {
  if (ciphertext.startsWith(PLAIN_PREFIX)) {
    return ciphertext.slice(PLAIN_PREFIX.length);
  }
  const key = getKey();
  if (!key) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function decryptSafe(ciphertext: string): string {
  if (ciphertext.startsWith(PLAIN_PREFIX)) {
    return ciphertext.slice(PLAIN_PREFIX.length);
  }
  try {
    return decrypt(ciphertext);
  } catch {
    return ciphertext;
  }
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
