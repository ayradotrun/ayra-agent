import { resolveChatModel, resolveImageModel } from "@/lib/user-models";

type AgentLike = {
  model: string;
  imageModel?: string | null;
  [key: string]: unknown;
};

/** Attach effective models from User Settings for dashboard display */
export function enrichAgentWithUserModels<T extends AgentLike>(
  agent: T,
  userDefaults: { defaultModel?: string | null; defaultImageModel?: string | null }
): T & { effectiveChatModel: string; effectiveImageModel: string } {
  return {
    ...agent,
    effectiveChatModel: resolveChatModel(agent.model, userDefaults.defaultModel),
    effectiveImageModel: resolveImageModel(agent.imageModel, userDefaults.defaultImageModel),
  };
}
