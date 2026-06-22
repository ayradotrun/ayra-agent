import { z } from "zod";
import type { SkillDefinition } from "./base";

export const websiteHealthCheck: SkillDefinition = {
  id: "website-health-check",
  name: "Website Health Check",
  slug: "website-health-check",
  category: "Website",
  description: "Check if a website is reachable and measure response time.",
  icon: "globe",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("The URL to check"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Checking health of ${input.url}`, "website-health-check");
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(input.url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      const responseTime = Date.now() - start;
      const ok = response.ok;
      await ctx.log(
        "INFO",
        `Health check: ${response.status} in ${responseTime}ms`,
        "website-health-check"
      );
      return {
        statusCode: response.status,
        responseTimeMs: responseTime,
        ok,
        status: ok ? "healthy" : "error",
      };
    } catch (error) {
      const responseTime = Date.now() - start;
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", `Health check failed: ${message}`, "website-health-check");
      return {
        statusCode: 0,
        responseTimeMs: responseTime,
        ok: false,
        status: "error",
        error: message,
      };
    }
  },
};
