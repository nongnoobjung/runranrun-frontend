"use client";

import { useState, useTransition } from "react";
import { Card, dangerButtonClass, FormMessage, smallButtonClass, smallGhostButtonClass } from "@/components/backoffice";
import { inputClass } from "@/components/ui";
import type { OrgFormState } from "@/lib/org-actions";
import { clearCover, deleteImage, saveGallery, uploadImage, type ImagePurpose } from "./actions";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const T = {
  cover: "รูปปก",
  coverHint: "แนวนอน แนะนำ 1600 × 900 px ขึ้นไป · JPG, PNG หรือ WebP ไม่เกิน 10 MB · ระบบย่อขนาดให้เองโดยคงสัดส่วนเดิม",
  noCover: "ยังไม่มีรูปปก หน้างานใช้ภาพประกอบตามประเภทงานแทน",
  uploadCover: "อัปโหลดรูปปก",
  replaceCover: "เปลี่ยนรูปปก",
  removeCover: "เอารูปปกออก",
  gallery: "แกลเลอรี",
  galleryHint: "รูปบรรยากาศ เหรียญ เสื้อ เลือกได้ทีละหลายรูป เรียงลำดับและใส่คำบรรยายสองภาษาได้",
  noGallery: "ยังไม่มีรูปในแกลเลอรี",
  addPhotos: "เพิ่มรูป",
  captionTh: "คำบรรยาย (ไทย)",
  captionEn: "Caption (English)",
  up: "เลื่อนขึ้น",
  down: "เลื่อนลง",
  remove: "ลบ",
  saveGallery: "บันทึกลำดับและคำบรรยาย",
  unsaved: "มีการแก้ไขที่ยังไม่บันทึก",
  routeMaps: "แผนที่เส้นทาง",
  routeMapsHint: "รูปแผนที่ของแต่ละระยะ แสดงบนหน้างานใต้ระยะและเวลา",
  uploadMap: "อัปโหลดแผนที่",
  replaceMap: "เปลี่ยนแผนที่",
  uploading: "กำลังอัปโหลด…",
  confirmDelete: "ลบรูปนี้? รูปจะหายจากหน้างานทุกที่ที่ใช้อยู่",
  photo: (n: number) => `รูปที่ ${n}`,
};

/** An uploaded event image's id, from its /media path; null for an image hosted elsewhere. */
const uploadedId = (url: string | null) => url?.match(/^\/media\/event-images\/([0-9a-f-]{36})\.webp$/)?.[1] ?? null;

interface GalleryItem {
  id: string;
  url: string;
  captionTh: string | null;
  captionEn: string | null;
}

/** A button-looking label around a hidden file input: picking a file starts the upload straight away. */
function UploadButton({
  label,
  busy,
  multiple,
  disabled,
  className = smallGhostButtonClass,
  onFiles,
}: {
  label: string;
  busy: boolean;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <label className={`${className} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand`}>
      {busy ? T.uploading : label}
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        multiple={multiple}
        disabled={disabled || busy}
        className="sr-only"
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </label>
  );
}

