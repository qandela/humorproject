import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountNav } from "@/components/account-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Joke Collection | Humor Project",
  description: "A little collection of laughs, freshly read from Supabase.",
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
