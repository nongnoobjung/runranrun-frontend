import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EventBanner } from "@/components/banner";
import { Qr } from "@/components/qr";
import { api } from "@/lib/api";
import { fmt } from "@/lib/format";
import type { MyRegistration } from "@/lib/types";

export const metadata: Metadata = { title: "บัตรวิ่ง" };

export default function TicketPage({ params }: PageProps<"/me/registrations/[id]">) {
  return (
    <div className="bg-sky pb-12">
      <div className="mx-auto max-w-[440px] px-4 pt-6">
        <Link href="/me/events" className="mb-3 inline-block font-semibold text-ink">
          ← งานของฉัน
        </Link>
        <Suspense fallback={<div className="h-[560px] animate-pulse rounded-[28px] bg-white/60" aria-busy="true" />}>
          <Ticket params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Ticket({ params }: Pick<PageProps<"/me/registrations/[id]">, "params">) {
  const { id } = await params;
  const res = await api<MyRegistration>(`/v1/me/registrations/${encodeURIComponent(id)}`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/me/registrations/${id}`);
    notFound();
  }
  const r = res.data;
  const [first, ...rest] = r.runner.en.split(" ");

  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-[0_14px_34px_rgba(14,42,71,.14)]">
      <EventBanner
        slug={r.event.slug}
        type="road"
        title={r.event.name}
        subtitle={`${fmt.date(r.event.eventDate)} · ${r.race.code}`}
        imageUrl={r.event.coverImageUrl}
        className="h-28"
        titleSize="text-lg"
      />
      <div className="flex flex-col items-center gap-0.5 px-5 pb-1.5 pt-4 text-center">
        <span className="text-xs tracking-[0.1em] text-muted">BIB NUMBER</span>
        <span className="text-6xl font-bold tracking-wide text-brand tabular-nums">{r.bibNumber ?? "----"}</span>
        <span className="text-xl font-semibold tracking-[0.08em]">{first}</span>
        <span className="text-[13px] text-muted">
          {[rest.join(" "), r.ageGroup].filter(Boolean).join(" · ")}
        </span>
      </div>

      <div aria-hidden className="relative my-1.5 h-6">
        <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-sky" />
        <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-sky" />
        <span className="absolute inset-x-5 top-[11px] border-t-2 border-dashed border-line-strong" />
      </div>

      <div className="flex items-center gap-4 px-5 pb-5">
        {r.qrToken ? (
          <Qr value={r.qrToken} size={128} label="QR สำหรับรับเสื้อและบิบ" />
        ) : (
          <div className="grid h-32 w-32 place-items-center rounded-xl bg-tint p-2 text-center text-xs text-muted">QR จะแสดงหลังชำระเงิน</div>
        )}
        <div className="flex flex-col gap-1.5 leading-snug">
          <b className="font-semibold">โชว์ QR นี้ตอนรับเสื้อ</b>
          {r.shirtSize && (
            <span className="text-sm text-muted">
              ไซซ์เสื้อ <b className="ml-1 rounded-xl bg-ice px-3 py-0.5 text-lg text-brand">{r.shirtSize}</b>
            </span>
          )}
          <span className={`text-[13px] font-medium ${r.kitPickedUpAt ? "text-ok" : "text-warn"}`}>
            {r.kitPickedUpAt ? "รับของแล้ว" : "ยังไม่ได้รับของ"}
          </span>
        </div>
      </div>

      <dl className="mx-5 mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
        <dt className="text-muted">เลขสมัคร</dt>
        <dd className="text-right">{r.registrationNo}</dd>
        <dt className="text-muted">คำสั่งซื้อ</dt>
        <dd className="text-right">{r.orderNo}</dd>
        {r.event.venue && (
          <>
            <dt className="text-muted">สถานที่</dt>
            <dd className="text-right">{r.event.venue}</dd>
          </>
        )}
      </dl>
    </article>
  );
}
