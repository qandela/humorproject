"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" className="button secondary" disabled={pending} onClick={() => start(() => router.refresh())}>{pending ? "Refreshing…" : label}</button>;
}
