"use server";

import { text } from "@/lib/form";
import { orgMutation, type OrgFormState } from "@/lib/org-actions";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Saves what the owner filled in so far: empty fields are left as they were (none of them can be cleared, they are
 * all needed for KYC). The address goes as a whole once any part of it is typed, so the API points at what is missing.
 */
export async function updateCompany(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const value = (name: string) => text(fd, name) ?? undefined;
  const address = { line1: value("address.line1"), subdistrict: value("address.subdistrict"), district: value("address.district"), province: value("address.province"), postcode: value("address.postcode") };
  const res = await orgMutation(orgId, "/kyc", "PATCH", {
    nameTh: value("nameTh"),
    nameEn: text(fd, "nameEn"),
    legalName: value("legalName"),
    taxId: value("taxId"),
    // Locked fields are disabled, so they are not in the form at all.
    isVatRegistered: fd.has("vatField") ? fd.get("isVatRegistered") === "on" : undefined,
    contactEmail: value("contactEmail"),
    contactPhone: value("contactPhone"),
    address: Object.values(address).some(Boolean) ? { ...address, line1: address.line1 ?? "", district: address.district ?? "", province: address.province ?? "", postcode: address.postcode ?? "" } : undefined,
  });
  return res.ok ? { notice: "บันทึกข้อมูลแล้ว" } : res.state;
}

export async function uploadDocument(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { file: "เลือกไฟล์ก่อน" } };
  if (file.size > MAX_BYTES) return { fieldErrors: { file: "ไฟล์ใหญ่เกิน 10 MB" } };
  const form = new FormData();
  form.set("type", text(fd, "type") ?? "");
  form.set("file", file, file.name);
  const res = await orgMutation(orgId, "/kyc/documents", "POST", form);
  return res.ok ? { notice: `อัปโหลด ${file.name} แล้ว รอทีมงานก้าวตรวจ` } : res.state;
}

export async function deleteDocument(orgId: string, docId: string): Promise<OrgFormState> {
  const res = await orgMutation(orgId, `/kyc/documents/${docId}`, "DELETE");
  return res.ok ? {} : res.state;
}

export async function submitBankAccount(orgId: string, _prev: OrgFormState, fd: FormData): Promise<OrgFormState> {
  const res = await orgMutation(orgId, "/bank-account", "PUT", {
    bankCode: text(fd, "bankCode") ?? "",
    accountName: text(fd, "accountName") ?? "",
    accountNumber: text(fd, "accountNumber") ?? "",
    branch: text(fd, "branch") ?? undefined,
  });
  return res.ok ? { notice: "ส่งบัญชีรับเงินแล้ว รอทีมงานก้าวตรวจกับหน้าสมุดบัญชี" } : res.state;
}
