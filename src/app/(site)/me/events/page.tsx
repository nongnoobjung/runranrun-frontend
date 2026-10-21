import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { EventBanner } from "@/components/banner";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { MyRegistration, Transfer } from "@/lib/types";

export const metadata: Metadata = { title: "งานของฉัน" };

export default function MyEventsPage() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-3xl font-bold">งานของฉัน</h1>
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/me/waitlist" className="text-sm font-semibold">
              คิว waitlist →
            </Link>
            <Link href="/me/transfers" className="text-sm font-semibold">
              โอนสิทธิ์ →
            </Link>
            <Link href="/me/profiles" className="text-sm font-semibold">
              ข้อมูลผู้วิ่ง →
            </Link>
            <Link href="/me/privacy" className="text-sm font-semibold">
              ความเป็นส่วนตัว →
            </Link>
          </span>
        </div>
        <form action={logout}>
          <button type="submit" className="px-3 py-2 text-sm whitespace-nowrap text-muted underline hover:text-ink">
            ออกจากระบบ
          </button>
        </form>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-tint" aria-busy="true" />}>
        <MyEvents />
      </Suspense>
    </div>
  );
}

async function MyEvents() {
  const [res, transfers] = await Promise.all([
    api<{ items: MyRegistration[] }>("/v1/me/registrations", { auth: true }),
    api<{ incoming: Transfer[] }>("/v1/me/transfers", { auth: true }),
  ]);
  if (!res.ok) {
    if (res.status === 401) redirect("/login?next=/me/events");
    throw new Error(res.problem.title);
  }
  const items = res.data.items;
  const offered = transfers.ok ? transfers.data.incoming.filter((t) => t.status === "pending" || t.status === "accepted") : [];
  const banner = offered.length > 0 && (
    <Link href="/me/transfers" className="flex items-center justify-between gap-3 rounded-card bg-sky px-5 py-4 font-semibold text-ink no-underline">
      <span>
        มีคนโอนสิทธิ์วิ่งให้คุณ {offered.length.toLocaleString("th-TH")} รายการ
        <span className="block text-sm font-normal text-muted">{offered.map((t) => `${t.event.name} ${t.race.code}`).join(", ")}</span>
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
  if (items.length === 0) {
    return (
      <>
        {banner}
        <div className="flex flex-col items-start gap-3 rounded-card bg-tint p-6">
          <p className="text-muted">ยังไม่มีงานที่สมัครไว้</p>
          <Link href="/" className="font-semibold">
            หางานวิ่ง →
          </Link>
        </div>
      </>
    );
  }
  return (
    <>
      {banner}
      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link href={`/me/registrations/${r.id}`} className="flex overflow-hidden rounded-card bg-tint text-ink no-underline transition hover:-translate-y-0.5">
              <EventBanner slug={r.event.slug} type="road" title="" imageUrl={r.event.coverImageUrl} className="w-28 flex-none sm:w-40" />
              <div className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-[13px] text-muted">{fmt.date(r.event.eventDate)}</span>
                <b className="font-semibold leading-snug">{r.event.name}</b>
                <span className="text-sm text-muted">
                  {r.runner.th ?? r.runner.en} · {r.race.code}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  {r.status === "confirmed" ? (
                    <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok">ยืนยันแล้ว</span>
                  ) : (
                    <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">รอชำระเงิน</span>
                  )}
                  {r.bibNumber && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-brand">บิบ {r.bibNumber}</span>}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
