"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import {
  readBoardAutoLoadFromSearch,
  readBoardUrlFromSearch,
} from "@/lib/board-remote-url";
import {
  EMBED_LOAD_MESSAGE,
  EMBED_READY_MESSAGE,
} from "@/lib/embed-messages";
import {
  isAllowedEmbedHostOrigin,
  isEmbedHostedInParentWindow,
  readParentOriginsFromSearch,
} from "@/lib/embed-host-origin";

const BoardEmbedShell = dynamic(
  () => import("@/components/board-embed-shell").then((m) => m.BoardEmbedShell),
  {
    ssr: false,
    loading: () => <div className="h-dvh w-full bg-background" aria-busy="true" />,
  },
);

export default function EmbedPage() {
  const [documentText, setDocumentText] = useState<string | undefined>();
  const [src, setSrc] = useState<string | undefined>();
  const [editable, setEditable] = useState(false);
  const [hostManaged, setHostManaged] = useState(false);

  const allowedParentOrigins = useMemo(() => {
    if (typeof window === "undefined") return [];
    return readParentOriginsFromSearch(window.location.search);
  }, []);

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

    const hosted = isEmbedHostedInParentWindow();
    setHostManaged(hosted);

    if (hosted) {
      let disposed = false;
      let bridge: import("@/lib/embed-host-bridge").EmbedHostBridge | null = null;
      const onMessage = (event: MessageEvent) => {
        if (!isAllowedEmbedHostOrigin(event.origin, allowedParentOrigins)) return;
        bridge?.handleMessage(event);
      };
      window.addEventListener("message", onMessage);
      void import("@/lib/embed-host-bridge").then(({ createEmbedHostBridge }) => {
        if (disposed) return;
        bridge = createEmbedHostBridge({ allowedParentOrigins });
        bridge.postReady();
      });
      return () => {
        disposed = true;
        window.removeEventListener("message", onMessage);
        bridge?.dispose();
      };
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== EMBED_LOAD_MESSAGE || typeof event.data.json !== "string") return;
      if (event.data.editable === true) setEditable(true);
      setDocumentText(event.data.json);
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: EMBED_READY_MESSAGE, hostProtocol: 1 }, "*");

    return () => window.removeEventListener("message", onMessage);
  }, [allowedParentOrigins]);

  const allowViewManagement = editable && (hostManaged || editable);

  return (
    <div className="h-dvh w-full">
      <BoardEmbedShell
        document={hostManaged ? undefined : documentText}
        src={src}
        editable={editable}
        allowViewManagement={allowViewManagement}
        allowFullscreen
        fullscreenOnClick
        style={{ minHeight: "100%" }}
      />
    </div>
  );
}