export function EventImages({
  orgId,
  eventId,
  coverUrl,
  gallery,
  races,
  readOnly,
}: {
  orgId: string;
  eventId: string;
  coverUrl: string | null;
  gallery: GalleryItem[];
  races: { id: string; code: string; routeMapUrl: string | null }[];
  readOnly: boolean;
}) {
  // The message shows in the card whose button produced it.
  const [message, setMessage] = useState<{ area: string; state: OrgFormState }>({ area: "", state: {} });
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [items, setItems] = useState(gallery);
  const [dirty, setDirty] = useState(false);

  // After an upload or delete the page refreshes with a new gallery: keep the order and captions being edited, add
  // new images at the end and drop deleted ones (adjusting state while rendering, as React recommends over an effect).
  const [seen, setSeen] = useState(gallery);
  if (seen !== gallery) {
    setSeen(gallery);
    const fresh = new Set(gallery.map((g) => g.id));
    const kept = items.filter((p) => fresh.has(p.id));
    setItems([...kept, ...gallery.filter((g) => !kept.some((k) => k.id === g.id))]);
  }

  const areaOf = (key: string) => (key === "cover" ? "cover" : key.startsWith("map-") ? "maps" : "gallery");
  const run = (key: string, work: () => Promise<OrgFormState>) => {
    setBusy(key);
    startTransition(async () => {
      const state = await work();
      setMessage({ area: areaOf(key), state });
      setBusy(null);
    });
  };
  const messageFor = (area: string) => <FormMessage state={message.area === area ? message.state : undefined} />;

  const upload = (key: string, purpose: ImagePurpose, files: File[], raceId?: string) =>
    run(key, async () => {
      let last: OrgFormState = {};
      for (const file of files) {
        const fd = new FormData();
        fd.set("file", file);
        if (raceId) fd.set("raceId", raceId);
        last = await uploadImage(orgId, eventId, purpose, fd);
        if (last.error) return { error: `${file.name}: ${last.error}` };
      }
      return files.length > 1 ? { notice: `อัปโหลด ${files.length} รูปแล้ว` } : last;
    });

  const remove = (key: string, url: string) => {
    if (!window.confirm(T.confirmDelete)) return;
    const id = uploadedId(url);
    run(key, () => (id ? deleteImage(orgId, eventId, id) : clearCover(orgId, eventId)));
  };

  const edit = (next: GalleryItem[]) => {
    setItems(next);
    setDirty(true);
  };
  const move = (i: number, by: number) => {
    const next = [...items];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    edit(next);
  };
  const caption = (i: number, field: "captionTh" | "captionEn", value: string) => edit(items.map((it, j) => (j === i ? { ...it, [field]: value } : it)));

  return (
    <>
      <Card title={T.cover}>
        <p className="text-[13px] text-muted">{T.coverHint}</p>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- our own /media route or the organiser's own link
          <img src={coverUrl} alt={T.cover} className="aspect-video w-full max-w-[560px] rounded-[20px] bg-tint object-cover" />
        ) : (
          <p className="grid aspect-video w-full max-w-[560px] place-items-center rounded-[20px] bg-tint p-6 text-center text-sm text-muted">{T.noCover}</p>
        )}
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <UploadButton
              label={coverUrl ? T.replaceCover : T.uploadCover}
              className={smallButtonClass}
              busy={busy === "cover"}
              disabled={busy !== null}
              onFiles={(files) => upload("cover", "cover", files.slice(0, 1))}
            />
            {coverUrl && (
              <button type="button" disabled={busy !== null} onClick={() => remove("cover", coverUrl)} className={dangerButtonClass}>
                {T.removeCover}
              </button>
            )}
          </div>
        )}
        {messageFor("cover")}
      </Card>

      <Card
        title={T.gallery}
        action={
          !readOnly && (
            <UploadButton label={T.addPhotos} multiple busy={busy === "gallery"} disabled={busy !== null} onFiles={(files) => upload("gallery", "gallery", files)} />
          )
        }
      >
        <p className="text-[13px] text-muted">{T.galleryHint}</p>
        {items.length === 0 ? (
          <p className="rounded-2xl bg-tint px-4 py-6 text-center text-sm text-muted">{T.noGallery}</p>
        ) : (
          <ol className="flex flex-col gap-3" aria-label={T.gallery}>
            {items.map((it, i) => (
              <li key={it.id} className="flex gap-3 rounded-[20px] border-[1.5px] border-line p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- our own /media route */}
                <img src={it.url} alt={T.photo(i + 1)} className="aspect-square w-20 flex-none self-start rounded-[14px] bg-tint object-cover sm:w-28" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    aria-label={`${T.captionTh} ${T.photo(i + 1)}`}
                    placeholder={T.captionTh}
                    value={it.captionTh ?? ""}
                    maxLength={200}
                    disabled={readOnly}
                    onChange={(e) => caption(i, "captionTh", e.target.value)}
                    className={inputClass}
                  />
                  <input
                    aria-label={`${T.captionEn} ${T.photo(i + 1)}`}
                    placeholder={T.captionEn}
                    value={it.captionEn ?? ""}
                    maxLength={200}
                    disabled={readOnly}
                    onChange={(e) => caption(i, "captionEn", e.target.value)}
                    className={inputClass}
                    lang="en"
                  />
                  {!readOnly && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${T.up} ${T.photo(i + 1)}`} className={smallGhostButtonClass}>
                        ↑
                      </button>
                      <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`${T.down} ${T.photo(i + 1)}`} className={smallGhostButtonClass}>
                        ↓
                      </button>
                      <button type="button" disabled={busy !== null} onClick={() => remove(it.id, it.url)} aria-label={`${T.remove} ${T.photo(i + 1)}`} className={dangerButtonClass}>
                        {T.remove}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        {!readOnly && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy !== null}
              className={smallButtonClass}
              onClick={() =>
                run("save", async () => {
                  const res = await saveGallery(
                    orgId,
                    eventId,
                    items.map((it) => ({ imageId: it.id, captionTh: it.captionTh?.trim() || null, captionEn: it.captionEn?.trim() || null })),
                  );
                  if (!res.error) setDirty(false);
                  return res;
                })
              }
            >
              {busy === "save" ? "กำลังบันทึก…" : T.saveGallery}
            </button>
            {dirty && <span className="text-[13px] text-warn">{T.unsaved}</span>}
          </div>
        )}
        {messageFor("gallery")}
      </Card>

      {races.length > 0 && (
        <Card title={T.routeMaps}>
          <p className="text-[13px] text-muted">{T.routeMapsHint}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {races.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-[20px] border-[1.5px] border-line p-3">
                <b className="font-semibold">{r.code}</b>
                {r.routeMapUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- our own /media route
                  <img src={r.routeMapUrl} alt={`${T.routeMaps} ${r.code}`} className="aspect-[4/3] w-full rounded-[14px] bg-tint object-contain" />
                )}
                {!readOnly && (
                  <div className="flex flex-wrap gap-2">
                    <UploadButton
                      label={r.routeMapUrl ? T.replaceMap : T.uploadMap}
                      busy={busy === `map-${r.id}`}
                      disabled={busy !== null}
                      onFiles={(files) => upload(`map-${r.id}`, "route_map", files.slice(0, 1), r.id)}
                    />
                    {r.routeMapUrl && uploadedId(r.routeMapUrl) && (
                      <button type="button" disabled={busy !== null} onClick={() => remove(`map-${r.id}`, r.routeMapUrl!)} className={dangerButtonClass}>
                        {T.remove}
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {messageFor("maps")}
        </Card>
      )}
    </>
  );
}
