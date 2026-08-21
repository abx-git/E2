"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

const Editor = dynamic(() => import("./description-mdx-editor-initialized"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-500">
      Editor wird geladen…
    </div>
  ),
});

/** WYSIWYG-Markdown-Editor (MDXEditor) für Beschreibungen — nur Client. */
export const DescriptionMarkdownEditor = forwardRef<MDXEditorMethods, MDXEditorProps>(
  function DescriptionMarkdownEditor(props, ref) {
    return <Editor {...props} editorRef={ref} />;
  },
);
