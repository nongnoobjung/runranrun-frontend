import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelTransfer } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { localePath, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { baht, problemMessage } from "@/lib/format";
import type { ChangeOptions } from "@/lib/types";
import { TransferForm } from "./transfer-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.transfer.title };
}

type Props = PageProps<"/[lang]/me/registrations/[id]/transfer">;

const AT_OPTIONS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" };
const AT: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat("th-TH-u-ca-gregory", AT_OPTIONS),
  en: new Intl.DateTimeFormat("en-GB", AT_OPTIONS),
};

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
  const [{ id }, dict, locale] = await Promise.all([params, getT(), getLocale()]);
  const tt = dict.me.transfer;
  const at = AT[locale];
  const back = `/me/registrations/${id}`;
  const res = await api<ChangeOptions>(`/v1/me/registrations/${encodeURIComponent(id)}/changes`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=${back}/transfer`));
    notFound();
  }
  const o = res.data;
  const t = o.transfer;
  const steps = tt.steps(t.feeSatang > 0 ? baht(t.feeSatang) : null);

  return (
    <>
      <Link href={back} className="self-start font-semibold text-ink">
        {dict.me.back.ticket}
      </Link>
      <div>
        <h1 className="text-3xl font-bold">{tt.title}</h1>
        <p className="text-muted">
          {locale === "en" ? o.runner.en : (o.runner.th ?? o.runner.en)} · {o.raceCode} · {o.event.name}
        </p>
      </div>

      {t.open ? (
        <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={tt.openLabel}>
          <span className="self-start rounded-full bg-warn-soft px-3 py-1 text-[13px] font-semibold text-warn">
            {t.open.status === "accepted" ? tt.statusAccepted : tt.statusPending}
          </span>
          <p>
            {tt.transferTo} <b className="font-semibold break-all">{t.open.toEmail}</b>
          </p>
          <p className="text-sm text-muted">{tt.acceptBy(at.format(new Date(t.open.expiresAt)))}</p>
          <form action={cancelTransfer.bind(null, t.open.id, `${back}/transfer`)} className="self-start">
            <SubmitButton className="min-h-10 rounded-full px-4 text-sm text-bad ring-1 ring-line-strong" pendingLabel="…">
              {tt.cancel}
            </SubmitButton>
          </form>
        </section>
      ) : t.allowed ? (
        <TransferForm registrationId={o.registrationId} until={at.format(new Date(t.until))} />
      ) : (
        <p role="status" className="rounded-card bg-white p-5 text-muted">
          {problemMessage({ code: t.reason ?? "", title: tt.notAllowed }, locale)}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={tt.howTitle}>
        <h2 className="text-lg font-semibold">{tt.howTitle}</h2>
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
        <p className="text-[13px] text-muted">{tt.paymentNote}</p>
      </section>
    </>
  );
}
