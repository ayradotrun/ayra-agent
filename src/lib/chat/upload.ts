import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "chat-uploads");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function saveChatUpload(
  userId: string,
  file: File
): Promise<{ url: string; filename: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = ALLOWED_TYPES.get(file.type)!;
  const filename = `${userId.slice(0, 8)}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return { filename, url: `/api/chat/uploads/${filename}` };
}

export function chatUploadPath(filename: string): string {
  return path.join(UPLOAD_DIR, path.basename(filename));
}

export function isValidChatUploadFilename(filename: string): boolean {
  return /^[\w-]+\.(png|jpg|jpeg|webp|gif)$/i.test(filename);
}
