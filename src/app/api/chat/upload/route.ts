import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { saveChatUpload } from "@/lib/chat/upload";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const ip = getClientIp(request);
  const limit = rateLimit(`chat-upload:${user.id}:${ip}`, 20, 60_000);
  if (!limit.success) {
    return NextResponse.json({ error: "Too many uploads. Try again shortly." }, { status: 429 });
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    const single = form.get("file");
    if (single instanceof File) files.push(single);
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (files.length > 4) {
    return NextResponse.json({ error: "Maximum 4 images per message" }, { status: 400 });
  }

  try {
    const uploads = await Promise.all(files.map((file) => saveChatUpload(user.id, file)));
    return NextResponse.json({ urls: uploads.map((u) => u.url) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
