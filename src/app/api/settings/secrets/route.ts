import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  deleteEncryptedSecret,
  type SecretName,
  type SecretScope,
} from "@/lib/secrets/secret-store";

const VALID: Record<string, SecretName[]> = {
  llm: ["api_key"],
  telegram: ["bot_token"],
  x: ["api_key", "api_secret", "access_token", "access_secret"],
  solana: ["rpc_api_key"],
  discord: ["bot_token"],
};

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const provider = request.nextUrl.searchParams.get("provider") as SecretScope | null;
  const name = request.nextUrl.searchParams.get("name") as SecretName | null;

  if (!provider || !name) {
    return NextResponse.json({ error: "provider and name required" }, { status: 400 });
  }

  const allowed = VALID[provider];
  if (!allowed?.includes(name)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 400 });
  }

  await deleteEncryptedSecret(user.id, provider, name);
  return NextResponse.json({ ok: true });
}
