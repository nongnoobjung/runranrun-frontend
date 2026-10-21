import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelCheckout } from "@/app/actions";
import { localePath, localized } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api, apiOrThrow } from "@/lib/api";
import type { CheckoutSession, EventDetail, RunnerProfile } from "@/lib/types";
import { CheckoutForm, type SizeOption, type Slot } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.checkout.page.title };
}

export default function CheckoutPage({ params }: PageProps<"/[lang]/checkout/[id]">) {
  return (
    <div className="bg-tint pb-6">
      <div className="mx-auto max-w-[760px] px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Checkout params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Checkout({ params }: Pick<PageProps<"/[lang]/checkout/[id]">, "params">) {
  const { id } = await params;
  const locale = await getLocale();
  const t = (await getT()).checkout.page;
  const res = await api<CheckoutSession>(`/v1/checkout/sessions/${encodeURIComponent(id)}`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(localePath(locale, `/login?next=/checkout/${id}`));
    notFound();
  }
  const session = res.data;
  const [event, profiles] = await Promise.all([
    apiOrThrow<EventDetail>(`/v1/events/${encodeURIComponent(session.eventSlug)}`),
    api<{ items: RunnerProfile[] }>("/v1/me/profiles", { auth: true }),
  ]);

  if (session.status !== "active") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card bg-white p-6">
        <h1 className="text-2xl font-bold">{session.status === "converted" ? t.paidTitle : t.expiredTitle}</h1>
        <p className="text-muted">
          {session.status === "converted" ? t.paidText : t.expiredText}
        </p>
        <Link href={session.status === "converted" ? "/me/events" : `/events/${event.slug}`} className="font-semibold">
          {session.status === "converted" ? t.paidLink : t.expiredLink}
        </Link>
      </div>
    );
  }

  const slots: Slot[] = session.items.races.flatMap((r) =>
    Array.from({ length: r.quantity }, () => ({ raceId: r.raceId, code: r.code, priceSatang: r.priceSatang, tierName: r.tierName })),
  );
  const shirt = event.products.find((p) => p.type === "shirt" && p.required);
  const sizes: SizeOption[] = (shirt?.variants ?? []).map((v) => ({
    id: v.id,
    label: v.label,
    chestIn: v.attributes.chest_in,
    soldOut: v.available === 0,
  }));

  return (
    <div className="flex flex-col gap-3">
      <CheckoutForm
        sessionId={session.id}
        eventName={localized(locale, event.name)}
        organizer={event.organizer.name}
        expiresAt={session.expiresAt}
        slots={slots}
        sizes={sizes}
        questions={event.questions ?? []}
        profiles={profiles.ok ? profiles.data.items : []}
      />
      <form action={cancelCheckout.bind(null, session.id, event.slug)} className="self-center">
        <button type="submit" className="px-4 py-2 text-sm text-muted underline hover:text-ink">
          {t.cancel}
        </button>
      </form>
    </div>
  );
}
