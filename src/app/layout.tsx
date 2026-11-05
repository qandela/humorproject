import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Joke Collection | Humor Project",
  description: "A little collection of laughs, freshly read from Supabase.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
