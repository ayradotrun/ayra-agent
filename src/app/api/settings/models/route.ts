import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getDecryptedSecret } from "@/lib/secrets/secret-store";
import {
  fetchCustomEndpointModels,
  fetchOpenRouterModels,
  getStaticProviderModels,
  mergeCustomModels,
} from "@/lib/llm/provider-models";
import { resolveLlmBaseUrl } from "@/lib/llm-config";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || "openrouter";
  const baseUrlOverride = url.searchParams.get("baseUrl")?.trim();

  const customModels = await prisma.customModel.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { llmBaseUrl: true },
  });

  let chatModels = getStaticProviderModels(provider, "chat");
  let imageModels = getStaticProviderModels(provider, "image");

  if (provider === "openrouter") {
    try {
      const key =
        (await getDecryptedSecret(user.id, "llm", "api_key")) ||
        process.env.OPENROUTER_API_KEY?.trim();
      const dynamic = await fetchOpenRouterModels(key);
      const chat = dynamic.filter((m) => m.type === "chat");
      const image = dynamic.filter((m) => m.type === "image");
      if (chat.length) chatModels = chat;
      if (image.length) imageModels = image;
    } catch {
      /* static fallback */
    }
  }

  if (provider === "custom") {
    const customBase = baseUrlOverride || dbUser?.llmBaseUrl;
    if (customBase) {
      try {
        const key = await getDecryptedSecret(user.id, "llm", "api_key");
        const base = resolveLlmBaseUrl(customBase);
        const dynamic = await fetchCustomEndpointModels(base, key);
        const chat = dynamic.filter((m) => m.type === "chat");
        const image = dynamic.filter((m) => m.type === "image");
        if (chat.length) chatModels = chat;
        if (image.length) imageModels = image;
      } catch {
        /* custom models only */
      }
    }
  }

  chatModels = mergeCustomModels(chatModels, customModels, provider, "chat");
  imageModels = mergeCustomModels(imageModels, customModels, provider, "image");

  return NextResponse.json({ chatModels, imageModels, provider });
}
