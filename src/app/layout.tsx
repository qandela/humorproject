import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountNav } from "@/components/account-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus to City | The Humor Project",
  description: "AI captions for campus life and New York weekends. Make a caption, share a laugh, and vote on what lands.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<nav className="account-nav" aria-label="Main navigation">The Humor Project</nav>}>
          <AccountNav />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
