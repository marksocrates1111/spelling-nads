// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers"; // <-- Import the new client-side wrapper
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
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-200`}>
        {/*
          The <Providers> component is a Client Component ('use client'),
          which safely renders the <MultiplayerProvider> and other client-side
          logic without breaking the Server Component structure of this layout.
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
