"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/** Sidebar menu; a horizontal strip on phones. The current section is highlighted. */
export function EventNav({ items, soon }: { items: NavItem[]; soon: string[] }) {
  const pathname = usePathname();
  // The overview's href is the event root, which prefixes every other section.
  const active = items.reduce<NavItem | undefined>(
    (best, item) => (pathname === item.href || pathname.startsWith(`${item.href}/`)) && item.href.length > (best?.href.length ?? 0) ? item : best,
    undefined,
  );
  return (
    <nav aria-label="เมนูงาน" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {items.map((item) => {
          const current = item === active;
          return (
            <li key={item.href} className="flex-none">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`block rounded-2xl px-3.5 py-2.5 text-[15px] whitespace-nowrap no-underline transition ${
                  current ? "bg-ice font-semibold text-brand" : "text-ink hover:bg-tint"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {soon.length > 0 && (
        <div className="mt-4 hidden flex-col gap-1 border-t border-line pt-4 md:flex">
          <span className="px-3.5 text-xs text-muted">เร็ว ๆ นี้</span>
          {soon.map((label) => (
            <span key={label} className="px-3.5 py-1.5 text-sm text-muted/70">
              {label}
            </span>
          ))}
        </div>
      )}
    </nav>
  );
}
