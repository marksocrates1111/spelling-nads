import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppProviders from "./providers"; // Import our new master provider
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spelling Nads",
  description: "The AI-Powered Spelling Showdown",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-200`}>
        {/* Wrap the entire application in our providers */}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
