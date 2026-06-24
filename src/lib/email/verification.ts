import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type EmailCodePurpose = "signup" | "reset_password";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface SignupPayload {
  username: string;
  name?: string | null;
  passwordHash: string;
}

function generateCode(): string {
  return crypto.randomInt(100_000, 1_000_000).toString();
}

export async function createEmailVerificationCode(
  email: string,
  purpose: EmailCodePurpose,
  payload?: SignupPayload
): Promise<{ code: string; expiresAt: Date }> {
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.emailVerificationCode.deleteMany({
    where: { email: normalizedEmail, purpose },
  });

  await prisma.emailVerificationCode.create({
    data: {
      email: normalizedEmail,
      purpose,
      codeHash,
      payload: payload ?? undefined,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

export async function verifyEmailCode(
  email: string,
  purpose: EmailCodePurpose,
  code: string
): Promise<{ ok: true; payload: SignupPayload | null } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await prisma.emailVerificationCode.findFirst({
    where: { email: normalizedEmail, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "Verification code expired or not found. Request a new code." };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationCode.delete({ where: { id: record.id } });
    return { ok: false, error: "Verification code expired. Request a new code." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerificationCode.delete({ where: { id: record.id } });
    return { ok: false, error: "Too many failed attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(code.trim(), record.codeHash);
  if (!valid) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Invalid verification code." };
  }

  await prisma.emailVerificationCode.delete({ where: { id: record.id } });

  const payload =
    record.payload && typeof record.payload === "object"
      ? (record.payload as SignupPayload)
      : null;

  return { ok: true, payload };
}
