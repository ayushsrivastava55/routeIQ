import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
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

import RoleSwitcher from "@/components/RoleSwitcher";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value || "user";
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`} style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <header className="sticky top-0 z-50 backdrop-blur-sm bg-[var(--surface)]/80 shadow-sm" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight" style={{ color: 'var(--primary)' }}>
              RouteIQ
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/leads">Leads</NavLink>
              <NavLink href="/activity">Activity</NavLink>
              <NavLink href="/chat">Chat</NavLink>
              <NavLink href="/admin">Admin</NavLink>
              <NavLink href="/marketing">Marketing</NavLink>
              <NavLink href="/apps">Apps</NavLink>
            </nav>
            <div className="flex items-center gap-3">
              <RoleSwitcher initialRole={role} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
      style={{ color: 'var(--foreground-muted)' }}
    >
      {children}
    </Link>
  );
}
