"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DOC_PROSE =
  "docs-prose space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-7 " +
  "[&_h1]:hidden [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-border/40 [&_h2]:pb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground sm:[&_h2]:text-lg " +
  "[&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground sm:[&_h3]:text-base " +
  "[&_p]:leading-relaxed [&_ul]:mt-2 [&_ul]:space-y-1.5 [&_ol]:mt-2 [&_ol]:space-y-1.5 [&_li]:ml-4 [&_ul>li]:list-disc [&_ol>li]:list-decimal " +
  "[&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline " +
  "[&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground/90 " +
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/[0.08] [&_pre]:bg-black/40 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm " +
  "[&_th]:border [&_th]:border-white/[0.08] [&_th]:bg-white/[0.04] [&_th]:px-3 [&_th]:py-2 [&_th]:font-medium [&_th]:text-foreground " +
  "[&_td]:border [&_td]:border-white/[0.08] [&_td]:px-3 [&_td]:py-2 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_hr]:my-8 [&_hr]:border-border/40";

interface MarkdownBodyProps {
  content: string;
}

export function MarkdownBody({ content }: MarkdownBodyProps) {
  return (
    <div className={DOC_PROSE}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
