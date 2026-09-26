import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Good Find — meet Sam, your thoughtful companion",
  description: "Sam remembers what you like, chooses real products for the moment, and waits for your approval.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
