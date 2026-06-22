import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      xApiKey: null,
      xApiSecret: null,
      xAccessToken: null,
      xAccessSecret: null,
      xRefreshToken: null,
      xAuthMethod: null,
      xUsername: null,
      xUserId: null,
      xTokenExpiresAt: null,
      xConnectedAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
