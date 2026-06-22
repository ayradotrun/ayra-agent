import { z } from "zod";
import type { SkillDefinition } from "./base";
import { lookupXUser } from "@/lib/x-api";

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
      return { found: false, username, error: message };
    }
  },
};
