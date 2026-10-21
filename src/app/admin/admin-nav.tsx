"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The admin sections; the current one is highlighted. A sideways strip on phones. */
export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const active = items.reduce<string | undefined>(
    (best, i) => ((pathname === i.href || pathname.startsWith(`${i.href}/`)) && i.href.length > (best?.length ?? 0) ? i.href : best),
    undefined,
  );
  return (
    <nav aria-label="เมนูแอดมิน" className="mx-auto max-w-[1240px] overflow-x-auto px-4 pb-2 sm:px-7">
      <ul className="flex gap-1">
        {items.map((i) => (
          <li key={i.href} className="flex-none">
            <Link
              href={i.href}
              aria-current={i.href === active ? "page" : undefined}
              className={`block rounded-2xl px-3.5 py-2 text-[15px] whitespace-nowrap no-underline ${i.href === active ? "bg-ice font-semibold text-brand" : "text-ink hover:bg-tint"}`}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
