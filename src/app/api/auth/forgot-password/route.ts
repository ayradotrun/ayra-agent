import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createEmailVerificationCode } from "@/lib/email/verification";
import { sendVerificationCodeEmail } from "@/lib/email/mailer";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`forgot-password:${ip}`, 6);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    if (user?.password) {
      const { code } = await createEmailVerificationCode(email, "reset_password");
      await sendVerificationCodeEmail(email, code, "reset_password");
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for this email, a reset code has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
