import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { baht } from "@/lib/format";
import { loadOrder } from "@/lib/orders";
import { PayPanel } from "./pay-panel";

export const metadata: Metadata = { title: "ชำระเงิน" };

export default function PayPage({ params }: PageProps<"/orders/[id]/pay">) {
  return (
    <div className="bg-tint pb-10">
      <div className="mx-auto max-w-[560px] px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Pay params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Pay({ params }: Pick<PageProps<"/orders/[id]/pay">, "params">) {
  const { id } = await params;
  const order = await loadOrder(id, `/orders/${id}/pay`);
  if (order.status === "paid") redirect(`/orders/${id}/success`);

  const lines = order.items.filter((i) => i.type !== "fee" && i.totalSatang + i.discountSatang > 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] bg-white px-4 py-3">
        <div className="font-semibold">ชำระเงิน · {order.event.name}</div>
        <div className="text-[13px] text-muted">ขั้น 3 จาก 3 · คำสั่งซื้อ {order.orderNo}</div>
      </div>

      <section className="flex flex-col gap-1.5 rounded-card bg-white px-5 py-4 tabular-nums">
        {lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3">
            <span>{l.description}</span>
            <span>{baht(l.unitPriceSatang * l.quantity)}</span>
          </div>
        ))}
        {order.discountSatang > 0 && (
          <div className="flex justify-between text-ok">
            <span>ส่วนลด</span>
            <span>−{baht(order.discountSatang)}</span>
          </div>
        )}
        {order.feeSatang > 0 && (
          <div className="flex justify-between text-muted">
            <span>ค่าธรรมเนียมชำระเงิน</span>
            <span>{baht(order.feeSatang)}</span>
          </div>
        )}
        <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-line-strong pt-2">
          <b className="font-semibold">ยอดชำระ</b>
          <b className="text-2xl">{baht(order.totalSatang)}</b>
        </div>
      </section>

      {order.status === "pending_payment" ? (
        <PayPanel
          orderId={order.id}
          totalSatang={order.totalSatang}
          expiresAt={order.expiresAt}
          initialPayment={order.payment}
          showDevTools={process.env.ENABLE_DEV_TOOLS === "true"}
        />
      ) : (
        <div className="rounded-card bg-white p-6">
          <h2 className="text-xl font-bold">คำสั่งซื้อนี้ชำระเงินไม่ได้แล้ว</h2>
          <p className="text-muted">สถานะ: {order.status}</p>
        </div>
      )}
    </div>
  );
}
