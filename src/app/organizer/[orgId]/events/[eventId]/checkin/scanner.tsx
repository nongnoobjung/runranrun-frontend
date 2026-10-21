"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { inputClass } from "@/components/ui";
import { fmt } from "@/lib/format";
import type { CheckinRegistration } from "@/lib/org";
import { confirmPickup, lookupCode, type ScanResult } from "./actions";

interface Detector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (options: { formats: string[] }) => Detector;

type Camera = { state: "off" } | { state: "starting" } | { state: "on" } | { state: "error"; message: string };

const GENDER: Record<CheckinRegistration["gender"], string> = { male: "ชาย", female: "หญิง", other: "อื่น ๆ" };

function displayName(r: CheckinRegistration) {
  return r.name.th ?? r.name.en;
}

/** Scan (camera or USB/typed code) → check the runner → hand over the kit once. */
export function Scanner({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [result, setResult] = useState<ScanResult | null>(null);
  // One id per looked-up runner: a double tap or retried request then records the pickup once.
  const [clientUuid, setClientUuid] = useState<string | null>(null);
  const [recent, setRecent] = useState<CheckinRegistration[]>([]);
  const [camera, setCamera] = useState<Camera>({ state: "off" });
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The camera loop reads these without restarting.
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const lookup = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!code) return;
      // Pauses the camera loop until the staff member moves on; typed codes always go through.
      busyRef.current = true;
      startTransition(async () => {
        const res = await lookupCode(orgId, eventId, code);
        setResult(res);
        setClientUuid(res.kind === "ready" ? crypto.randomUUID() : null);
      });
    },
    [orgId, eventId],
  );

  const reset = useCallback(() => {
    busyRef.current = false;
    setResult(null);
    setClientUuid(null);
    if (inputRef.current) {
      inputRef.current.value = "";
      if (!streamRef.current) inputRef.current.focus();
    }
  }, []);

  function confirm(form: FormData) {
    if (result?.kind !== "ready" || !clientUuid) return;
    const registration = result.registration;
    startTransition(async () => {
      const res = await confirmPickup(orgId, eventId, {
        code: registration.registrationNo,
        clientUuid,
        pickedUpBy: String(form.get("pickedUpBy") ?? ""),
      });
      setResult(res);
      if (res.kind === "done") setRecent((list) => [res.registration, ...list.filter((r) => r.id !== res.registration.id)].slice(0, 5));
    });
  }

  // After a successful handover, get ready for the next runner on its own.
  useEffect(() => {
    if (result?.kind !== "done") return;
    const t = setTimeout(reset, 4000);
    return () => clearTimeout(t);
  }, [result, reset]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setCamera({ state: "error", message: "เบราว์เซอร์นี้สแกน QR ด้วยกล้องไม่ได้ ใช้ Chrome บน Android หรือพิมพ์เลขบิบแทน" });
      return;
    }
    setCamera({ state: "starting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setCamera({ state: "on" });
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (streamRef.current !== stream) return;
        if (!busyRef.current && video.readyState >= 2) {
          try {
            const [hit] = await detector.detect(video);
            const now = Date.now();
            const last = lastScanRef.current;
            // The same QR stays in frame for a while; ignore it for a few seconds after reading it.
            if (hit?.rawValue && !(last && last.code === hit.rawValue && now - last.at < 5000)) {
              lastScanRef.current = { code: hit.rawValue, at: now };
              lookup(hit.rawValue);
            }
          } catch {
            // A frame that cannot be decoded is normal; try the next one.
          }
        }
        setTimeout(tick, 250);
      };
      void tick();
    } catch (err) {
      stopCamera();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setCamera({
        state: "error",
        message: denied ? "ไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์ หรือพิมพ์เลขบิบแทน" : "เปิดกล้องไม่ได้ พิมพ์เลขบิบหรือเลขสมัครแทน",
      });
    }
  }

  function closeCamera() {
    stopCamera();
    setCamera({ state: "off" });
  }

  const cameraOn = camera.state === "on" || camera.state === "starting";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative grid aspect-[4/3] max-h-[340px] w-full place-items-center overflow-hidden rounded-[28px] bg-ink">
        <video ref={videoRef} muted playsInline className={`absolute inset-0 h-full w-full object-cover ${cameraOn ? "" : "hidden"}`} />
        <div aria-hidden className="relative h-36 w-36">
          <span className="absolute top-0 left-0 h-9 w-9 rounded-tl-xl border-t-4 border-l-4 border-sky" />
          <span className="absolute top-0 right-0 h-9 w-9 rounded-tr-xl border-t-4 border-r-4 border-sky" />
          <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-xl border-b-4 border-l-4 border-sky" />
          <span className="absolute right-0 bottom-0 h-9 w-9 rounded-br-xl border-r-4 border-b-4 border-sky" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4">
          {cameraOn ? (
            <>
              <span className="text-sm text-white">{camera.state === "starting" ? "กำลังเปิดกล้อง…" : "เล็ง QR ในบัตรวิ่งให้อยู่ในกรอบ"}</span>
              <button type="button" onClick={closeCamera} className="min-h-10 rounded-full bg-white/15 px-4 text-sm text-white hover:bg-white/25">
                ปิดกล้อง
              </button>
            </>
          ) : (
            <button type="button" onClick={startCamera} className="min-h-12 rounded-full bg-white px-6 font-semibold text-ink hover:bg-ice">
              เปิดกล้องสแกน QR
            </button>
          )}
        </div>
      </div>
      {camera.state === "error" && (
        <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          {camera.message}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
          lookup(input.value);
          input.select();
        }}
      >
        <label className="sr-only" htmlFor="checkin-code">
          พิมพ์เลขบิบ หรือเลขสมัคร
        </label>
        <input
          ref={inputRef}
          id="checkin-code"
          name="code"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          enterKeyHint="search"
          placeholder="พิมพ์เลขบิบ หรือเลขสมัคร"
          className={`${inputClass} min-w-0 flex-1 text-lg`}
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 flex-none rounded-[14px] bg-brand px-5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          ค้นหา
        </button>
      </form>

      <div aria-live="polite" aria-busy={pending}>
        {pending && !result && <div className="h-40 animate-pulse rounded-[28px] bg-white" />}
        {result && <ResultCard result={result} pending={pending} onConfirm={confirm} onNext={reset} />}
      </div>

      {recent.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[28px] bg-white p-5">
          <h2 className="font-semibold">มอบของล่าสุด</h2>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {displayName(r)} · {r.race.code}
                  {r.bibNumber && ` · บิบ ${r.bibNumber}`}
                </span>
                <span className="flex-none text-muted">{r.kitPickedUpAt ? fmt.time(r.kitPickedUpAt) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RunnerTile({ r }: { r: CheckinRegistration }) {
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-white p-3.5 text-ink">
      <span className="grid h-[72px] w-[72px] flex-none place-items-center rounded-2xl bg-ice text-3xl font-bold text-brand" aria-label={`ไซซ์เสื้อ ${r.shirtSize ?? "ไม่มี"}`}>
        {r.shirtSize ?? "–"}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="text-lg leading-snug font-semibold break-words">{displayName(r)}</b>
        {r.name.th && <span className="text-[13px] text-muted">{r.name.en}</span>}
        <span className="text-[13px] text-muted">
          {GENDER[r.gender]}
          {r.ageGroup ? ` · รุ่น ${r.ageGroup}` : ` · อายุ ${r.age}`} · {r.registrationNo}
        </span>
      </span>
    </div>
  );
}

function RaceBadge({ r }: { r: CheckinRegistration }) {
  return (
    <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold whitespace-nowrap">
      {r.race.code}
      {r.bibNumber && ` · บิบ ${r.bibNumber}`}
    </span>
  );
}

const nextButton = "min-h-14 w-full rounded-full bg-white text-lg font-semibold hover:bg-ice disabled:opacity-60";

function ResultCard({
  result,
  pending,
  onConfirm,
  onNext,
}: {
  result: ScanResult;
  pending: boolean;
  onConfirm: (form: FormData) => void;
  onNext: () => void;
}) {
  switch (result.kind) {
    case "ready": {
      const r = result.registration;
      return (
        <form action={onConfirm} className="flex flex-col gap-3 rounded-[28px] bg-ok p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">มอบของได้</h2>
            <RaceBadge r={r} />
          </div>
          <RunnerTile r={r} />
          {r.emergencyName && <p className="text-sm">ผู้ติดต่อฉุกเฉิน: {r.emergencyName}</p>}
          <label className="flex flex-col gap-1 text-sm">
            รับแทนโดย (ถ้ามี)
            <input name="pickedUpBy" maxLength={120} autoComplete="off" placeholder="ชื่อผู้รับแทน" className={`${inputClass} text-base`} />
          </label>
          <button type="submit" disabled={pending} className={`${nextButton} text-ok`}>
            {pending ? "กำลังบันทึก…" : "ยืนยัน ให้เสื้อและบิบแล้ว"}
          </button>
          <button type="button" onClick={onNext} className="min-h-11 text-sm text-white/90 underline">
            ยกเลิก สแกนใหม่
          </button>
        </form>
      );
    }
    case "done": {
      const r = result.registration;
      return (
        <div className="flex flex-col gap-3 rounded-[28px] bg-ok p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">✓ บันทึกแล้ว</h2>
            <RaceBadge r={r} />
          </div>
          <p>
            {displayName(r)} รับเสื้อไซซ์ <b>{r.shirtSize ?? "–"}</b> และบิบแล้ว
          </p>
          <button type="button" onClick={onNext} autoFocus className={`${nextButton} text-ok`}>
            สแกนคนต่อไป
          </button>
        </div>
      );
    }
    case "picked_up": {
      const r = result.registration;
      return (
        <div className="flex flex-col gap-3 rounded-[28px] bg-bad p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">รับไปแล้ว</h2>
            <RaceBadge r={r} />
          </div>
          <div className="rounded-[20px] bg-white p-3.5 text-ink">
            <b className="font-semibold">{displayName(r)}</b>
            <p className="text-sm">
              รับเมื่อ {r.kitPickedUpAt ? `${fmt.date(r.kitPickedUpAt)} ${fmt.time(r.kitPickedUpAt)}` : "–"}
            </p>
          </div>
          <p className="text-sm">ถ้านักวิ่งยืนยันว่ายังไม่ได้รับ ให้ส่งต่อหัวหน้าจุด</p>
          <button type="button" onClick={onNext} autoFocus className={`${nextButton} text-bad`}>
            สแกนคนต่อไป
          </button>
        </div>
      );
    }
    case "not_confirmed": {
      const r = result.registration;
      return (
        <div className="flex flex-col gap-3 rounded-[28px] bg-warn p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-bold">ยังไม่ได้ชำระเงิน / สิทธิ์ไม่ถูกต้อง</h2>
            <RaceBadge r={r} />
          </div>
          <RunnerTile r={r} />
          <p className="text-sm">
            {r.status === "pending" ? "คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน ห้ามมอบของ" : "สิทธิ์นี้ถูกยกเลิกหรือคืนเงินแล้ว ห้ามมอบของ"} ส่งต่อหัวหน้าจุด
          </p>
          <button type="button" onClick={onNext} autoFocus className={`${nextButton} text-warn`}>
            สแกนคนต่อไป
          </button>
        </div>
      );
    }
    case "not_found":
      return (
        <div className="flex flex-col gap-3 rounded-[28px] bg-warn-soft p-4 text-warn">
          <h2 className="text-2xl font-bold">ไม่พบ QR นี้</h2>
          <p className="text-sm break-all">
            ไม่มีผู้สมัครในงานนี้ที่ตรงกับ “{result.code}” ตรวจว่าเป็นบัตรของงานนี้ หรือลองพิมพ์เลขบิบ
          </p>
          <button type="button" onClick={onNext} autoFocus className="min-h-14 w-full rounded-full bg-warn text-lg font-semibold text-white">
            สแกนใหม่
          </button>
        </div>
      );
    case "error":
      return (
        <div role="alert" className="flex flex-col gap-3 rounded-[28px] bg-bad-soft p-4 text-bad">
          <p>{result.message}</p>
          <button type="button" onClick={onNext} className="min-h-12 w-full rounded-full bg-white font-semibold">
            ลองใหม่
          </button>
        </div>
      );
  }
}
