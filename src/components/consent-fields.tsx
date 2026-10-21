import Link from "next/link";

/**
 * What a runner agrees to before their details are sent: the terms, the privacy policy and sharing the runners'
 * details with the event's organiser (required), and news from the platform (optional, unticked).
 */
export function ConsentFields({ organizer, error }: { organizer: string; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-card bg-white p-5">
      <legend className="sr-only">ความยินยอม</legend>
      <label className="flex items-start gap-3 text-[15px]">
        <input type="checkbox" name="consent" value="1" aria-invalid={Boolean(error)} className="mt-0.5 h-5 w-5 flex-none accent-brand" />
        <span>
          ยอมรับ{" "}
          <Link href="/terms" target="_blank">
            เงื่อนไขการใช้งาน
          </Link>{" "}
          และ{" "}
          <Link href="/privacy" target="_blank">
            นโยบายความเป็นส่วนตัว
          </Link>{" "}
          และยินยอมให้ส่งข้อมูลผู้วิ่งให้ผู้จัดงาน {organizer} เพื่อจัดงาน
          <span className="text-bad"> *</span>
        </span>
      </label>
      {error && <span className="text-sm text-bad">{error}</span>}
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="marketing" value="1" className="mt-0.5 h-5 w-5 flex-none accent-brand" />
        <span>รับข่าวงานวิ่งอื่น ๆ จากก้าวทางอีเมล (ไม่บังคับ ยกเลิกได้ทุกเมื่อ)</span>
      </label>
    </fieldset>
  );
}
