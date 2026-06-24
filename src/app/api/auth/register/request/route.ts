import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isValidUsername, normalizeUsername, usernameValidationMessage } from "@/lib/auth/username";
import { createEmailVerificationCode } from "@/lib/email/verification";
import { sendVerificationCodeEmail } from "@/lib/email/mailer";

const requestSchema = z.object({
  username: z.string().min(3).max(30),
  name: z.string().max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`register-request:${ip}`, 8);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const username = normalizeUsername(parsed.data.username);

    const usernameError = usernameValidationMessage(username);
    if (usernameError || !isValidUsername(username)) {
      return NextResponse.json({ error: usernameError || "Invalid username" }, { status: 400 });
    }

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { code } = await createEmailVerificationCode(email, "signup", {
      username,
      name: name?.trim() || null,
      passwordHash,
    });

    await sendVerificationCodeEmail(email, code, "signup");

    return NextResponse.json({
      ok: true,
      email,
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    console.error("[register/request]", error);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
