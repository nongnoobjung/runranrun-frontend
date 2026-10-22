import Link from "next/link";
import { KYC_DOC_TYPE, KYC_READINESS, orgKyc } from "@/lib/org";

/**
 * Where the team stands with KYC, on its event list: suspended, documents sent back, still missing something,
 * or waiting for the platform. Nothing once the team is active and nothing is sent back.
 */
export async function KycNotice({ orgId }: { orgId: string }) {
  const kyc = await orgKyc(orgId);
  const rejected = kyc.documents.filter((d) => d.status === "rejected");
  const missing = kyc.readiness.filter((r) => !r.ok).map((r) => KYC_READINESS[r.key]);
  const go = (
    <Link href={`/${orgId}/kyc`} className="font-semibold text-inherit">
      ไปหน้าข้อมูลทีมและ KYC
    </Link>
  );

  if (kyc.status === "suspended") {
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
        <b>ทีมนี้ถูกระงับ เปิดรับสมัครงานใหม่ไม่ได้</b>
        {kyc.statusNote && <span>เหตุผล: {kyc.statusNote}</span>}
      </div>
    );
  }
  if (rejected.length) {
    return (
      <div className="flex flex-col gap-1 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
        <b>เอกสารไม่ผ่านการตรวจ {rejected.length} ไฟล์ ส่งไฟล์ใหม่แทน</b>
        <ul className="list-disc pl-5">
          {rejected.map((d) => (
            <li key={d.id}>
              {KYC_DOC_TYPE[d.type]}: {d.rejectReason}
            </li>
          ))}
        </ul>
        {go}
      </div>
    );
  }
  if (kyc.status !== "pending_kyc") return null;
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <b>ทีมนี้ยังรอตรวจเอกสาร (KYC) สร้างงานและกรอกข้อมูลได้ แต่จะเปิดรับสมัครได้หลังเอกสารผ่าน</b>
      <span>{missing.length ? `ยังขาด: ${missing.join(", ")}` : "ส่งข้อมูลครบแล้ว รอทีมงานก้าวตรวจ"}</span>
      {go}
    </div>
  );
}
