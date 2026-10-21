import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { deleteProfile } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonClass } from "@/components/ui";
import { localePath } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { fmtFor, profileLabel } from "@/lib/format";
import type { RunnerProfile } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.me.profiles.title };
}

export default async function ProfilesPage() {
  const t = await getT();
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Link href="/me/events" className="self-start font-semibold text-ink">
          {t.me.back.myEvents}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t.me.profiles.title}</h1>
            <p className="text-sm text-muted">{t.me.profiles.intro}</p>
          </div>
          <Link href="/me/profiles/new" className={`${buttonClass} min-h-11 px-5 no-underline`}>
            {t.me.profiles.add}
          </Link>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Profiles />
        </Suspense>
      </div>
    </div>
  );
}

async function Profiles() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const tp = t.me.profiles;
  const res = await api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, "/login?next=/me/profiles"));
    throw new Error(res.problem.title);
  }
  const items = res.data.items;
  if (items.length === 0) {
    return (
      <div className="rounded-card bg-white p-8 text-center">
        <p>{tp.empty}</p>
        <p className="mt-1 text-sm text-muted">{tp.emptyHint}</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3" aria-label={tp.listLabel}>
      {items.map((p) => (
        <li key={p.id} className="flex flex-col gap-3 rounded-card bg-white p-5">
          <div className="flex items-start gap-3">
            <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-full bg-sky text-lg font-bold">
              {Array.from((locale === "th" && p.firstNameTh) || p.firstNameEn)[0]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <b className="font-semibold">{profileLabel(p, locale)}</b>
              <span className="text-[13px] text-muted">
                {/* English pages already show the English name in the label above. */}
                {[locale === "th" ? `${p.firstNameEn} ${p.lastNameEn}` : null, tp.gender[p.gender], tp.born(fmtFor(locale).date(p.birthDate))].filter(Boolean).join(" · ")}
              </span>
              <span className="text-[13px] text-muted">
                {p.idDocType === "passport" ? tp.passport : tp.thaiId} ••••{p.idDocLast4}
                {p.shirtSize && ` · ${tp.shirt(p.shirtSize)}`}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/me/profiles/${p.id}`} className="flex min-h-10 items-center rounded-full bg-ice px-4 text-sm font-semibold text-brand no-underline">
              {tp.edit}
            </Link>
            <form action={deleteProfile.bind(null, p.id)}>
              <SubmitButton className="min-h-10 rounded-full px-4 text-sm text-muted ring-1 ring-line-strong" pendingLabel="…">
                {tp.delete}
              </SubmitButton>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
