import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sheila's Glazes",
  description: "Glaze recipes and material inventory",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-3">
            <Link href="/" className="mr-2 text-lg font-bold text-stone-900">
              🏺 Glazes
            </Link>
            <NavLink href="/recipes" label="Recipes" />
            <NavLink href="/glazes" label="Glazes" />
            <NavLink href="/inventory" label="Materials" />
            <NavLink href="/backup" label="Backup" />
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
