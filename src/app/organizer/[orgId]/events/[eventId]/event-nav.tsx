"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export interface NavItem {
  href: string;
  label: string;
}

/** Sidebar menu; a horizontal strip on phones. The current section is highlighted. */
export function EventNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // The overview's href is the event root, which prefixes every other section.
  const active = items.reduce<NavItem | undefined>(
    (best, item) => (pathname === item.href || pathname.startsWith(`${item.href}/`)) && item.href.length > (best?.href.length ?? 0) ? item : best,
    undefined,
  );
  // On phones the menu is a sideways strip; bring the current section into view. A no-op on wider screens.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    const offset = current.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollLeft += offset - (nav.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);
  return (
    <nav ref={navRef} aria-label="เมนูงาน" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
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
    </nav>
  );
}
