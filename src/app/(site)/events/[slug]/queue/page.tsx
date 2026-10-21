import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/session";
import type { EventDetail } from "@/lib/types";
import { QueuePanel } from "./queue-panel";

export const metadata: Metadata = { title: "คิวสมัคร" };

export default function QueuePage({ params, searchParams }: PageProps<"/events/[slug]/queue">) {
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

async function Queue({ params, searchParams }: Pick<PageProps<"/events/[slug]/queue">, "params" | "searchParams">) {
  const { slug } = await params;
  const { expired } = await searchParams;
  const res = await api<EventDetail>(`/v1/events/${encodeURIComponent(slug)}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 422) notFound();
    throw new Error(res.problem.title);
  }
  const e = res.data;
  if (!e.policy.waitingRoom) redirect(`/events/${e.slug}`);
  if (!(await getToken())) redirect(`/login?next=${encodeURIComponent(`/events/${e.slug}/queue`)}`);

  return (
    <>
      <Link href={`/events/${e.slug}`} className="self-start font-semibold text-ink">
        ← {e.name.th}
      </Link>
      <QueuePanel eventId={e.id} slug={e.slug} holdMinutes={e.registration.holdMinutes} expired={expired === "1"} />
    </>
  );
}
