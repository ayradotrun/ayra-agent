import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { chatUploadPath, isValidChatUploadFilename } from "@/lib/chat/upload";

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const filename = params.filename;
  if (!isValidChatUploadFilename(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  if (!filename.startsWith(user.id.slice(0, 8))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readFile(chatUploadPath(filename));
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : ext === "gif"
            ? "image/gif"
            : "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
