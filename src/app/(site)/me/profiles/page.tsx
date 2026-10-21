import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { deleteProfile } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { fmt, profileLabel } from "@/lib/format";
import type { RunnerProfile } from "@/lib/types";

export const metadata: Metadata = { title: "ข้อมูลผู้วิ่ง" };

export default function ProfilesPage() {
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          ← งานของฉัน
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">ข้อมูลผู้วิ่ง</h1>
            <p className="text-sm text-muted">บันทึกไว้แล้วตอนสมัครเลือกได้เลย ไม่ต้องกรอกใหม่</p>
          </div>
          <Link href="/me/profiles/new" className={`${buttonClass} min-h-11 px-5 no-underline`}>
            + เพิ่มผู้วิ่ง
          </Link>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Profiles />
        </Suspense>
      </div>
    </div>
  );
}

const GENDER: Record<RunnerProfile["gender"], string> = { male: "ชาย", female: "หญิง", other: "ไม่ระบุ" };

async function Profiles() {
  const res = await api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/profiles");
    throw new Error(res.problem.title);
  }
  const items = res.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center">
        <p>ยังไม่ได้บันทึกผู้วิ่ง</p>
        <p className="mt-1 text-sm text-muted">เพิ่มตัวเองและคนที่สมัครให้บ่อย ๆ หรือติ๊ก &ldquo;บันทึกไว้ใช้ครั้งหน้า&rdquo; ตอนสมัคร</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label="ผู้วิ่งที่บันทึกไว้">
      {items.map((p) => (
        <li key={p.id} className="flex flex-col gap-3 rounded-card bg-white p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-full bg-sky text-lg font-bold">
              {Array.from(p.firstNameTh ?? p.firstNameEn)[0]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <b className="font-semibold">{profileLabel(p)}</b>
              <span className="text-[13px] text-muted">
                {p.firstNameEn} {p.lastNameEn} · {GENDER[p.gender]} · เกิด {fmt.date(p.birthDate)}
              </span>
              <span className="text-[13px] text-muted">
                {p.idDocType === "passport" ? "พาสปอร์ต" : "บัตรประชาชน"} ••••{p.idDocLast4}
                {p.shirtSize && ` · เสื้อ ${p.shirtSize}`}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/me/profiles/${p.id}`} className="flex min-h-10 items-center rounded-full bg-ice px-4 text-sm font-semibold text-brand no-underline">
              แก้ไข
            </Link>
            <form action={deleteProfile.bind(null, p.id)}>
              <SubmitButton className="min-h-10 rounded-full px-4 text-sm text-muted ring-1 ring-line-strong" pendingLabel="…">
                ลบ
              </SubmitButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
