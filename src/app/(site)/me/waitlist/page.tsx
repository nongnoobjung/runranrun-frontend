import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { leaveWaitlist } from "@/app/actions";
import { Countdown } from "@/components/countdown";
import { SubmitButton } from "@/components/submit-button";
import { api } from "@/lib/api";
import { baht, fmt } from "@/lib/format";
import type { WaitlistEntry } from "@/lib/types";
import { ClaimButton } from "./claim-button";

export const metadata: Metadata = { title: "คิว waitlist" };

const STEPS = [
  ["มีที่ว่างเมื่อไหร่ ระบบเรียกตามลำดับคิว", "ไม่ต้องรีเฟรชหน้าเว็บรอ กลับมาดูที่หน้านี้ได้เลย"],
  ["ถึงคิวแล้วเราจองที่ไว้ให้ 24 ชั่วโมง", "ระหว่างนั้นไม่มีใครแย่งที่นี้ได้"],
  ["สมัครและชำระเงินเพื่อยืนยันสิทธิ์", "ถ้าไม่ทันเวลา สิทธิ์จะส่งต่อให้คิวถัดไป"],
];

export default function WaitlistPage() {
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          ← งานของฉัน
        </Link>
        <h1 className="text-3xl font-bold">คิว waitlist</h1>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Entries />
        </Suspense>
      </div>
    </div>
  );
}

async function Entries() {
  const res = await api<{ items: WaitlistEntry[] }>("/v1/me/waitlist", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/waitlist");
    throw new Error(res.problem.title);
  }
  const items = res.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center">
        <p>คุณไม่ได้อยู่ในคิวไหน</p>
        <p className="mt-1 text-sm text-muted">ถ้าระยะที่อยากวิ่งเต็ม กดเข้าคิว waitlist ได้ที่หน้างาน</p>
      </div>
    );
  }
  return (
    <>
      <ul className="flex flex-col gap-4" aria-label="คิวของฉัน">
        {items.map((w) => (
          <li key={w.id} className="overflow-hidden rounded-card bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <span className="flex min-w-0 flex-col leading-snug">
                <Link href={`/events/${w.event.slug}`} className="truncate font-semibold text-ink no-underline">
                  {w.event.name}
                </Link>
                <span className="text-[13px] text-muted">{fmt.date(w.event.eventDate)}</span>
              </span>
              <span className="rounded-full bg-ice px-3 py-0.5 font-bold text-brand">{w.race.code}</span>
            </div>
            {w.status === "offered" ? (
              <div className="flex flex-col gap-3 p-5">
                <div className="rounded-[20px] bg-sky p-5 text-center">
                  <b className="text-xl font-bold">ถึงคิวคุณแล้ว</b>
                  <p className="text-sm">เราจองที่ {w.race.code} ไว้ให้ เหลือเวลา</p>
                  {w.offerExpiresAt && <Countdown until={w.offerExpiresAt} className="text-3xl font-bold" />}
                </div>
                <p className="text-sm text-muted">ถ้าไม่สมัครและชำระเงินภายในเวลา ที่นี้จะส่งต่อให้คิวถัดไป</p>
                <ClaimButton entryId={w.id} label={`สมัครและชำระเงิน${w.priceSatang !== null ? ` · ${baht(w.priceSatang)}` : ""}`} />
                <form action={leaveWaitlist.bind(null, w.id)} className="self-center">
                  <SubmitButton className="px-4 py-2 text-sm text-muted underline" pendingLabel="…">
                    สละสิทธิ์ให้คิวถัดไป
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-end justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-sm text-muted">คุณอยู่คิวที่</span>
                    <b className="text-5xl leading-none font-bold text-brand tabular-nums">{w.position.toLocaleString("th-TH")}</b>
                  </span>
                  <span className="text-right text-sm">
                    {w.ahead === 0 ? <b className="text-ok">คิวถัดไปคือคุณ</b> : <>อีก <b className="tabular-nums">{w.ahead.toLocaleString("th-TH")}</b> คิวถึงคุณ</>}
                  </span>
                </div>
                <p className="text-[13px] text-muted">ที่ว่างมาจากคนยกเลิกหรือผู้จัดเพิ่มโควต้า เข้าคิวเมื่อ {fmt.date(w.joinedAt.slice(0, 10))}</p>
                <form action={leaveWaitlist.bind(null, w.id)} className="self-start">
                  <SubmitButton className="min-h-10 rounded-full px-4 text-sm text-muted ring-1 ring-line-strong" pendingLabel="…">
                    ออกจากคิว
                  </SubmitButton>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label="ระบบคิวทำงานอย่างไร">
        <h2 className="text-lg font-semibold">ระบบคิวทำงานอย่างไร</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ice font-bold text-brand">{i + 1}</span>
              <span className="flex flex-col leading-snug">
                <b className="font-semibold">{title}</b>
                <span className="text-sm text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
