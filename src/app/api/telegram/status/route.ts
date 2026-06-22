import { NextResponse } from "next/server";

/** Telegram polling runs in the worker process (`npm run worker`), not the Next.js dev server. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    polling: process.env.TELEGRAM_POLLING === "true",
    hint:
      process.env.TELEGRAM_POLLING === "true"
        ? "Run `npm run worker` in a separate terminal for Telegram chat."
        : "Set TELEGRAM_POLLING=true and run `npm run worker` for local Telegram chat.",
  });
}
