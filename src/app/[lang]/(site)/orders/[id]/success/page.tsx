import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClass, ghostButtonClass } from "@/components/ui";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { baht } from "@/lib/format";
import { loadOrder } from "@/lib/orders";
import type { Order } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.checkout.success.title };
}

export default function SuccessPage({ params }: PageProps<"/[lang]/orders/[id]/success">) {
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

async function Success({ params }: Pick<PageProps<"/[lang]/orders/[id]/success">, "params">) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getT();
  const order = await loadOrder(id, `/orders/${id}/success`);
  if (order.status === "pending_payment") redirect(localePath(locale, `/orders/${id}/pay`));
  if (order.purpose.kind !== "registration") return <ChangePaid order={order} purpose={order.purpose} />;
  const s = t.checkout.success;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span aria-hidden className="grid h-20 w-20 place-items-center rounded-full bg-ok-soft text-4xl text-ok">
        ✓
      </span>
      <div>
        <h1 className="text-3xl font-bold">{s.title}</h1>
        <p className="mt-1 text-muted">
          {t.checkout.pay.orderNo(order.orderNo)} · {baht(order.totalSatang)}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        {order.registrations.map((r) => (
          <div key={r.id} className="flex items-center gap-4 rounded-card bg-white px-5 py-4 text-left">
            <span className="rounded-2xl bg-ice px-3 py-1.5 text-2xl font-bold text-brand tabular-nums">{r.bibNumber ?? s.bibPending}</span>
            <span className="flex-1 leading-snug">
              <b className="font-semibold">{locale === "en" ? r.name.en : (r.name.th ?? r.name.en)}</b>
              <br />
              <span className="text-sm text-muted">
                {r.raceCode}
                {r.shirtSize ? s.shirt(r.shirtSize) : ""}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <Link href="/me/events" className={`${buttonClass} flex-1 no-underline`}>
          {s.viewTicket}
        </Link>
        <Link href={`/orders/${order.id}/receipt`} className={`${ghostButtonClass} flex-1 no-underline`}>
          {s.viewReceipt}
        </Link>
      </div>
      <p className="text-sm text-muted">{s.receipt}</p>
    </div>
  );
}

/** A paid race change or transfer fee: the place has moved, or (rarely) could not and the money goes back. */
async function ChangePaid({ order, purpose }: { order: Order; purpose: Extract<Order["purpose"], { kind: "race_change" | "transfer" }> }) {
  const t = await getT();
  const s = t.checkout.success;
  const done = purpose.status === "completed";
  const title = purpose.kind === "race_change" ? s.changed(purpose.raceCode) : s.transferred(purpose.raceCode);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span aria-hidden className={`grid h-20 w-20 place-items-center rounded-full text-4xl ${done ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
        {done ? "✓" : "!"}
      </span>
      <div>
        <h1 className="text-3xl font-bold">{done ? title : s.changeFailed}</h1>
        <p className="mt-1 text-muted">
          {t.checkout.pay.orderNo(order.orderNo)} · {baht(order.totalSatang)}
        </p>
        {!done && <p className="mt-2 text-sm text-muted">{s.changeFailedText}</p>}
      </div>
      {done && purpose.registrationId ? (
        <Link href={`/me/registrations/${purpose.registrationId}${purpose.kind === "race_change" ? "?changed=1" : ""}`} className={`${buttonClass} w-full no-underline`}>
          {s.viewTicket}
        </Link>
      ) : (
        <Link href="/me/events" className={`${buttonClass} w-full no-underline`}>
          {s.myEvents}
        </Link>
      )}
      <Link href={`/orders/${order.id}/receipt`} className="text-sm text-muted">
        {s.viewReceipt}
      </Link>
    </div>
  );
}
