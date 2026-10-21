import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, EmptyState, PageHeader, Pill } from "@/components/backoffice";
import { QUESTION_TYPE_LABEL } from "@/lib/format";
import { can, eventPath, membership, orgEvent, orgGet, type OrgQuestion } from "@/lib/org";
import { CreateQuestionForm, EditQuestionForm, QuestionActions, type RaceOption } from "./question-forms";

export const metadata: Metadata = { title: "ฟอร์มสมัคร" };

type Props = PageProps<"/organizer/[orgId]/events/[eventId]/form">;

/** What every runner fills in already; the organiser adds questions on top. */
const STANDARD_FIELDS: [string, string][] = [
  ["ชื่อ-นามสกุล ไทยและอังกฤษ", "ชื่ออังกฤษพิมพ์บนบิบ"],
  ["เพศและวันเกิด", "ใช้คำนวณรุ่นอายุ"],
  ["เลขบัตรประชาชน / พาสปอร์ต", "เข้ารหัสเก็บ ใช้กับประกัน"],
  ["ผู้ติดต่อฉุกเฉิน", "ชื่อและเบอร์โทร"],
  ["ไซซ์เสื้อ", "เมื่องานมีเสื้อ"],
];

export default function FormPage({ params }: Props) {
  return (
    <>
      <PageHeader title="ฟอร์มสมัคร" eyebrow="ข้อมูลที่นักวิ่งกรอกตอนสมัคร" />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-[28px] bg-white" aria-busy="true" />}>
        <Questions params={params} />
      </Suspense>
    </>
  );
}

async function Questions({ params }: Pick<Props, "params">) {
  const { orgId, eventId } = await params;
  const [org, event, { items }] = await Promise.all([
    membership(orgId),
    orgEvent(orgId, eventId),
    orgGet<{ items: OrgQuestion[] }>(orgId, `/events/${eventId}/questions`, eventPath(orgId, eventId, "form")),
  ]);
  const canEdit = can(org.role, "manage_event");
  const races: RaceOption[] = event.races.map((r) => ({ id: r.id, code: r.code }));
  const raceCode = new Map(races.map((r) => [r.id, r.code]));
  const ids = items.map((q) => q.id);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-4">
        <Card title="คำถามเพิ่มเติม" action={<span className="text-sm text-muted">{items.length} ข้อ · เรียงตามที่นักวิ่งเห็น</span>}>
          {items.length === 0 ? (
            <EmptyState>ยังไม่มีคำถามเพิ่มเติม นักวิ่งกรอกแค่ข้อมูลมาตรฐาน</EmptyState>
          ) : (
            <ol className="flex flex-col gap-3" aria-label="คำถามเพิ่มเติม">
              {items.map((q, i) => (
                <li key={q.id} className="flex flex-col gap-2 rounded-[20px] bg-tint p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <b className="leading-snug font-semibold">
                        {q.label}
                        {q.required && <span className="text-bad"> *</span>}
                      </b>
                      {q.helpText && <span className="text-[13px] text-muted">{q.helpText}</span>}
                      <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                        <Pill label={QUESTION_TYPE_LABEL[q.type]} className="bg-white text-brand" />
                        <span>{q.raceIds ? `เฉพาะ ${q.raceIds.map((id) => raceCode.get(id) ?? "?").join(", ")}` : "ทุกระยะ"}</span>
                        <span>· {q.required ? "บังคับ" : "ไม่บังคับ"}</span>
                        {q.answered > 0 && <span>· ตอบแล้ว {q.answered.toLocaleString("th-TH")} คน</span>}
                      </span>
                      {q.options && <span className="text-[13px] break-words">ตัวเลือก: {q.options.join(" / ")}</span>}
                    </div>
                    {canEdit && <QuestionActions orgId={orgId} eventId={eventId} ids={ids} index={i} answered={q.answered} />}
                  </div>
                  {canEdit && (
                    <details className="border-t border-line pt-2">
                      <summary className="cursor-pointer text-sm font-medium text-brand">แก้ไขคำถามนี้</summary>
                      <EditQuestionForm orgId={orgId} eventId={eventId} question={q} races={races} />
                    </details>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>

        {canEdit && (
          <Card title="เพิ่มคำถาม">
            <CreateQuestionForm orgId={orgId} eventId={eventId} races={races} />
          </Card>
        )}
      </div>

      <Card title="ข้อมูลมาตรฐาน" className="min-w-0 flex-[1_1_300px]">
        <p className="text-sm text-muted">ทุกฟอร์มถามข้อมูลเหล่านี้อยู่แล้ว ไม่ต้องเพิ่มเป็นคำถาม</p>
        <ul className="flex flex-col">
          {STANDARD_FIELDS.map(([label, note]) => (
            <li key={label} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className="flex flex-1 flex-col leading-snug">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted">{note}</span>
              </span>
              <Pill label="บังคับเสมอ" className="bg-tint text-muted" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
