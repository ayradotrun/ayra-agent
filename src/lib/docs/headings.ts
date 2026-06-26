/** Slug for heading anchor links — must match MarkdownBody heading ids. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function extractMarkdownHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  for (const line of markdown.split("\n")) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      const text = h2[1].replace(/\*\*/g, "").trim();
      headings.push({ id: slugifyHeading(text), text, level: 2 });
    } else if (h3) {
      const text = h3[1].replace(/\*\*/g, "").trim();
      headings.push({ id: slugifyHeading(text), text, level: 3 });
    }
  }
  return headings;
}

import { getDocBySlug } from "@/lib/docs/nav";

/** Breadcrumb trail for current docs path. */
export function getDocsBreadcrumb(pathname: string): { label: string; href?: string }[] {
  if (pathname === "/docs") {
    return [{ label: "Getting Started", href: "/docs" }, { label: "Introduction" }];
  }
  if (pathname === "/docs/resources") {
    return [{ label: "Resources", href: "/docs/resources" }, { label: "Overview" }];
  }
  const slug = pathname.replace(/^\/docs\//, "");
  const doc = getDocBySlug(slug);
  if (doc) {
    return [{ label: doc.category, href: "/docs" }, { label: doc.title }];
  }
  return [{ label: "Documentation", href: "/docs" }];
}
