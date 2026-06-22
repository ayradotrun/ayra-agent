import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdateBySecret } from "@/lib/telegram/handler";
import type { TelegramUpdate } from "@/lib/telegram/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { secret: string } }
) {
  try {
    const body = (await request.json()) as TelegramUpdate;
    await handleTelegramUpdateBySecret(params.secret, body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
