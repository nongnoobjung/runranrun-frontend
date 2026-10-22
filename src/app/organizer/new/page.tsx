import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/backoffice";
import { OrganizerBar } from "@/components/organizer-bar";
import { myOrgs } from "@/lib/org";
import { getToken } from "@/lib/session";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "เปิดทีมผู้จัดงาน" };

const STEPS = [
  ["เปิดทีม", "ตั้งชื่อทีมและช่องทางติดต่อ คุณเป็นเจ้าของทีม"],
  ["ส่งข้อมูลและเอกสาร", "ข้อมูลบริษัท บัตรประชาชนผู้มีอำนาจ หน้าสมุดบัญชี และบัญชีรับเงิน"],
  ["ทีมงานก้าวตรวจ", "ระหว่างรอสร้างงานได้เลย เปิดรับสมัครได้เมื่อเอกสารผ่าน"],
] as const;

export default function NewOrganizerPage() {
  return (
    <>
      <OrganizerBar />
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-4 py-8 sm:px-7">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
          <NewTeam />
        </Suspense>
      </div>
    </>
  );
}

async function NewTeam() {
  if (!(await getToken())) redirect("/login?next=/new");
  const orgs = await myOrgs();
  return (
    <>
      <div className="flex flex-col gap-1">
        {orgs.length > 0 && (
          <Link href="/" className="text-sm text-muted no-underline hover:text-ink">
            ← ทีมผู้จัดของคุณ
          </Link>
        )}
        <h1 className="text-3xl font-bold">เปิดทีมผู้จัดงาน</h1>
        <p className="text-muted">รับสมัครนักวิ่งบนก้าว รับเงินเข้าบัญชีของทีมหลังงานจบ</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map(([title, detail], i) => (
          <li key={title} className="flex gap-3 rounded-[24px] bg-white p-4">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ice text-sm font-bold text-brand">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5 text-sm">
              <b className="font-semibold">{title}</b>
              <span className="text-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <Card>
        <SignupForm />
      </Card>
    </>
  );
}
