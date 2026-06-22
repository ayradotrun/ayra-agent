import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const alerts = await prisma.alert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { agent: { select: { name: true } } },
  });

  return NextResponse.json(alerts);
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const { ids } = await request.json();
  if (Array.isArray(ids)) {
    await prisma.alert.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { read: true },
    });
  } else {
    await prisma.alert.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
