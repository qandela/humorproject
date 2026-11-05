"use client";

import { useState } from "react";

export function ShareCaption({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    const link = new URL(`/?caption=${id}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link copied");
    } catch {
      setMessage("Open the caption link to copy its address.");
    }
  }
  return <div className="share-control">
    <button type="button" onClick={copy}>Copy link ↗</button>
    {message && <span role="status">{message}</span>}
  </div>;
}
