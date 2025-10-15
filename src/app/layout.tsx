import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RouteIQ",
  description: "Lead-to-revenue automation UI (Composio)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white text-black dark:bg-black dark:text-white`}>
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-6xl flex items-center justify-between p-4">
            <Link href="/" className="font-semibold">RouteIQ</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/leads" className="hover:underline">Leads</Link>
              <Link href="/activity" className="hover:underline">Activity</Link>
              <Link href="/chat" className="hover:underline">Chatbot</Link>
              <Link href="/admin" className="hover:underline">Admin</Link>
              <Link href="/marketing" className="hover:underline">Marketing</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
