import type { SkillDefinition } from "./base";
import { websiteHealthCheck } from "./website-health";
import { telegramNotify } from "./telegram-notify";
import { rssReader } from "./rss-reader";
import { solanaRpcMonitor } from "./solana-rpc";
import { memoryStorage } from "./memory-storage";
import { memorySearch } from "./memory-search";
import { xDraftGenerator } from "./x-draft-generator";
import { githubRepoAnalyzer } from "./github-repo-analyzer";
import { solanaWalletTracker } from "./solana-wallet-tracker";
import { solanaTokenInfo } from "./solana-token-info";
import { tokenRecommendation } from "./token-recommendation";
import { xPost } from "./x-post";
import { xThreadDrafter } from "./x-thread-drafter";
import { viralTopicFinder } from "./viral-topic-finder";
import { xProfileLookup } from "./x-profile-lookup";
import { xTimelineReader } from "./x-timeline-reader";
import { webSearch, newsMonitor, websiteScraper, documentationReader } from "./research-skills";
import { sslMonitor, domainExpiryMonitor, performanceAudit, seoAudit } from "./website-skills";
import { replyGenerator, contentCalendar, engagementAnalyzer } from "./social-skills-extra";
import {
  githubReader,
  issueAssistant,
  codeReviewAssistant,
  errorAnalyzer,
  deploymentMonitor,
  logReader,
} from "./developer-skills";
import {
  vpsMonitor,
  cpuMonitor,
  ramMonitor,
  diskMonitor,
  pm2Monitor,
  nginxMonitor,
  dockerMonitor,
} from "./devops-skills";
import { dexMonitor, newTokenMonitor, portfolioTracker } from "./crypto-skills-extra";
import { csvReader, excelReader, databaseQuery, reportGenerator, chartGenerator } from "./data-skills";
import { discordNotify, slackNotify, emailNotify } from "./notification-skills-extra";
import { taskPlanner, goalTracker, scheduledTasks } from "./agent-core-skills";
import {
  brainTaskSchedule,
  brainTaskList,
  brainTaskCancel,
  brainCalendarPlan,
} from "@/lib/brain/brain-task-skills";
import { imageGenerator } from "./image-generator";
import { tokenPriceTracker } from "./token-price-tracker";
import { solPriceChecker } from "./sol-price-checker";
import { PROFESSIONAL_SKILLS } from "./professional-skills";
import { tokenQuickLookup, trendingTokens } from "./token-quick-lookup";
import { AYRA_ALERT_SKILLS } from "./ayra-alerts";
import { AYRA_RESEARCH_SKILLS } from "./ayra-research-skills";
import { HERMES_RESEARCH_SKILLS } from "./hermes-research-skills";
import { HERMES_GITHUB_SKILLS } from "./hermes-github-skills";
import { CRYPTO_ADVANCED_SKILLS } from "./crypto-advanced-skills";
import { ALL_SKILL_DEFINITIONS, SKILL_CATEGORIES } from "./catalog";

export { ALL_SKILL_DEFINITIONS, SKILL_CATEGORIES };

export const WORKING_SKILLS: SkillDefinition[] = [
  websiteHealthCheck,
  telegramNotify,
  rssReader,
  solanaRpcMonitor,
  memoryStorage,
  memorySearch,
  xDraftGenerator,
  githubRepoAnalyzer,
  solanaWalletTracker,
  solanaTokenInfo,
  tokenRecommendation,
  xPost,
  xThreadDrafter,
  viralTopicFinder,
  xProfileLookup,
  xTimelineReader,
  webSearch,
  newsMonitor,
  websiteScraper,
  documentationReader,
  sslMonitor,
  domainExpiryMonitor,
  performanceAudit,
  seoAudit,
  replyGenerator,
  contentCalendar,
  engagementAnalyzer,
  githubReader,
  issueAssistant,
  codeReviewAssistant,
  errorAnalyzer,
  deploymentMonitor,
  logReader,
  vpsMonitor,
  cpuMonitor,
  ramMonitor,
  diskMonitor,
  pm2Monitor,
  nginxMonitor,
  dockerMonitor,
  dexMonitor,
  newTokenMonitor,
  portfolioTracker,
  csvReader,
  excelReader,
  databaseQuery,
  reportGenerator,
  chartGenerator,
  discordNotify,
  slackNotify,
  emailNotify,
  taskPlanner,
  goalTracker,
  scheduledTasks,
  brainTaskSchedule,
  brainTaskList,
  brainTaskCancel,
  brainCalendarPlan,
  imageGenerator,
  tokenPriceTracker,
  solPriceChecker,
  ...PROFESSIONAL_SKILLS,
  tokenQuickLookup,
  trendingTokens,
  ...AYRA_ALERT_SKILLS,
  ...AYRA_RESEARCH_SKILLS,
  ...HERMES_RESEARCH_SKILLS,
  ...HERMES_GITHUB_SKILLS,
  ...CRYPTO_ADVANCED_SKILLS,
];

export const SKILL_REGISTRY = new Map<string, SkillDefinition>(
  WORKING_SKILLS.map((s) => [s.slug, s])
);

export function getSkill(slug: string): SkillDefinition | undefined {
  return SKILL_REGISTRY.get(slug);
}

export function getWorkingSkillSlugs(): string[] {
  return WORKING_SKILLS.map((s) => s.slug);
}
