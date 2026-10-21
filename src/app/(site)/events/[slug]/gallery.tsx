"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/content";

export interface GalleryPhoto {
  url: string;
  width: number;
  height: number;
  caption: string | null;
}

const COPY = {
  th: { open: (n: number) => `เปิดรูปที่ ${n}`, close: "ปิด", prev: "รูปก่อนหน้า", next: "รูปถัดไป", of: (i: number, n: number) => `${i} / ${n}`, photo: "รูปจากงาน" },
  en: { open: (n: number) => `Open photo ${n}`, close: "Close", prev: "Previous photo", next: "Next photo", of: (i: number, n: number) => `${i} / ${n}`, photo: "Event photo" },
} satisfies Record<Lang, unknown>;

/**
 * A strip of photos that scrolls sideways (swipe on a phone), each opening a full-screen viewer. The viewer is a
 * native <dialog>: Escape and the back gesture close it, focus stays inside, arrow keys move between photos.
 */
export function Gallery({ images, lang }: { images: GalleryPhoto[]; lang: Lang }) {
  const t = COPY[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : images[index];
  const step = (by: number) => setIndex((i) => (i === null ? i : (i + by + images.length) % images.length));

  useEffect(() => {
    if (index !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [index]);

  return (
    <>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
        {images.map((img, i) => (
          <li key={img.url} className="flex-none snap-start">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={img.caption ? `${t.open(i + 1)}: ${img.caption}` : t.open(i + 1)}
              className="group flex w-[min(78vw,320px)] flex-col gap-1.5 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own /media route, already resized */}
              <img
                src={img.url}
                alt=""
                width={img.width}
                height={img.height}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[20px] bg-tint object-cover transition group-hover:brightness-95"
              />
              {img.caption && <span className="line-clamp-1 text-sm text-muted">{img.caption}</span>}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current?.caption ?? t.photo}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
      >
        {current && (
          // A tap beside the photo closes the viewer, like tapping a backdrop.
          <figure onClick={(e) => e.target === e.currentTarget && dialog.current?.close()} className="flex h-dvh w-screen flex-col items-center justify-center gap-3 bg-black/90 p-4 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
            <img src={current.url} alt={current.caption ?? ""} className="max-h-[78dvh] max-w-full rounded-[14px] object-contain" />
            <figcaption className="flex flex-col items-center gap-0.5 text-center">
              {current.caption && <span>{current.caption}</span>}
              <span className="text-sm text-white/70">{t.of(index! + 1, images.length)}</span>
            </figcaption>
            <div className="flex gap-2">
              {images.length > 1 && (
                <button type="button" onClick={() => step(-1)} aria-label={t.prev} className="h-12 w-12 rounded-full bg-white/15 text-xl">
                  ‹
                </button>
              )}
              <button type="button" onClick={() => dialog.current?.close()} className="h-12 rounded-full bg-white px-6 font-semibold text-ink">
                {t.close}
              </button>
              {images.length > 1 && (
                <button type="button" onClick={() => step(1)} aria-label={t.next} className="h-12 w-12 rounded-full bg-white/15 text-xl">
                  ›
                </button>
              )}
            </div>
          </figure>
        )}
      </dialog>
    </>
  );
}
