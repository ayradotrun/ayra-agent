import { notFound } from "next/navigation";
import { DocsLayout, docsMetadata } from "@/components/docs/docs-layout";
import { DocsArticleHeader, DocsPager } from "@/components/docs/docs-ui";
import { DocsTocMobile } from "@/components/docs/docs-toc";
import { MarkdownBody } from "@/components/docs/markdown-body";
import { loadDocMarkdown } from "@/lib/docs/load-doc";
import { extractMarkdownHeadings } from "@/lib/docs/headings";
import { getDocGithubUrl } from "@/lib/docs/github";
import { DOC_PAGES, getDocBySlug } from "@/lib/docs/nav";

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOC_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return {};
  return docsMetadata(doc.title, doc.description);
}

export default async function DocArticlePage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const markdown = loadDocMarkdown(doc.file);
  if (!markdown) notFound();

  const tocHeadings = extractMarkdownHeadings(markdown);
  const index = DOC_PAGES.findIndex((p) => p.slug === slug);
  const prev = index > 0 ? DOC_PAGES[index - 1] : null;
  const next = index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : null;

  return (
    <DocsLayout tocHeadings={tocHeadings}>
      <DocsArticleHeader
        category={doc.category}
        title={doc.title}
        description={doc.description}
        icon={doc.icon}
        githubHref={getDocGithubUrl(doc.file)}
      />

      <DocsTocMobile headings={tocHeadings} />

      <MarkdownBody content={markdown} />

      <DocsPager
        prev={prev ? { slug: prev.slug, title: prev.title } : null}
        next={next ? { slug: next.slug, title: next.title } : null}
      />
    </DocsLayout>
  );
}
