import fs from "fs";
import path from "path";

const FRONTMATTER = /^---\s*\n([\s\S]*?)\n---\s*\n/;

export interface SkillBundleEntry {
  slug: string;
  name: string;
  description: string;
  version: string;
  category: string;
  path: string;
  preview: string;
}

function resolveSkillsRoot(): string {
  const fromEnv = process.env.AYRA_SKILLS_DIR?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
  const repoSkills = path.join(process.cwd(), "skills");
  if (fs.existsSync(repoSkills)) return repoSkills;
  const bundled = path.join(process.cwd(), "python", "ayra", "skills", "bundles", "skills");
  if (fs.existsSync(bundled)) return bundled;
  return repoSkills;
}

function parseFrontmatter(text: string): Record<string, string> {
  const match = text.match(FRONTMATTER);
  if (!match) return {};
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = val;
  }
  return meta;
}

function walkSkillFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", "__pycache__"].includes(entry.name)) {
        walkSkillFiles(full, acc);
      }
    } else if (entry.name === "SKILL.md") {
      acc.push(full);
    }
  }
  return acc;
}

export function listSkillBundles(limit = 500): SkillBundleEntry[] {
  const root = resolveSkillsRoot();
  const files = walkSkillFiles(root).sort().slice(0, limit);
  const entries: SkillBundleEntry[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const fm = parseFrontmatter(text);
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const parts = rel.split("/");
    const slug = fm.name || parts[parts.length - 2] || path.basename(file, ".md");
    const body = text.replace(FRONTMATTER, "").trim();
    entries.push({
      slug,
      name: fm.name || slug,
      description: fm.description || "",
      version: fm.version || "",
      category: parts[0] || "",
      path: rel,
      preview: body.slice(0, 400),
    });
  }

  return entries;
}

export function getSkillBundleContent(slug: string): { entry: SkillBundleEntry; content: string } | null {
  const normalized = slug.trim().toLowerCase();
  const entry = listSkillBundles().find((s) => s.slug.toLowerCase() === normalized);
  if (!entry) return null;
  const root = resolveSkillsRoot();
  const full = path.join(root, entry.path);
  try {
    const raw = fs.readFileSync(full, "utf8");
    const content = raw.replace(FRONTMATTER, "").trim().slice(0, 12000);
    return { entry, content };
  } catch {
    return null;
  }
}

const BUNDLE_ALIASES: Record<string, string> = {
  "github-issue-search": "github-issues",
  "github-repo-info": "github-repo-management",
  "polymarket-search": "polymarket",
  "polymarket-trending": "polymarket",
  "arxiv-search": "arxiv",
  "news-digest": "blogwatcher",
};

export function skillBundlesForSlugs(slugs: string[]): string {
  const blocks: string[] = [];
  const seen = new Set<string>();

  for (const slug of slugs) {
    const candidates = [slug, BUNDLE_ALIASES[slug]].filter(Boolean) as string[];
    for (const candidate of candidates) {
      if (seen.has(candidate)) continue;
      const bundle = getSkillBundleContent(candidate);
      if (!bundle) continue;
      seen.add(candidate);
      blocks.push(`### Skill playbook: ${bundle.entry.name}\n${bundle.content.slice(0, 3000)}`);
    }
  }
  if (blocks.length === 0) return "";
  return `\n\n## Referenced skill playbooks (Hermes bundles)\n${blocks.join("\n\n")}`;
}
