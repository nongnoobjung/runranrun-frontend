import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BackofficeLoginForm } from "@/components/backoffice-login";
import { OrganizerBadge } from "@/components/organizer-bar";
import { Logo } from "@/components/ui";
import { siteHref } from "@/lib/hosts";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function OrganizerLoginPage({ searchParams }: PageProps<"/organizer/login">) {
  return (
    <>
      <header className="bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <Logo />
            <OrganizerBadge />
          </div>
          <a href={siteHref("/")} className="px-3 py-2 text-sm text-muted no-underline hover:text-ink">
            หน้าเว็บนักวิ่ง
          </a>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-4 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">เข้าสู่ระบบผู้จัดงาน</h1>
          <p className="text-muted">จัดการงานวิ่ง ผู้สมัคร และยอดขายของทีมคุณ</p>
        </div>
        <div className="rounded-card bg-white p-5">
          <Suspense fallback={<div className="h-40" />}>
            <FormWithNext searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="text-sm text-muted">
          ยังไม่มีทีมผู้จัด?{" "}
          <Link href="/new" className="font-semibold text-brand">
            เปิดทีมผู้จัดงาน
          </Link>
        </p>
        <p className="text-[13px] text-muted">ระหว่างพัฒนา: เข้าสู่ระบบด้วยอีเมลได้ทันทีโดยไม่ต้องยืนยัน ระบบจริงจะใช้ LINE Login และ OTP</p>
      </div>
    </>
  );
}

async function FormWithNext({ searchParams }: Pick<PageProps<"/organizer/login">, "searchParams">) {
  const next = (await searchParams).next;
  return <BackofficeLoginForm next={typeof next === "string" ? next : "/"} />;
}
