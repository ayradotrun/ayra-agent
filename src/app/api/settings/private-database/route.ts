import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  connectUserPrivateDatabase,
  PrivateDatabaseConnectError,
} from "@/lib/brain/connect-private-database";
import { describeDatabaseHost } from "@/lib/brain/build-pg-url";
import { z } from "zod";

const bodySchema = z.object({
  url: z.string().min(1, "URL is required"),
  /** Required when url is Supabase direct (db.*.supabase.co) — upgrades to Session pooler. */
  supabaseRegion: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const savedUrl = await connectUserPrivateDatabase(user.id, parsed.data.url, {
      supabaseRegion: parsed.data.supabaseRegion,
    });

    return NextResponse.json({
      ok: true,
      hasBrainDatabaseUrl: true,
      brainDatabaseUrl: savedUrl,
      host: describeDatabaseHost(savedUrl),
      message: "Private database connected",
    });
  } catch (error) {
    const message =
      error instanceof PrivateDatabaseConnectError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Connection failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
