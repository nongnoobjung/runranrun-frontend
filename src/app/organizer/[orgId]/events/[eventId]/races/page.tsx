import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader } from "@/components/backoffice";
import { Meter } from "@/components/ui";
import { fmt } from "@/lib/format";
import { can, membership, orgEvent, type OrgRace, type PriceTier } from "@/lib/org";
import { createRace, createTier, deleteRace, deleteTier, updateRace, updateTier } from "./actions";
import { AddRaceForm, AddTierForm, DeleteButton, EditRaceForm, TierRow, type TierState } from "./race-forms";

export const metadata: Metadata = { title: "ระยะและราคา" };

export default function RacesPage({ params }: PageProps<"/organizer/[orgId]/events/[eventId]/races">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
      <Races params={params} />
    </Suspense>
  );
}

const n = (v: number) => v.toLocaleString("th-TH");

/** Where a price tier stands right now (request time; these pages are never prerendered). */
function tierState(t: PriceTier): TierState {
  const now = Date.now();
  if (now < new Date(t.startsAt).getTime()) return "upcoming";
  if (now >= new Date(t.endsAt).getTime()) return "ended";
  if (t.quota !== null && t.sold + t.reserved >= t.quota) return "full";
  return "selling";
}

async function Races({ params }: Pick<PageProps<"/organizer/[orgId]/events/[eventId]/races">, "params">) {
  const { orgId, eventId } = await params;
  const [org, event] = await Promise.all([membership(orgId), orgEvent(orgId, eventId)]);
  const canEdit = can(org.role, "manage_event");
  const capacity = event.races.reduce((s, r) => s + r.capacity, 0);
  const sold = event.races.reduce((s, r) => s + r.sold, 0);

  return (
    <>
      <PageHeader eyebrow={`${n(event.races.length)} ระยะ · รวมโควต้า ${n(capacity)} ที่ · ขายแล้ว ${n(sold)}`} title="ระยะและราคา" />
      {event.races.length === 0 && <EmptyState>ยังไม่มีระยะ {canEdit && "เพิ่มระยะแรกด้านล่าง แล้วตั้งช่วงราคาให้แต่ละระยะ"}</EmptyState>}
      {event.races.map((race) => (
        <RaceCard key={race.id} race={race} orgId={orgId} eventId={eventId} canEdit={canEdit} />
      ))}
      {canEdit && <AddRaceForm action={createRace.bind(null, orgId, eventId)} />}
    </>
  );
}

function RaceCard({ race, orgId, eventId, canEdit }: { race: OrgRace; orgId: string; eventId: string; canEdit: boolean }) {
  const facts = [
    { label: "ปล่อยตัว", value: race.startAt ? `${fmt.date(race.startAt)} ${fmt.time(race.startAt)}` : "ยังไม่กำหนด" },
    { label: "Cut-off", value: race.cutoffMinutes ? `${race.cutoffMinutes / 60} ชม.` : "–" },
    { label: "อายุขั้นต่ำ", value: race.ageMin !== null ? `${race.ageMin} ปี` : "ไม่จำกัด" },
    {
      label: "ช่วงบิบ",
      value:
        race.bibStart !== null
          ? `${race.bibPrefix ?? ""}${race.bibStart}–${race.bibPrefix ?? ""}${race.bibEnd ?? "…"}${race.bibNext !== null ? ` · ถัดไป ${race.bibNext}` : ""}`
          : "ไม่ออกบิบอัตโนมัติ",
    },
  ];
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ice px-3 py-0.5 text-base font-semibold text-brand">{race.code}</span>
          {race.nameTh}
        </span>
      }
      action={
        canEdit && race.sold + race.reserved === 0 ? (
          <DeleteButton
            action={deleteRace.bind(null, orgId, eventId, race.id)}
            confirmText={`ลบระยะ ${race.code} และช่วงราคาทั้งหมดของระยะนี้?`}
            label="ลบระยะ"
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-sm">
          <span>
            ขายแล้ว <b className="tabular-nums">{n(race.sold)}</b> / {n(race.capacity)}
            {race.reserved > 0 && <span className="text-muted"> · จองไว้ {n(race.reserved)}</span>}
          </span>
          <span className="text-muted">{race.distanceKm} กม.</span>
        </div>
        <Meter value={race.capacity ? ((race.sold + race.reserved) / race.capacity) * 100 : 0} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-col rounded-2xl bg-tint px-3.5 py-2.5">
            <dt className="text-[13px] text-muted">{f.label}</dt>
            <dd className="font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">ช่วงราคา</h3>
        {race.tiers.length === 0 ? (
          <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">ยังไม่มีราคา นักวิ่งจะสมัครระยะนี้ไม่ได้จนกว่าจะเพิ่มช่วงราคา</p>
        ) : (
          <ul className="flex flex-col">
            {race.tiers.map((t) => (
              <TierRow
                key={t.id}
                tier={t}
                tierState={tierState(t)}
                canEdit={canEdit}
                update={updateTier.bind(null, orgId, eventId, race.id, t.id)}
                remove={deleteTier.bind(null, orgId, eventId, race.id, t.id)}
              />
            ))}
          </ul>
        )}
        {canEdit && <AddTierForm action={createTier.bind(null, orgId, eventId, race.id)} />}
      </div>

      {canEdit && <EditRaceForm action={updateRace.bind(null, orgId, eventId, race.id)} race={race} />}
    </Card>
  );
}
