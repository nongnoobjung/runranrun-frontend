import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EmptyState, Pill } from "@/components/backoffice";
import { OrganizerBar } from "@/components/organizer-bar";
import { myOrgs, ROLE_LABEL } from "@/lib/org";

export default function OrganizerHome() {
  return (
    <>
      <OrganizerBar />
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-8 sm:px-7">
        <h1 className="text-3xl font-bold">ทีมผู้จัดของคุณ</h1>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
          <Organizations />
        </Suspense>
      </div>
    </>
  );
}

async function Organizations() {
  const orgs = await myOrgs();
  // Most organisers belong to one team; skip the picker for them.
  if (orgs.length === 1) redirect(`/organizer/${orgs[0].id}`);
  if (orgs.length === 0) {
    return (
      <EmptyState>
        <p>บัญชีนี้ยังไม่ได้อยู่ในทีมผู้จัดงาน</p>
        <p className="mt-1 text-sm">ขอให้เจ้าของทีมเชิญคุณเข้าทีม หรือติดต่อทีมงานก้าวเพื่อเปิดบัญชีผู้จัด</p>
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {orgs.map((o) => (
        <li key={o.id}>
          <Link href={`/organizer/${o.id}`} className="flex flex-col gap-2 rounded-[28px] bg-white p-5 text-ink no-underline transition hover:-translate-y-0.5">
            <b className="text-lg font-semibold">{o.nameTh}</b>
            <span className="flex flex-wrap gap-2">
              <Pill label={ROLE_LABEL[o.role]} className="bg-ice text-brand" />
              {o.status !== "active" && <Pill label="รอตรวจเอกสาร" className="bg-warn-soft text-warn" />}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
