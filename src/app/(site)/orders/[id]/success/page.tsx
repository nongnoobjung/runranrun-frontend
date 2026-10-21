import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui";
import { baht } from "@/lib/format";
import { loadOrder } from "@/lib/orders";

export const metadata: Metadata = { title: "ชำระเงินสำเร็จ" };

export default function SuccessPage({ params }: PageProps<"/orders/[id]/success">) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto max-w-[560px] px-4 pt-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Success params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Success({ params }: Pick<PageProps<"/orders/[id]/success">, "params">) {
  const { id } = await params;
  const order = await loadOrder(id, `/orders/${id}/success`);
  if (order.status === "pending_payment") redirect(`/orders/${id}/pay`);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span aria-hidden className="grid h-20 w-20 place-items-center rounded-full bg-ok-soft text-4xl text-ok">
        ✓
      </span>
      <div>
        <h1 className="text-3xl font-bold">ชำระเงินสำเร็จ</h1>
        <p className="mt-1 text-muted">
          คำสั่งซื้อ {order.orderNo} · {baht(order.totalSatang)}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {order.registrations.map((r) => (
          <div key={r.id} className="flex items-center gap-4 rounded-card bg-white px-5 py-4 text-left">
            <span className="rounded-2xl bg-ice px-3 py-1.5 text-2xl font-bold text-brand tabular-nums">{r.bibNumber ?? "รอออก"}</span>
            <span className="flex-1 leading-snug">
              <b className="font-semibold">{r.name.th ?? r.name.en}</b>
              <br />
              <span className="text-sm text-muted">
                {r.raceCode}
                {r.shirtSize ? ` · เสื้อ ${r.shirtSize}` : ""}
              </span>
            </span>
          </div>
        ))}
      </div>
      <Link href="/me/events" className={`${buttonClass} w-full no-underline`}>
        ดูบัตรวิ่ง
      </Link>
      <p className="text-sm text-muted">เราส่งใบเสร็จไปที่อีเมลของผู้ชำระเงินแล้ว</p>
    </div>
  );
}
