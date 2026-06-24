import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyEmailCode } from "@/lib/email/verification";

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`register-verify:${ip}`, 12);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.trim();

    const verified = await verifyEmailCode(email, "signup", code);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    if (!verified.payload?.username || !verified.payload.passwordHash) {
      return NextResponse.json({ error: "Registration session expired. Start again." }, { status: 400 });
    }

    const { username, name, passwordHash } = verified.payload;

    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (existingEmail || existingUsername) {
      return NextResponse.json({ error: "Account already exists. Sign in instead." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        name: name?.trim() || username,
        password: passwordHash,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, username: true },
    });

    return NextResponse.json(
      {
        ok: true,
        id: user.id,
        email: user.email,
        username: user.username,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register/verify]", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
