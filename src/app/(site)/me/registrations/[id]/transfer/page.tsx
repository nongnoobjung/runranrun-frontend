import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelTransfer } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { api } from "@/lib/api";
import { baht, problemMessage } from "@/lib/format";
import type { ChangeOptions } from "@/lib/types";
import { TransferForm } from "./transfer-form";

export const metadata: Metadata = { title: "โอนสิทธิ์" };

type Props = PageProps<"/me/registrations/[id]/transfer">;

const at = new Intl.DateTimeFormat("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });

export default function TransferPage({ params }: Props) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Transfer params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Transfer({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const back = `/me/registrations/${id}`;
  const res = await api<ChangeOptions>(`/v1/me/registrations/${encodeURIComponent(id)}/changes`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=${back}/transfer`);
    notFound();
  }
  const o = res.data;
  const t = o.transfer;
  const steps = [
    ["ใส่อีเมลของคนที่จะรับสิทธิ์", "เราส่งอีเมลแจ้งเขา และเขาเห็นสิทธิ์นี้เมื่อเข้าสู่ระบบด้วยอีเมลนั้น"],
    [
      t.feeSatang > 0 ? `ผู้รับกรอกข้อมูลผู้วิ่งและชำระค่าธรรมเนียม ${baht(t.feeSatang)}` : "ผู้รับกรอกข้อมูลผู้วิ่งของตัวเอง",
      "ต้องรับภายใน 7 วันหรือก่อนหมดเวลาโอนของงาน",
    ],
    ["สิทธิ์ เลขบิบ และไซซ์เสื้อย้ายไปเป็นของผู้รับ", "บัตรวิ่งและ QR ของคุณจะใช้ไม่ได้อีก"],
  ];

  return (
    <>
      <Link href={back} className="self-start font-semibold text-ink">
        ← บัตรวิ่ง
      </Link>
      <div>
        <h1 className="text-3xl font-bold">โอนสิทธิ์</h1>
        <p className="text-muted">
          {o.runner.th ?? o.runner.en} · {o.raceCode} · {o.event.name}
        </p>
      </div>

      {t.open ? (
        <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="การโอนที่รออยู่">
          <span className="self-start rounded-full bg-warn-soft px-3 py-1 text-[13px] font-semibold text-warn">
            {t.open.status === "accepted" ? "ผู้รับกำลังชำระค่าธรรมเนียม" : "รอผู้รับตอบรับ"}
          </span>
          <p>
            โอนให้ <b className="font-semibold break-all">{t.open.toEmail}</b>
          </p>
          <p className="text-sm text-muted">ต้องรับสิทธิ์ภายใน {at.format(new Date(t.open.expiresAt))} ระหว่างนี้สิทธิ์ยังเป็นของคุณ</p>
          <form action={cancelTransfer.bind(null, t.open.id, `${back}/transfer`)} className="self-start">
            <SubmitButton className="min-h-10 rounded-full px-4 text-sm text-bad ring-1 ring-line-strong" pendingLabel="…">
              ยกเลิกการโอน
            </SubmitButton>
          </form>
        </section>
      ) : t.allowed ? (
        <TransferForm registrationId={o.registrationId} until={at.format(new Date(t.until))} />
      ) : (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {problemMessage({ code: t.reason ?? "", title: "โอนสิทธิ์นี้ไม่ได้" })}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="โอนสิทธิ์ทำงานอย่างไร">
        <h2 className="text-lg font-semibold">โอนสิทธิ์ทำงานอย่างไร</h2>
        <ol className="flex flex-col gap-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ice font-bold text-brand">{i + 1}</span>
              <span className="flex flex-col leading-snug">
                <b className="font-semibold">{title}</b>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-muted">ค่าสมัครที่จ่ายไปแล้วคุณกับผู้รับตกลงกันเอง ระบบไม่ได้โอนเงินระหว่างกัน</p>
      </section>
    </>
  );
}
