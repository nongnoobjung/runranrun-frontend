import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath, localized } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, fmtFor } from "@/lib/format";
import { HEAD_OFFICE } from "@/lib/billing";
import type { Receipt } from "@/lib/types";
import { PrintButton, TaxInvoiceForm } from "./receipt-actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.receipts.receipt.metaTitle };
}

/** The order's receipt or tax invoice as a page that prints on one A4 sheet (print CSS in globals.css). */
export default function ReceiptPage({ params }: PageProps<"/[lang]/orders/[id]/receipt">) {
  return (
    <div className="bg-tint pb-12 print:bg-white print:pb-0">
      <div className="mx-auto flex max-w-[840px] flex-col gap-5 px-4 pt-6 print:max-w-none print:p-0">
        <Suspense fallback={<div className="h-[720px] animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <ReceiptView params={params} />
        </Suspense>
      </div>
    </div>
  );
}

/** Satang as a plain amount with two decimals, as accounts expect on a tax document: 192780 → "1,927.80". */
const amount = (satang: number) => (satang / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function ReceiptView({ params }: Pick<PageProps<"/[lang]/orders/[id]/receipt">, "params">) {
  const [{ id }, locale, dict] = await Promise.all([params, getLocale(), getT()]);
  const t = dict.receipts.receipt;
  const res = await api<Receipt>(`/v1/orders/${encodeURIComponent(id)}/receipt`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=/orders/${id}/receipt`));
    if (res.problem.code === "RECEIPT_NOT_AVAILABLE") redirect(localePath(locale, `/orders/${id}/pay`));
    notFound();
  }
  const r = res.data;
  const d = r.document;
  const f = fmtFor(locale);
  const branch = (b: string | null) => (b === null ? null : b === HEAD_OFFICE ? t.headOffice : t.branch(b));
  const itemLabel = (i: Receipt["items"][number]) =>
    i.type === "product" ? t.shirt(i.description.replace(/^Size /, "")) : i.type === "fee" ? t.fee : i.type === "transfer_fee" ? t.transferFee : i.type === "change_fee" ? t.changeFee : i.description;
  const issuerTax = [d.issuer.taxId && `${t.taxId} ${d.issuer.taxId}`, d.issuer.taxId && branch(d.issuer.branch)].filter(Boolean).join(" · ");
  const buyerTax = [d.buyer.taxId && `${t.taxId} ${d.buyer.taxId}`, d.buyer.taxId && branch(d.buyer.branch)].filter(Boolean).join(" · ");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/me/events" className="font-semibold text-ink">
          {t.ticket}
        </Link>
        <PrintButton />
      </div>

      <article aria-labelledby="doc-title" className="relative overflow-hidden rounded-card bg-white p-5 text-[15px] sm:p-10 print:rounded-none print:p-0 print:text-[12pt]">
        {r.refund && (
          <p
            role="status"
            className="absolute right-4 top-24 rotate-[-8deg] rounded-xl border-[3px] border-bad px-3 py-1 text-xl font-bold uppercase tracking-wide text-bad opacity-85 sm:right-10 sm:top-10 sm:text-2xl"
          >
            {t.refunded[r.refund.status]}
          </p>
        )}

        <header className="flex flex-col gap-5 border-b-2 border-ink pb-5 sm:flex-row sm:justify-between print:flex-row print:justify-between">
          <div className="max-w-sm leading-relaxed print:max-w-[55%]">
            <p className="text-lg font-bold">{d.issuer.name}</p>
            {d.issuer.address && <p className="text-sm text-muted print:text-ink">{d.issuer.address}</p>}
            {issuerTax && <p className="text-sm">{issuerTax}</p>}
            {d.issuer.onBehalfOf && <p className="text-sm text-muted print:text-ink">{t.onBehalfOf(d.issuer.onBehalfOf)}</p>}
          </div>
          <div className="sm:text-right print:shrink-0 print:text-right">
            <h1 id="doc-title" className="text-xl font-bold sm:text-2xl print:text-[16pt]">
              {t.docTitle[d.type]}
            </h1>
            <p className="text-sm text-muted print:text-ink">{t.original}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm sm:justify-end print:justify-end">
              <dt className="text-muted print:text-ink">{t.number}</dt>
              <dd className="font-semibold tabular-nums">{d.number}</dd>
              <dt className="text-muted print:text-ink">{t.date}</dt>
              <dd>{f.date(d.issuedAt)}</dd>
              <dt className="text-muted print:text-ink">{t.orderNo}</dt>
              <dd className="tabular-nums">{r.order.orderNo}</dd>
            </dl>
          </div>
        </header>

        <section aria-label={t.buyer} className="grid gap-4 border-b border-line py-5 sm:grid-cols-2 print:grid-cols-2">
          <div className="leading-relaxed">
            <p className="text-sm text-muted print:text-ink">{t.buyer}</p>
            <p className="font-semibold">{d.buyer.name}</p>
            {buyerTax && <p className="text-sm">{buyerTax}</p>}
            {d.buyer.address && <p className="whitespace-pre-line text-sm">{d.buyer.address}</p>}
          </div>
          <div className="leading-relaxed">
            <p className="text-sm text-muted print:text-ink">{t.event}</p>
            <p className="font-semibold">{localized(locale, r.order.event.name)}</p>
            <p className="text-sm">
              {t.eventDate} {f.date(r.order.event.eventDate)}
            </p>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse text-sm print:text-[11pt]">
          <thead>
            <tr className="border-b border-line-strong text-left text-muted print:text-ink">
              <th scope="col" className="py-2 pr-2 font-medium">
                {t.item}
              </th>
              <th scope="col" className="w-12 py-2 text-right font-medium">
                {t.qty}
              </th>
              <th scope="col" className="hidden py-2 pl-3 text-right font-medium sm:table-cell print:table-cell">
                {t.unitPrice}
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {r.items.map((i, n) => (
              <tr key={n} className="border-b border-line align-top">
                <td className="py-2 pr-2">{itemLabel(i)}</td>
                <td className="py-2 text-right tabular-nums">{i.quantity}</td>
                <td className="hidden py-2 pl-3 text-right tabular-nums sm:table-cell print:table-cell">{amount(i.unitPriceSatang)}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{amount(i.unitPriceSatang * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-y-1.5 text-sm [&>dd]:pl-6">
          {r.order.discountSatang > 0 && (
            <>
              <dt>{t.discount}</dt>
              <dd className="text-right tabular-nums">−{amount(r.order.discountSatang)}</dd>
            </>
          )}
          {d.issuer.vatRegistered && (
            <>
              <dt>{t.beforeVat}</dt>
              <dd className="text-right tabular-nums">{amount(d.subtotalSatang)}</dd>
              <dt>{t.vat}</dt>
              <dd className="text-right tabular-nums">{amount(d.vatSatang)}</dd>
            </>
          )}
          <dt className="border-t-2 border-ink pt-2 text-base font-bold">{t.total}</dt>
          <dd className="border-t-2 border-ink pt-2 text-right text-base font-bold tabular-nums">{baht(d.totalSatang)}</dd>
        </dl>

        <div className="mt-6 flex flex-col gap-1 text-sm text-muted print:text-ink">
          <p>{d.issuer.vatRegistered ? t.vatIncluded : t.noVat}</p>
          <p>{t.paid(`${f.date(r.order.paidAt)} ${f.time(r.order.paidAt)}`)}</p>
          {r.replaced[0] && <p>{t.replaces(r.replaced[0].number)}</p>}
          {r.refund && <p className="font-semibold text-bad">{t.refundAmount(baht(r.refund.amountSatang))}</p>}
          <p>{t.issuedBySystem}</p>
        </div>
      </article>

      <div className="print:hidden">
        {r.canRequestTaxInvoice ? (
          <TaxInvoiceForm orderId={r.order.id} vatRegistered={d.issuer.vatRegistered} />
        ) : r.refund?.status === "full" ? (
          <p className="rounded-card bg-white p-5 text-sm text-muted">{dict.receipts.tax.refundedNote}</p>
        ) : d.buyer.taxId ? (
          <p className="rounded-card bg-white p-5 text-sm text-muted">{dict.receipts.tax.issuedNote}</p>
        ) : null}
      </div>
    </>
  );
}
