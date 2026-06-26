"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugifyHeading } from "@/lib/docs/headings";

const DOC_PROSE =
  "docs-prose space-y-6 text-[17px] leading-8 text-muted-foreground " +
  "[&_h1]:hidden " +
  "[&_h2]:mt-12 [&_h2]:scroll-mt-[var(--docs-scroll-offset)] [&_h2]:border-b [&_h2]:border-white/[0.06] [&_h2]:pb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground first:[&_h2]:mt-0 " +
  "[&_h3]:mt-8 [&_h3]:scroll-mt-[var(--docs-scroll-offset)] [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground " +
  "[&_h4]:mt-6 [&_h4]:text-lg [&_h4]:font-medium [&_h4]:text-foreground " +
  "[&_p]:leading-8 [&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_ul]:mt-3 [&_ul]:space-y-2.5 [&_ol]:mt-3 [&_ol]:space-y-2.5 [&_li]:ml-5 [&_ul>li]:list-disc [&_ol>li]:list-decimal [&_li]:text-muted-foreground " +
  "[&_a]:font-medium [&_a]:text-emerald-400 [&_a]:underline-offset-2 hover:[&_a]:underline " +
  "[&_code]:rounded-md [&_code]:border [&_code]:border-white/[0.06] [&_code]:bg-white/[0.04] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-emerald-200/90 " +
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/[0.08] [&_pre]:bg-[#0a0c0f] [&_pre]:p-4 [&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[15px] [&_pre_code]:leading-6 [&_pre_code]:text-foreground/90 " +
  "[&_table]:my-6 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-white/[0.08] [&_table]:text-base " +
  "[&_thead]:bg-white/[0.04] " +
  "[&_th]:border-b [&_th]:border-white/[0.08] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-foreground/80 " +
  "[&_td]:border-b [&_td]:border-white/[0.06] [&_td]:px-4 [&_td]:py-3 [&_tr:last-child_td]:border-0 " +
  "[&_blockquote]:my-6 [&_blockquote]:rounded-xl [&_blockquote]:border [&_blockquote]:border-emerald-500/20 [&_blockquote]:bg-emerald-500/[0.06] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:text-base [&_blockquote]:leading-7 [&_blockquote]:not-italic [&_blockquote]:text-muted-foreground " +
  "[&_hr]:my-10 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-white/[0.06]";

function headingText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(String).join("");
  return String(children ?? "");
}

interface MarkdownBodyProps {
  content: string;
}

export function MarkdownBody({ content }: MarkdownBodyProps) {
  return (
    <div className={DOC_PROSE}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...props }) => {
            const id = slugifyHeading(headingText(children));
            return (
              <h2 id={id} {...props}>
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const id = slugifyHeading(headingText(children));
            return (
              <h3 id={id} {...props}>
                {children}
              </h3>
            );
          },
          a: ({ href, children, ...props }) => {
            const url = href ?? "";
            if (url.startsWith("/")) {
              return (
                <Link href={url} {...props}>
                  {children}
                </Link>
              );
            }
            if (url.startsWith("#")) {
              return (
                <a href={url} {...props}>
                  {children}
                </a>
              );
            }
            return (
              <a href={url} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
