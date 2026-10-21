import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { localePath, localized } from "@/i18n/config";
import Link from "@/i18n/link";
import { getLocale, getT } from "@/i18n/server";
import { api } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { EventDetail } from "@/lib/types";
import { QueuePanel } from "./queue-panel";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).events.queue.title };
}

export default function QueuePage({ params, searchParams }: PageProps<"/[lang]/events/[slug]/queue">) {
  return (
    <div className="bg-tint pb-12">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-white" aria-busy="true" />}>
          <Queue params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Queue({ params, searchParams }: Pick<PageProps<"/[lang]/events/[slug]/queue">, "params" | "searchParams">) {
  const { slug } = await params;
  const { expired } = await searchParams;
  const locale = await getLocale();
  const res = await api<EventDetail>(`/v1/events/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 422) notFound();
    throw new Error(res.problem.title);
  }
  const e = res.data;
  if (!e.policy.waitingRoom) redirect(localePath(locale, `/events/${e.slug}`));
  if (!(await getToken())) redirect(localePath(locale, `/login?next=${encodeURIComponent(`/events/${e.slug}/queue`)}`));

  return (
    <>
      <Link href={`/events/${e.slug}`} className="self-start font-semibold text-ink">
        ← {localized(locale, e.name)}
      </Link>
      <QueuePanel eventId={e.id} slug={e.slug} holdMinutes={e.registration.holdMinutes} expired={expired === "1"} />
    </>
  );
}
