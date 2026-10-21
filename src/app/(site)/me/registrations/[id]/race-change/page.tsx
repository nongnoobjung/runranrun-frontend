import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelRaceChange } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { api } from "@/lib/api";
import { baht, problemMessage } from "@/lib/format";
import type { ChangeOptions } from "@/lib/types";
import { RaceChangeForm } from "./race-change-form";

export const metadata: Metadata = { title: "เปลี่ยนระยะ" };

type Props = PageProps<"/me/registrations/[id]/race-change">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

export default function RaceChangePage({ params }: Props) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <RaceChange params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function RaceChange({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const back = `/me/registrations/${id}`;
  const res = await api<ChangeOptions>(`/v1/me/registrations/${encodeURIComponent(id)}/changes`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=${back}/race-change`);
    notFound();
  }
  const o = res.data;
  const c = o.raceChange;

  return (
    <>
      <Link href={back} className="self-start font-semibold text-ink">
        ← บัตรวิ่ง
      </Link>
      <div>
        <h1 className="text-3xl font-bold">เปลี่ยนระยะ</h1>
        <p className="text-muted">
          {o.runner.th ?? o.runner.en} · ตอนนี้ {o.raceCode} · จ่ายไปแล้ว {baht(o.pricePaidSatang)}
        </p>
      </div>

      {c.open ? (
        <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="การเปลี่ยนระยะที่รอชำระ">
          <span className="self-start rounded-full bg-warn-soft px-3 py-1 text-[13px] font-semibold text-warn">รอชำระเงิน</span>
          <p>
            เปลี่ยนเป็น <b className="font-semibold">{c.open.toRaceCode}</b> · ชำระ {baht(c.open.totalSatang)}
          </p>
          <p className="text-sm text-muted">จองที่ใน {c.open.toRaceCode} ไว้ให้ถึง {at.format(new Date(c.open.expiresAt))}</p>
          <Link href={`/orders/${c.open.orderId}/pay`} className={`${buttonClass} no-underline`}>
            ไปชำระเงิน
          </Link>
          <form action={cancelRaceChange.bind(null, c.open.id, o.registrationId)} className="self-center">
            <SubmitButton className="px-4 py-2 text-sm text-muted underline" pendingLabel="…">
              ไม่เปลี่ยนแล้ว อยู่ระยะเดิม
            </SubmitButton>
          </form>
        </section>
      ) : c.allowed ? (
        <RaceChangeForm registrationId={o.registrationId} options={c.options} feeSatang={c.feeSatang} until={at.format(new Date(c.until))} />
      ) : (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {problemMessage({ code: c.reason ?? "", title: "เปลี่ยนระยะไม่ได้" })}
        </p>
      )}

      <ul className="flex list-disc flex-col gap-1.5 rounded-card bg-white p-5 pl-9 text-sm text-muted">
        <li>ไประยะที่แพงกว่า จ่ายส่วนต่างตามราคาที่เปิดขายตอนนี้{c.feeSatang > 0 && ` บวกค่าธรรมเนียม ${baht(c.feeSatang)}`}</li>
        <li>ไประยะที่ถูกกว่า ไม่คืนส่วนต่าง</li>
        <li>เปลี่ยนแล้วได้เลขบิบใหม่ของระยะนั้น ไซซ์เสื้อเดิม</li>
        <li>ถ้าขอคืนเงินภายหลัง ส่วนต่างและค่าธรรมเนียมไม่คืน</li>
      </ul>
    </>
  );
}
