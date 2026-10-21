import Link from "next/link";
import { logout } from "@/app/actions";
import { Logo } from "./ui";

export function OrganizerBadge() {
  return <span className="rounded-full bg-ice px-2.5 py-0.5 text-xs font-semibold text-brand">ผู้จัดงาน</span>;
}

/** Top bar of the organisation-level backoffice pages (inside an event the sidebar takes over). */
export function OrganizerBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
        <div className="flex items-center gap-2">
          <Logo />
          <OrganizerBadge />
          {children}
        </div>
        <div className="flex items-center gap-1">
          <Link href="/" className="px-3 py-2 text-sm text-muted no-underline hover:text-ink">
            หน้าเว็บนักวิ่ง
          </Link>
          <form action={logout}>
            <button type="submit" className="px-3 py-2 text-sm text-muted hover:text-ink">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
