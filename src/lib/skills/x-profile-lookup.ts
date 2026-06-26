import { z } from "zod";
import type { SkillDefinition } from "./base";
import { lookupXUser } from "@/lib/x-api";
import { isXApiBillingMessage } from "@/lib/x-errors";

const inputSchema = z.object({
  username: z.string().min(1).describe("X username with or without @"),
});

export const xProfileLookup: SkillDefinition = {
  id: "x-profile-lookup",
  name: "X Profile Lookup",
  slug: "x-profile-lookup",
  category: "Social",
  description: "Look up an X user profile by username (requires X login in Settings).",
  icon: "user",
  permission: "network",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const username = input.username.replace(/^@/, "");
    await ctx.log("INFO", `Looking up X profile: @${username}`, "x-profile-lookup");

    try {
      const profile = await lookupXUser(ctx.userId, username);
      await ctx.log("INFO", `Profile found: ${profile.found}`, "x-profile-lookup");
      return profile;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lookup failed";
      await ctx.log("ERROR", message, "x-profile-lookup");

      const billing = isXApiBillingMessage(message);
      const hint = billing
        ? "Top up pay-per-use credits at developer.x.com → Project → Billing, then try /x again."
        : message.includes("not connected") || message.includes("X account")
          ? "Connect X in Dashboard → Settings → X (Twitter) first."
          : undefined;

      return {
        found: false,
        username,
        error: message,
        errorKind: billing ? "billing" : "api",
        hint,
      };
    }
  },
};
