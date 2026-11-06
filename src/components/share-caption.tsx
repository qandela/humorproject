"use client";

import { useState } from "react";

export function ShareCaption({ id, content }: { id: string; content: string }) {
  const [message, setMessage] = useState("");
  async function copy(kind: "caption" | "link") {
    const text = kind === "caption" ? content : new URL(`/?caption=${id}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(text);
      setMessage(kind === "caption" ? "Caption copied" : "Link copied");
    } catch {
      setMessage("Copy isn’t available here. Open the caption to select its text.");
    }
  }
  return <div className="share-control">
    <div className="copy-buttons"><button type="button" onClick={() => copy("caption")}>Copy text</button><button type="button" onClick={() => copy("link")}>Copy link ↗</button></div>
    <span className="copy-feedback" role="status">{message}</span>
  </div>;
}
