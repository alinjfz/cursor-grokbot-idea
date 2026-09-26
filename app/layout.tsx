import { Caveat, Fraunces, Karla } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const script = Caveat({
  subsets: ["latin"],
  variable: "--font-script",
});

const sans = Karla({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Pot",
  description: "Money set aside, and a bot that spends a little of it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${script.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
