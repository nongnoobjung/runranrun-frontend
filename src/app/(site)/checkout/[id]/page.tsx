import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cancelCheckout } from "@/app/actions";
import { api, apiOrThrow } from "@/lib/api";
import type { CheckoutSession, EventDetail, RunnerProfile } from "@/lib/types";
import { CheckoutForm, type SizeOption, type Slot } from "./checkout-form";

export const metadata: Metadata = { title: "กรอกข้อมูลผู้วิ่ง" };

export default function CheckoutPage({ params }: PageProps<"/checkout/[id]">) {
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

async function Checkout({ params }: Pick<PageProps<"/checkout/[id]">, "params">) {
  const { id } = await params;
  const res = await api<CheckoutSession>(`/v1/checkout/sessions/${encodeURIComponent(id)}`, { auth: true });
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=/checkout/${id}`);
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
        <h1 className="text-2xl font-bold">{session.status === "converted" ? "ชำระเงินเรียบร้อยแล้ว" : "หมดเวลาจองที่แล้ว"}</h1>
        <p className="text-muted">
          {session.status === "converted"
            ? "ดูบัตรวิ่งได้ที่หน้างานของฉัน"
            : "ที่ที่จองไว้ถูกคืนให้คนอื่นแล้ว กลับไปเลือกระยะเพื่อเช็กที่ว่างอีกครั้ง"}
        </p>
        <Link href={session.status === "converted" ? "/me/events" : `/events/${event.slug}`} className="font-semibold">
          {session.status === "converted" ? "ไปที่งานของฉัน" : "กลับไปหน้างาน"}
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
        eventName={event.name.th}
        organizer={event.organizer.name}
        expiresAt={session.expiresAt}
        slots={slots}
        sizes={sizes}
        questions={event.questions ?? []}
        profiles={profiles.ok ? profiles.data.items : []}
      />
      <form action={cancelCheckout.bind(null, session.id, event.slug)} className="self-center">
        <button type="submit" className="px-4 py-2 text-sm text-muted underline hover:text-ink">
          ยกเลิกและคืนที่ที่จองไว้
        </button>
      </form>
    </div>
  );
}
