import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/event-card";
import { apiOrThrow } from "@/lib/api";
import type { EventSummary } from "@/lib/types";

const STEPS = [
  { title: "เลือกงานและระยะ", text: "ดูเส้นทาง เวลาตัดตัว และที่ว่างแบบเรียลไทม์" },
  { title: "จ่ายด้วย PromptPay", text: "สมัครให้เพื่อนและครอบครัวได้ในคำสั่งซื้อเดียว" },
  { title: "รับบัตรวิ่งพร้อม QR", text: "โชว์ QR ตอนรับเสื้อ แล้วดูผลวิ่งได้ทันที" },
];

function TrackLanes() {
  return (
    <svg aria-hidden viewBox="0 0 700 560" className="pointer-events-none absolute -right-36 -top-8 hidden h-[620px] w-[780px] max-w-none md:block">
      <g fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <ellipse key={i} cx="420" cy="300" rx={140 + i * 30} ry={90 + i * 30} />
        ))}
      </g>
      <path d="M70 300 H 280" stroke="#ffffff" strokeWidth="5" strokeDasharray="10 8" />
      <g fill="#ffffff" fillOpacity=".9" fontSize="20" fontWeight="600">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <text key={i} x={286 - i * 30} y="330">
            {i + 1}
          </text>
        ))}
      </g>
    </svg>
  );
}

async function UpcomingEvents() {
  const { items, total } = await apiOrThrow<{ items: EventSummary[]; total: number }>("/v1/events?limit=12");
  if (items.length === 0) {
    return <p className="rounded-card bg-tint p-8 text-center text-muted">ยังไม่มีงานที่เปิดรับสมัครตอนนี้ แวะมาดูใหม่เร็ว ๆ นี้</p>;
  }
  return (
    <>
      <p className="-mt-3 flex flex-wrap justify-between gap-2 text-sm text-muted">
        <span>เปิดรับสมัคร {total} งาน</span>
        <Link href="/events" className="font-semibold">
          ค้นหาตามจังหวัด เดือน และระยะ →
        </Link>
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
        {items.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5" aria-busy="true" aria-label="กำลังโหลดรายการงาน">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[380px] animate-pulse rounded-card bg-tint" />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="px-4">
        <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-panel bg-sky">
          <TrackLanes />
          <div className="relative flex max-w-[760px] flex-col gap-5 px-6 py-14 sm:px-14 sm:py-16">
            <span className="self-start rounded-full bg-white px-4 py-1.5 text-sm font-medium">ฤดูกาล 2026–27</span>
            <h1 className="text-5xl font-bold leading-[1.12] sm:text-6xl">
              ทุกเส้นชัย
              <br />
              เริ่มต้นที่นี่
            </h1>
            <p className="max-w-[520px] text-lg">หางานวิ่งใกล้บ้าน สมัครในไม่กี่นาที จ่ายด้วย PromptPay แล้วรับบัตรวิ่งพร้อม QR</p>
            <a href="#events" className="self-start rounded-2xl bg-brand px-7 py-4 font-semibold text-white no-underline shadow-[0_10px_30px_rgba(14,42,71,.12)] hover:bg-brand-dark">
              ดูงานที่เปิดรับสมัคร
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-col gap-14 px-4 pt-12 sm:px-7">
        <section aria-label="ขั้นตอนการสมัคร" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-start gap-4">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-ice text-xl font-bold text-brand">{i + 1}</span>
              <span className="leading-snug">
                <b className="text-lg font-semibold">{s.title}</b>
                <br />
                <span className="text-[15px] text-muted">{s.text}</span>
              </span>
            </div>
          ))}
        </section>

        <section id="events" className="flex scroll-mt-6 flex-col gap-5">
          <h2 className="text-3xl font-bold">งานที่กำลังมา</h2>
          <Suspense fallback={<CardsSkeleton />}>
            <UpcomingEvents />
          </Suspense>
        </section>
      </div>
    </>
  );
}
