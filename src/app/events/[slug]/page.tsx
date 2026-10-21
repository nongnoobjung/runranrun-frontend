import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventBanner } from "@/components/banner";
import { AvailabilityPill, Chip } from "@/components/ui";
import { api } from "@/lib/api";
import { baht, fmt } from "@/lib/format";
import type { EventDetail } from "@/lib/types";
import { RacePicker } from "./race-picker";

async function loadEvent(slug: string): Promise<EventDetail> {
  const res = await api<EventDetail>(`/v1/events/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 422) notFound();
    throw new Error(res.problem.title);
  }
  return res.data;
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const res = await api<EventDetail>(`/v1/events/${encodeURIComponent(slug)}`);
  return res.ok ? { title: res.data.name.th, description: res.data.summary ?? undefined } : {};
}

export default function EventPage({ params }: PageProps<"/events/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-4 h-[380px] animate-pulse rounded-panel bg-tint" aria-busy="true" />}>
      <EventContent params={params} />
    </Suspense>
  );
}

async function EventContent({ params }: Pick<PageProps<"/events/[slug]">, "params">) {
  const { slug } = await params;
  const e = await loadEvent(slug);
  const shirt = e.products.find((p) => p.type === "shirt");
  const best = e.races.filter((r) => r.priceSatang !== null);
  const totalLeft = e.races.reduce((s, r) => s + r.available, 0);

  return (
    <>
      <section className="px-4">
        <EventBanner
          slug={e.slug}
          type={e.type}
          title=""
          imageUrl={e.coverImageUrl}
          className="mx-auto h-[340px] max-w-[1360px] rounded-panel sm:h-[380px]"
        >
          <div className="absolute inset-x-6 bottom-8 flex flex-col gap-3 text-white sm:inset-x-12 sm:bottom-10">
            <div className="flex flex-wrap gap-2">
              {e.races.some((r) => r.availability === "almost_full") && <AvailabilityPill value="almost_full" />}
              <span className="rounded-full bg-white/20 px-3.5 py-1 text-sm">{typeLabel(e.type)}</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight drop-shadow sm:text-[56px]">{e.name.th}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[17px] text-white/90">
              <span>
                {fmt.weekday(e.eventDate)} {fmt.date(e.eventDate)}
              </span>
              {e.venue && <span>{e.venue}</span>}
            </div>
          </div>
        </EventBanner>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-10 px-4 pt-10 sm:px-7">
        <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-10">
          <section aria-label="ข้อมูลสำคัญ" className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            <Fact label="วันแข่ง" value={fmt.date(e.eventDate)} sub={fmt.weekday(e.eventDate)} />
            <Fact label="ระยะ" value={e.races.map((r) => r.code).join(" · ")} sub={`${e.races.length} ระยะ`} />
            <Fact
              label="ปิดรับสมัคร"
              value={e.registration.closesAt ? fmt.date(e.registration.closesAt) : "เมื่อเต็ม"}
              sub="หรือเมื่อเต็ม"
            />
            <Fact label="ที่ว่างรวม" value={`${totalLeft.toLocaleString()} ที่`} sub="อัปเดตทุกครั้งที่เปิดหน้า" />
          </section>

          {(e.summary || e.description) && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[26px] font-bold">เกี่ยวกับงาน</h2>
              {e.summary && <p className="max-w-[700px] text-ink/85">{e.summary}</p>}
              {e.description && <p className="max-w-[700px] whitespace-pre-line text-ink/85">{e.description}</p>}
            </section>
          )}

          <section className="flex flex-col gap-3.5">
            <h2 className="text-[26px] font-bold">ระยะและเวลา</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              {e.races.map((r) => (
                <div key={r.id} className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-line p-4">
                  <Chip className="self-start text-lg">{r.code}</Chip>
                  <Row k="ระยะทาง" v={`${r.distanceKm} กม.`} />
                  {r.startAt && <Row k="ปล่อยตัว" v={fmt.time(r.startAt)} />}
                  {r.cutoffMinutes && <Row k="Cut-off" v={`${Math.floor(r.cutoffMinutes / 60)}:${String(r.cutoffMinutes % 60).padStart(2, "0")} ชม.`} />}
                  {r.ageMin !== null && <span className="text-[13px] text-muted">อายุ {r.ageMin} ปีขึ้นไปในวันแข่ง</span>}
                </div>
              ))}
            </div>
          </section>

          {shirt && shirt.variants.length > 0 && (
            <section className="flex flex-col gap-3.5">
              <h2 className="text-[26px] font-bold">{shirt.name}</h2>
              <p className="text-sm text-muted">รวมในค่าสมัคร · ตัวเลขคือรอบอก (นิ้ว)</p>
              <div className="flex flex-wrap gap-2">
                {shirt.variants.map((v) => (
                  <span key={v.id} className={`rounded-2xl px-4 py-2 text-center leading-tight ${v.available === 0 ? "bg-tint text-muted line-through" : "bg-ice"}`}>
                    <b className="block">{v.label}</b>
                    <span className="text-xs">{v.attributes.chest_in ? `${v.attributes.chest_in}"` : ""}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {e.faq.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-[26px] font-bold">คำถามที่พบบ่อย</h2>
              {e.faq.map((f) => (
                <details key={f.q} className="rounded-[18px] bg-tint px-5 py-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 text-ink/85">{f.a}</p>
                </details>
              ))}
            </section>
          )}
        </div>

        <aside aria-label="สมัครงานนี้" className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 lg:sticky lg:top-6">
          <div className="flex flex-col gap-3 rounded-[28px] border border-line bg-white p-5 shadow-[0_18px_40px_rgba(14,42,71,.12)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-bold">เลือกระยะ</h2>
              {best.length > 0 && <Chip className="text-[13px]">เริ่ม {baht(Math.min(...best.map((r) => r.priceSatang!)))}</Chip>}
            </div>
            <RacePicker eventId={e.id} slug={e.slug} races={e.races} />
          </div>
          <div className="flex items-center gap-3.5 rounded-card bg-tint p-4">
            <span aria-hidden className="grid h-12 w-12 flex-none place-items-center rounded-full bg-ink font-bold text-white">
              {initials(e.organizer.name)}
            </span>
            <span className="leading-snug">
              <span className="text-[13px] text-muted">จัดโดย</span>
              <br />
              <b className="font-semibold">{e.organizer.name}</b>
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col rounded-[20px] bg-tint px-4 py-3.5">
      <span className="text-[13px] text-muted">{label}</span>
      <b className="text-xl font-semibold">{value}</b>
      <span className="text-[13px] text-muted">{sub}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <span className="flex justify-between text-[15px]">
      <span className="text-muted">{k}</span>
      <b className="font-semibold">{v}</b>
    </span>
  );
}

function typeLabel(t: EventDetail["type"]): string {
  return { road: "ถนน", trail: "เทรล", virtual: "Virtual", ultra: "อัลตร้า", fun_run: "ฟันรัน" }[t];
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}
