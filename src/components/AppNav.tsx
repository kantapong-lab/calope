"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { th } from "@/copy/th";

const links = [
  { href: "/", label: th.nav.capture },
  { href: "/history", label: th.nav.history },
  { href: "/settings", label: th.nav.settings },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label={th.nav.label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
