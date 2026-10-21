"use client";

export default function OrganizerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-start gap-3 px-4 py-16">
      <h1 className="text-3xl font-bold">มีบางอย่างผิดพลาด</h1>
      <p className="text-muted">ระบบไม่ตอบสนองชั่วคราว ลองใหม่อีกครั้งในอีกสักครู่</p>
      <button type="button" onClick={reset} className="rounded-full bg-brand px-6 py-3 font-semibold text-white">
        ลองอีกครั้ง
      </button>
    </div>
  );
}
