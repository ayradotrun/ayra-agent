import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { getSkillBundleContent, listSkillBundles } from "@/lib/skills/skill-md-loader";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const slug = request.nextUrl.searchParams.get("slug");
  if (slug) {
    const bundle = getSkillBundleContent(slug);
    if (!bundle) {
      return NextResponse.json({ error: "Skill bundle not found" }, { status: 404 });
    }
    return NextResponse.json(bundle);
  }

  const category = request.nextUrl.searchParams.get("category")?.toLowerCase();
  let bundles = listSkillBundles();
  if (category) {
    bundles = bundles.filter((b) => b.category.toLowerCase() === category);
  }

  return NextResponse.json({
    count: bundles.length,
    bundles,
  });
}
