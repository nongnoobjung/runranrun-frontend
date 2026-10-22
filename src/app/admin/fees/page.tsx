import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader } from "@/components/backoffice";
import { setDefaultFee } from "@/app/admin/actions";
import { adminGet, feeLabel, type AdminFees } from "@/lib/admin";
import { FeeForm } from "../fee-form";
import { FeeHistory } from "../fee-history";

export const metadata: Metadata = { title: "ค่าธรรมเนียมแพลตฟอร์ม" };

const day = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default function FeesPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="ค่าธรรมเนียมแพลตฟอร์ม" />
          <div className="h-48 animate-pulse rounded-[28px] bg-white" aria-busy="true" />
        </>
      }
    >
      <Fees />
    </Suspense>
  );
}

async function Fees() {
  // Only finance, admin and superadmin get this far (the API's `fees` permission); they may all change rates.
  const fees = await adminGet<AdminFees>("/platform-fees", "/admin/fees");
  const d = fees.default;
  return (
    <>
      <PageHeader title="ค่าธรรมเนียมแพลตฟอร์ม" eyebrow="หักจากยอดของผู้จัดก่อนโอน ไม่ได้เก็บเพิ่มจากนักวิ่ง" />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card title="อัตรา default">
          <p className="text-sm">
            ตอนนี้: <b className="text-lg">{feeLabel(d.current)}</b>
            <span className="block text-[13px] text-muted">ใช้กับผู้จัดทุกทีมที่ไม่มีอัตราของตัวเอง</span>
          </p>
          <FeeForm action={setDefaultFee} current={d.current} />
          <FeeHistory rows={d.history} label="ประวัติอัตรา default" />
        </Card>
        <Card title="ผู้จัดที่มีอัตราของตัวเอง">
          {fees.organizations.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มี ทุกทีมใช้อัตรา default ตั้งอัตราเฉพาะทีมได้ที่หน้าผู้จัด</p>
          ) : (
            <ul aria-label="ผู้จัดที่มีอัตราของตัวเอง" className="flex flex-col divide-y divide-line text-sm">
              {fees.organizations.map((o) => (
                <li key={o.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                  <Link href={`/admin/organizations/${o.id}`} className="font-semibold">
                    {o.nameTh}
                  </Link>
                  <span>{o.current ? feeLabel(o.current) : <span className="text-muted">ใช้อัตรา default จนกว่าอัตราที่ตั้งไว้จะเริ่ม</span>}</span>
                  {o.scheduled.map((s) => (
                    <span key={s.id} className="text-[13px] text-warn">
                      ตั้งแต่ {day.format(new Date(s.effectiveFrom))}: {feeLabel(s)}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
