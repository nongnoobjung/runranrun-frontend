import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { declineTransfer } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { baht, fmt } from "@/lib/format";
import type { Transfer } from "@/lib/types";

export const metadata: Metadata = { title: "โอนสิทธิ์" };

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

const STATUS: Record<Transfer["status"], [string, string]> = {
  pending: ["รอผู้รับ", "bg-warn-soft text-warn"],
  accepted: ["รอชำระค่าธรรมเนียม", "bg-warn-soft text-warn"],
  completed: ["โอนแล้ว", "bg-ok-soft text-ok"],
  rejected: ["ผู้รับปฏิเสธ", "bg-tint text-muted"],
  expired: ["หมดเวลา", "bg-tint text-muted"],
  cancelled: ["ยกเลิกแล้ว", "bg-tint text-muted"],
};

export default function TransfersPage() {
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          ← งานของฉัน
        </Link>
        <h1 className="text-3xl font-bold">โอนสิทธิ์</h1>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Transfers />
        </Suspense>
      </div>
    </div>
  );
}

async function Transfers() {
  const res = await api<{ incoming: Transfer[]; outgoing: Transfer[] }>("/v1/me/transfers", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/transfers");
    throw new Error(res.problem.title);
  }
  const { incoming, outgoing } = res.data;
  const open = incoming.filter((t) => t.status === "pending" || t.status === "accepted");

  return (
    <>
      <section className="flex flex-col gap-3" aria-label="มีคนโอนให้คุณ">
        <h2 className="text-lg font-semibold">มีคนโอนให้คุณ</h2>
        {open.length === 0 ? (
          <p className="rounded-card bg-white p-6 text-center text-muted">ยังไม่มีใครโอนสิทธิ์ให้อีเมลนี้</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((t) => (
              <li key={t.id} className="overflow-hidden rounded-card bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                  <span className="flex min-w-0 flex-col leading-snug">
                    <b className="truncate font-semibold">{t.event.name}</b>
                    <span className="text-[13px] text-muted">{fmt.date(t.event.eventDate)}</span>
                  </span>
                  <span className="rounded-full bg-ice px-3 py-0.5 font-bold text-brand">{t.race.code}</span>
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <p className="break-words">
                    <b className="font-semibold">{t.sender}</b> โอนสิทธิ์วิ่ง {t.race.code} ให้คุณ
                    {t.shirtSize && <> · เสื้อไซซ์ {t.shirtSize}</>}
                  </p>
                  <p className="text-sm text-muted">
                    รับได้ถึง {at.format(new Date(t.expiresAt))}
                    {t.feeSatang > 0 && ` · ค่าธรรมเนียมรับโอน ${baht(t.feeSatang)}`}
                  </p>
                  {t.feeOrderId ? (
                    <Link href={`/orders/${t.feeOrderId}/pay`} className={`${buttonClass} no-underline`}>
                      ชำระค่าธรรมเนียมเพื่อรับสิทธิ์
                    </Link>
                  ) : (
                    <Link href={`/me/transfers/${t.id}`} className={`${buttonClass} no-underline`}>
                      รับสิทธิ์และกรอกข้อมูลผู้วิ่ง
                    </Link>
                  )}
                  <form action={declineTransfer.bind(null, t.id)} className="self-center">
                    <SubmitButton className="px-4 py-2 text-sm text-muted underline" pendingLabel="…">
                      ไม่รับสิทธิ์นี้
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ที่คุณโอนให้คนอื่น">
          <h2 className="text-lg font-semibold">ที่คุณโอนให้คนอื่น</h2>
          <ul className="flex flex-col">
            {outgoing.map((t) => {
              const [label, cls] = STATUS[t.status];
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className="rounded-full bg-ice px-3 py-0.5 text-sm font-bold text-brand">{t.race.code}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-snug">
                    <span className="truncate">{t.event.name}</span>
                    <span className="truncate text-[13px] text-muted">ให้ {t.toEmail}</span>
                  </span>
                  <span className={`rounded-full px-3 py-0.5 text-[13px] font-semibold ${cls}`}>{label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
