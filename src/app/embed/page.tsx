"use client";

import { useEffect, useState } from "react";

import { BoardEmbedShell } from "@/components/board-embed-shell";
import {
  readBoardAutoLoadFromSearch,
  readBoardUrlFromSearch,
} from "@/lib/board-remote-url";
import { EMBED_LOAD_MESSAGE, EMBED_READY_MESSAGE } from "@/lib/embed-messages";

export default function EmbedPage() {
  const [documentText, setDocumentText] = useState<string | undefined>();
  const [src, setSrc] = useState<string | undefined>();
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setEditable(params.get("editable") === "1");

    const boardUrl = readBoardUrlFromSearch(window.location.search);
    const autoLoad = readBoardAutoLoadFromSearch(window.location.search);
    if (boardUrl && (autoLoad || params.get("embed") === "1")) {
      setSrc(boardUrl);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== EMBED_LOAD_MESSAGE || typeof event.data.json !== "string") return;
      if (event.data.editable === true) setEditable(true);
      setDocumentText(event.data.json);
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: EMBED_READY_MESSAGE }, "*");

    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="h-dvh w-full">
      <BoardEmbedShell
        document={documentText}
        src={src}
        editable={editable}
        allowFullscreen
        fullscreenOnClick
        style={{ minHeight: "100%" }}
      />
    </div>
  );
}
