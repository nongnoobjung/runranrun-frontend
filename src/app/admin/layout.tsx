import type { Metadata } from "next";
import { Document } from "@/components/document";
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { Logo } from "@/components/ui";
import { adminMeOrNull } from "@/lib/admin";
import { organizerHref } from "@/lib/hosts";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "แอดมิน", template: "%s · แอดมิน · ก้าว" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  // A root layout of its own, like the organiser's; admin stays Thai.
  return (
    <Document lang="th">
      <div className="flex min-h-full flex-1 flex-col bg-tint">
        <header className="bg-white">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">แอดมิน</span>
            </div>
            <Suspense fallback={null}>
              <Account />
            </Suspense>
          </div>
          <Suspense fallback={<div className="h-12" />}>
            <Nav />
          </Suspense>
        </header>
        <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-4 py-6 sm:px-7">{children}</main>
      </div>
    </Document>
  );
}

/** Shown once signed in, so the login page has none of it. */
async function Account() {
  if (!(await adminMeOrNull())) return null;
  return (
    <div className="flex items-center gap-1">
      {/* The organiser backoffice is another domain with its own sign-in; /organizer jumps there. */}
      <a href={organizerHref()} className="px-3 py-2 text-sm text-muted no-underline hover:text-ink">
        หลังบ้านผู้จัดงาน
      </a>
      <form action={logout}>
        <button type="submit" className="px-3 py-2 text-sm text-muted hover:text-ink">
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}

async function Nav() {
  // People who are not platform staff get the 404 from the page itself: a notFound() thrown here,
  // in a root layout, would skip admin/not-found.tsx.
  const me = await adminMeOrNull();
  if (!me) return null;
  return (
    <AdminNav
      items={[
        { href: "/", label: "ภาพรวม" },
        { href: "/reviews", label: "ตรวจงาน" },
        { href: "/organizations", label: "ผู้จัดงาน" },
        ...(me.can.payouts ? [{ href: "/payouts", label: "จ่ายเงินผู้จัด" }] : []),
        ...(me.can.fees ? [{ href: "/fees", label: "ค่าธรรมเนียม" }] : []),
        { href: "/users", label: "ผู้ใช้" },
        { href: "/audit", label: "บันทึกการทำงาน" },
      ]}
    />
  );
}
