import Link from "next/link";

// The home-screen app has no browser back button, so every detail/new/edit
// page shows its own way back to the list it came from.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 print:hidden"
    >
      ← {label}
    </Link>
  );
}
