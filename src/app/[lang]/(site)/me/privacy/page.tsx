import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setMarketingConsent } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { localePath, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { CloseAccountForm } from "./close-account";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).privacy.me.title };
}

interface Consents {
  policyVersion: string;
  current: Record<"terms" | "privacy" | "marketing", { granted: boolean; policyVersion: string; at: string } | null>;
  history: { purpose: string; granted: boolean; policyVersion: string; at: string; registration: { registrationNo: string; eventName: string } | null }[];
}

const AT_LOCALE: Record<Locale, string> = { th: "th-TH-u-ca-gregory", en: "en-GB" };
const AT: Record<Locale, Intl.DateTimeFormat> = {
  th: new Intl.DateTimeFormat(AT_LOCALE.th, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }),
  en: new Intl.DateTimeFormat(AT_LOCALE.en, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }),
};

export default async function MyPrivacyPage() {
  const t = (await getT()).privacy;
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          {t.me.back}
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t.me.title}</h1>
          <p className="text-sm text-muted">
            {t.me.rights} <Link href="/privacy">{t.legal.privacy}</Link>
          </p>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Privacy />
        </Suspense>
      </div>
    </div>
  );
}

async function Privacy() {
  const [res, locale, dict] = await Promise.all([api<Consents>("/v1/me/consents", { auth: true }), getLocale(), getT()]);
  const t = dict.privacy.me;
  const at = AT[locale];
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, "/login?next=/me/privacy"));
    throw new Error(res.problem.title);
  }
  const c = res.data;
  const marketing = c.current.marketing?.granted ?? false;

  return (
    <>
      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={t.consents}>
        <h2 className="text-lg font-semibold">{t.consents}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {(["terms", "privacy"] as const).map((k) => (
            <li key={k} className="flex flex-wrap justify-between gap-2">
              <span>{t.purpose[k]}</span>
              <span className="text-muted">{c.current[k] ? t.acceptedAt(at.format(new Date(c.current[k]!.at))) : t.neverAccepted}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <span className="flex flex-col">
            <b className="font-semibold">{t.marketingTitle}</b>
            <span className="text-sm text-muted">
              {marketing ? t.on : t.off}
              {t.changeAnyTime}
            </span>
          </span>
          <form action={setMarketingConsent.bind(null, !marketing)}>
            <SubmitButton className="min-h-10 rounded-full px-4 text-sm font-semibold ring-1 ring-line-strong" pendingLabel="…">
              {marketing ? t.unsubscribe : t.subscribe}
            </SubmitButton>
          </form>
        </div>
        {c.history.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">{t.history(c.history.length.toLocaleString(AT_LOCALE[locale]))}</summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {c.history.map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2">
                  <span>
                    {t.purpose[h.purpose] ?? h.purpose}
                    {h.registration && ` · ${h.registration.eventName} (${h.registration.registrationNo})`}
                  </span>
                  <span className="text-muted">
                    {h.granted ? t.granted : t.withdrawn} · {at.format(new Date(h.at))}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={t.downloadLabel}>
        <h2 className="text-lg font-semibold">{t.downloadTitle}</h2>
        <p className="text-sm text-muted">
          {t.downloadText}
        </p>
        <a href={localePath(locale, "/me/privacy/export")} className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-ice px-5 text-sm font-semibold text-brand no-underline">
          {t.download}
        </a>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-white p-5" aria-label={t.closeLabel}>
        <h2 className="text-lg font-semibold">{t.closeTitle}</h2>
        <p className="text-sm text-muted">
          {t.closeText}
        </p>
        <CloseAccountForm />
      </section>
    </>
  );
}
