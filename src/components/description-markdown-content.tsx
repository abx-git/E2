"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MouseEvent, PointerEvent } from "react";

import { normalizeDescriptionMarkdown } from "@/lib/description-markdown";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-1 last:mb-0 leading-snug">{children}</p>,
  h1: ({ children }) => (
    <h3 className="mb-1 mt-0.5 text-[0.8rem] font-semibold leading-snug">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="mb-1 mt-0.5 text-[0.75rem] font-semibold leading-snug">{children}</h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-0.5 mt-0.5 text-[0.7rem] font-semibold leading-snug">{children}</h5>
  ),
  h4: ({ children }) => (
    <h6 className="mb-0.5 mt-0.5 text-[0.7rem] font-medium leading-snug">{children}</h6>
  ),
  ul: ({ children }) => <ul className="mb-1 list-disc space-y-0.5 pl-3.5 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-1 list-decimal space-y-0.5 pl-3.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-1 border-l-2 border-current/40 pl-2 opacity-90 last:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-current/40 underline-offset-2 hover:opacity-90"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded bg-black/25 p-1.5 font-mono text-[0.62rem] leading-relaxed">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-black/15 px-1 py-px font-mono text-[0.62rem]">{children}</code>
    );
  },
  pre: ({ children }) => <pre className="mb-1 overflow-x-auto last:mb-0">{children}</pre>,
  hr: () => <hr className="my-1.5 border-current/25" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};

export interface DescriptionMarkdownContentProps {
  markdown: string | undefined;
  /** Compact preview in the detail dock (max height + scroll). */
  compact?: boolean;
  className?: string;
}

/** Renders description markdown (GFM: lists, headings, code, links). */
export function DescriptionMarkdownContent({
  markdown,
  compact = false,
  className = "",
}: DescriptionMarkdownContentProps) {
  const content = normalizeDescriptionMarkdown(markdown ?? "");
  if (!content.trim()) return null;

  const stopDragOnInteractive = (e: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    const el = e.target;
    if (el instanceof Element && el.closest("a, button")) {
      e.stopPropagation();
    }
  };

  return (
    <div
      className={[
        "description-markdown min-w-0",
        compact ? "max-h-48 overflow-y-auto pr-1" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={stopDragOnInteractive}
      onClick={stopDragOnInteractive}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
