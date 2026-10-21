import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setMarketingConsent } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { api } from "@/lib/api";
import { CloseAccountForm } from "./close-account";

export const metadata: Metadata = { title: "ความเป็นส่วนตัวและข้อมูลของฉัน" };

interface Consents {
  policyVersion: string;
  current: Record<"terms" | "privacy" | "marketing", { granted: boolean; policyVersion: string; at: string } | null>;
  history: { purpose: string; granted: boolean; policyVersion: string; at: string; registration: { registrationNo: string; eventName: string } | null }[];
}

const PURPOSE: Record<string, string> = {
  terms: "เงื่อนไขการใช้งาน",
  privacy: "นโยบายความเป็นส่วนตัว",
  share_with_organizer: "ส่งข้อมูลผู้วิ่งให้ผู้จัดงาน",
  marketing: "รับข่าวสารจากก้าว",
};

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

export default function MyPrivacyPage() {
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          ← งานของฉัน
        </Link>
        <div>
          <h1 className="text-3xl font-bold">ความเป็นส่วนตัวและข้อมูลของฉัน</h1>
          <p className="text-sm text-muted">
            สิทธิ์ของคุณตาม PDPA อ่านรายละเอียดที่ <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link>
          </p>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Privacy />
        </Suspense>
      </div>
    </div>
  );
}

async function Privacy() {
  const res = await api<Consents>("/v1/me/consents", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/privacy");
    throw new Error(res.problem.title);
  }
  const c = res.data;
  const marketing = c.current.marketing?.granted ?? false;

  return (
    <>
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ความยินยอม">
        <h2 className="text-lg font-semibold">ความยินยอม</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {(["terms", "privacy"] as const).map((k) => (
            <li key={k} className="flex flex-wrap justify-between gap-2">
              <span>{PURPOSE[k]}</span>
              <span className="text-muted">{c.current[k] ? `ยอมรับเมื่อ ${at.format(new Date(c.current[k]!.at))}` : "ยังไม่เคยยอมรับ"}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <span className="flex flex-col">
            <b className="font-semibold">รับข่าวงานวิ่งจากก้าว</b>
            <span className="text-sm text-muted">{marketing ? "เปิดอยู่" : "ปิดอยู่"} · เปลี่ยนได้ทุกเมื่อ</span>
          </span>
          <form action={setMarketingConsent.bind(null, !marketing)}>
            <SubmitButton className="min-h-10 rounded-full px-4 text-sm font-semibold ring-1 ring-line-strong" pendingLabel="…">
              {marketing ? "เลิกรับข่าวสาร" : "รับข่าวสาร"}
            </SubmitButton>
          </form>
        </div>
        {c.history.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">ประวัติความยินยอม ({c.history.length.toLocaleString("th-TH")})</summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {c.history.map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {PURPOSE[h.purpose] ?? h.purpose}
                    {h.registration && ` · ${h.registration.eventName} (${h.registration.registrationNo})`}
                  </span>
                  <span className="text-muted">
                    {h.granted ? "ยินยอม" : "ถอน"} · {at.format(new Date(h.at))}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ดาวน์โหลดข้อมูล">
        <h2 className="text-lg font-semibold">ดาวน์โหลดข้อมูลของฉัน</h2>
        <p className="text-sm text-muted">
          ไฟล์ JSON รวมบัญชี ผู้วิ่งที่บันทึกไว้ การสมัคร คำสั่งซื้อ ความยินยอม คิว และการโอนสิทธิ์ เลขบัตรแสดงแค่ 4 ตัวท้าย
        </p>
        <a href="/me/privacy/export" className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-ice px-5 text-sm font-semibold text-brand no-underline">
          ดาวน์โหลดข้อมูล (JSON)
        </a>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ปิดบัญชี">
        <h2 className="text-lg font-semibold">ปิดบัญชี</h2>
        <p className="text-sm text-muted">
          ลบผู้วิ่งที่บันทึกไว้และข้อมูลติดต่อของบัญชี ถ้ายังมีงานที่สมัครไว้และยังไม่ถึงวันแข่ง ให้ขอคืนเงินหรือโอนสิทธิ์ก่อน การสมัครที่ผ่านมาแล้วยังอยู่กับผู้จัดงานตามระยะเวลาที่ระบุในนโยบาย
        </p>
        <CloseAccountForm />
      </section>
    </>
  );
}
