import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import type { SkillDefinition } from "./base";
import { callOpenRouterImageGeneration } from "@/lib/openrouter";
import { buildLlmCallParams } from "@/lib/llm-config";
import { getDecryptedUserKey } from "@/lib/user-keys";import {
  IMAGE_MODEL_OPTIONS,
  getImageModalities,
} from "@/lib/models";
import { resolveImageModel } from "@/lib/user-models";
import { prisma } from "@/lib/prisma";

async function saveDataUrlImage(dataUrl: string, filename: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL");

  const ext = match[1].includes("png") ? "png" : match[1].includes("jpeg") ? "jpg" : "png";
  const buffer = Buffer.from(match[2], "base64");
  const dir = path.join(process.cwd(), "storage", "generated");
  await mkdir(dir, { recursive: true });

  const safeName = filename.replace(/[^a-zA-Z0-9-_]/g, "");
  const filePath = path.join(dir, `${safeName}.${ext}`);
  await writeFile(filePath, buffer);

  return `/api/generated/${safeName}.${ext}`;
}

export const imageGenerator: SkillDefinition = {
  id: "image-generator",
  name: "Image Generator",
  slug: "image-generator",
  category: "Social",
  description: "Generate images from text prompts using OpenRouter image models.",
  icon: "sparkles",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    prompt: z.string().min(1).describe("Image description / prompt"),
    model: z
      .string()
      .optional()
      .describe("OpenRouter image model ID (default: Riverflow 2.5 Fast free)"),
    aspectRatio: z
      .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
      .optional()
      .describe("Aspect ratio for Gemini image models"),
  }),
  async execute(input, ctx) {
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const agent = await prisma.agent.findUnique({ where: { id: ctx.agentId } });
    const model =
      input.model ||
      resolveImageModel(agent?.imageModel, user?.defaultImageModel);
    const llm = buildLlmCallParams(user ?? {}, getDecryptedUserKey(user?.openRouterApiKey));
    await ctx.log("INFO", `Generating image: ${model}`, "image-generator");

    try {
      const result = await callOpenRouterImageGeneration({
        apiKey: llm.apiKey,
        baseUrl: llm.baseUrl,
        useOpenRouterFallbacks: llm.useOpenRouterFallbacks,
        model,
        prompt: input.prompt,
        modalities: getImageModalities(model),
        aspectRatio: input.aspectRatio,
        fallbackModels: llm.fallbackImageModels,
      });

      const savedUrls: string[] = [];
      for (let i = 0; i < result.images.length; i++) {
        const url = await saveDataUrlImage(
          result.images[i].dataUrl,
          `${ctx.runId.slice(0, 12)}-${i}`
        );
        savedUrls.push(url);
      }

      await ctx.log("INFO", `Generated ${savedUrls.length} image(s)`, "image-generator");

      return {
        ok: true,
        model,
        prompt: input.prompt,
        imageUrls: savedUrls,
        description: result.text,
        note:
          savedUrls.length > 0
            ? "Open image URLs in browser. Free models: Riverflow 2.5, FLUX Klein, Gemini 2.5 Flash Image."
            : undefined,
        availableModels: IMAGE_MODEL_OPTIONS.map((m) => m.value),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed";
      await ctx.log("ERROR", message, "image-generator");
      return { ok: false, error: message, model };
    }
  },
};
