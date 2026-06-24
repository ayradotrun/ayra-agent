import path from "path";
import { prisma } from "@/lib/prisma";
import { getSkill } from "@/lib/skills";
import { DEFAULT_IMAGE_MODEL, getModelLabel } from "@/lib/models";

function imageUrlToLocalPath(url: string): string | null {
  const match = url.match(/^\/api\/generated\/([^/?#]+)$/);
  if (!match) return null;
  return path.join(process.cwd(), "storage", "generated", match[1]);
}

export async function generateImageForAgent(
  userId: string,
  agentId: string,
  prompt: string,
  trigger = "chat"
): Promise<{ ok: boolean; message: string; imageUrls?: string[]; imagePaths?: string[] }> {
  const skill = getSkill("image-generator");
  if (!skill) {
    return { ok: false, message: "Image generator skill is not available." };
  }

  const run = await prisma.agentRun.create({
    data: { agentId, status: "RUNNING", trigger },
  });

  const logFn = async (
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    toolUsed?: string
  ) => {
    await prisma.agentLog.create({
      data: { agentId, runId: run.id, level, message, toolUsed },
    });
  };

  try {
    const result = (await skill.execute(
      { prompt },
      { agentId, userId, runId: run.id, log: logFn }
    )) as {
      ok?: boolean;
      error?: string;
      imageUrls?: string[];
      model?: string;
      description?: string;
    };

    const imageUrls = result.imageUrls ?? [];
    const imagePaths =
      imageUrls.map((u) => imageUrlToLocalPath(u)).filter((p): p is string => p !== null);

    const status = result.ok ? "COMPLETED" : "FAILED";
    const summary =
      result.ok && imagePaths.length > 0
        ? `Generated ${imagePaths.length} image(s) with ${result.model}`
        : result.error || "Image generation failed";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        output: summary,
        summary,
        error: result.ok ? null : result.error || summary,
      },
    });

    if (!result.ok || imagePaths.length === 0) {
      return { ok: false, message: result.error || "No image was generated." };
    }

    const desc = result.description ? `\n${result.description}` : "";
    return {
      ok: true,
      message: `🖼 Generated with ${getModelLabel(result.model || DEFAULT_IMAGE_MODEL)}${desc}`,
      imageUrls,
      imagePaths,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: message,
        summary: message,
      },
    });
    return { ok: false, message };
  }
}
