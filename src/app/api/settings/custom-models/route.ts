import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { z } from "zod";

const createSchema = z.object({
  provider: z.string().min(1),
  modelName: z.string().min(1).max(120),
  modelId: z.string().min(1).max(200),
  modelType: z.enum(["chat", "image"]),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const model = await prisma.customModel.create({
    data: { userId: user.id, ...parsed.data },
  });

  return NextResponse.json({ model }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.customModel.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customModel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
