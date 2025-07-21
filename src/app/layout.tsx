import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spelling Nads",
  description: "The AI-Powered Spelling Showdown, now on Next.js!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The root layout is now clean. It no longer contains multiplayer providers,
  // ensuring that non-game pages (like 404s) do not cause build errors.
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-200`}>
        {children}
      </body>
    </html>
  );
}
