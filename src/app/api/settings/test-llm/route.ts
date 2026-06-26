import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getDecryptedSecret } from "@/lib/secrets/secret-store";
import { buildCompletionTokenFields, resolveLlmBaseUrl } from "@/lib/llm-config";
import { getLlmProviderPreset } from "@/lib/llm-providers";
import { z } from "zod";

const bodySchema = z.object({
  providerId: z.string(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { providerId, baseUrl, apiKey } = parsed.data;
  const preset = getLlmProviderPreset(providerId);
  const resolvedBase = resolveLlmBaseUrl(
    providerId === "custom" ? baseUrl : preset.baseUrl || baseUrl
  );

  let key = apiKey?.trim();
  if (!key) {
    key = await getDecryptedSecret(user.id, "llm", "api_key");
  }

  if (!key && providerId !== "ollama") {
    return NextResponse.json(
      { error: "API key required. Save a key first or pass one for testing." },
      { status: 400 }
    );
  }

  try {
    const base = resolvedBase.replace(/\/$/, "");
    const res = await fetch(`${base}/models`, {
      headers: {
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      return NextResponse.json({
        ok: true,
        message: `Connected to ${preset.name}`,
      });
    }

    const chatRes = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model: preset.exampleModels[0] || "gpt-4.1-mini",
        messages: [{ role: "user", content: "ping" }],
        ...buildCompletionTokenFields(resolvedBase, 1),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (chatRes.ok || chatRes.status === 400) {
      return NextResponse.json({
        ok: true,
        message: `Reachable — ${preset.name}`,
      });
    }

    const errText = await chatRes.text();
    return NextResponse.json(
      { error: `HTTP ${chatRes.status}: ${errText.slice(0, 120)}` },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Connection failed" },
      { status: 400 }
    );
  }
}
