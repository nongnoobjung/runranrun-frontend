import Link from "next/link";
import { Suspense } from "react";
import { getToken } from "@/lib/session";
import { logout } from "@/app/actions";
import { Logo } from "./ui";

async function AccountLinks() {
  const signedIn = Boolean(await getToken());
  if (!signedIn) {
    return (
      <Link href="/login" className="rounded-full bg-brand px-5 py-2.5 text-[15px] font-semibold text-white no-underline hover:bg-brand-dark">
        เข้าสู่ระบบ
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/me/events" className="rounded-full border-[1.5px] border-line-strong px-4 py-2 text-[15px] text-ink no-underline hover:border-brand">
        งานของฉัน
      </Link>
      <form action={logout}>
        <button type="submit" className="hidden px-3 py-2 text-sm text-muted hover:text-ink sm:block">
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-x-9 gap-y-3 px-4 py-4 sm:px-7">
        <Logo />
        <nav aria-label="เมนูหลัก" className="hidden flex-1 gap-7 text-[15px] md:flex">
          <Link href="/" className="font-semibold text-ink no-underline">
            หางานวิ่ง
          </Link>
          <span className="text-muted" title="เร็ว ๆ นี้">ผลการแข่งขัน</span>
          <Link href="/organizer" className="text-ink no-underline">
            สำหรับผู้จัดงาน
          </Link>
        </nav>
        <Suspense fallback={<div className="h-11 w-28" />}>
          <AccountLinks />
        </Suspense>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-tint">
      <div className="mx-auto flex max-w-[1240px] flex-wrap gap-10 px-4 py-9 text-sm text-muted sm:px-7">
        <div className="flex flex-[2_1_260px] flex-col gap-1.5">
          <b className="text-xl text-ink">ก้าว</b>
          <span>รับสมัครงานวิ่งทั่วไทย สำหรับนักวิ่งและผู้จัดงาน</span>
        </div>
        <div className="flex flex-[1_1_150px] flex-col gap-1.5">
          <b className="text-ink">นักวิ่ง</b>
          <span>วิธีสมัคร</span>
          <span>นโยบายคืนเงิน</span>
        </div>
        <div className="flex flex-[1_1_150px] flex-col gap-1.5">
          <b className="text-ink">ข้อมูล</b>
          <span>นโยบายความเป็นส่วนตัว (PDPA)</span>
          <span>เงื่อนไขการใช้งาน</span>
        </div>
      </div>
    </footer>
  );
}
