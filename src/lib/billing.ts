import type { Billing } from "./types";

/** Head office, as the Revenue Department writes it on tax invoices. */
export const HEAD_OFFICE = "00000";

/** A Thai tax ID (a company's, or a person's ID card number): 13 digits, the last one a checksum. */
export function validTaxId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  const sum = [...id.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}

export type BillingKind = "head_office" | "branch" | "person";

export interface BillingErrors {
  name: string;
  taxId: string;
  branchNo: string;
  address: string;
}

/**
 * Reads the tax invoice fields (see TaxInvoiceFields) named `<prefix>.name`, `.taxId`, `.kind`, `.branchNo` and
 * `.address`. Problems go into `fieldErrors` under the same names, with the messages in `msg`.
 */
export function billingOf(formData: FormData, prefix: string, fieldErrors: Record<string, string>, msg: BillingErrors): Billing {
  const get = (k: string) => String(formData.get(`${prefix}.${k}`) ?? "").trim();
  const name = get("name");
  const taxId = get("taxId").replace(/[\s-]/g, "");
  const kind = get("kind") as BillingKind;
  const branchNo = get("branchNo");
  const address = get("address");
  if (name.length < 2) fieldErrors[`${prefix}.name`] = msg.name;
  if (!validTaxId(taxId)) fieldErrors[`${prefix}.taxId`] = msg.taxId;
  if (kind === "branch" && !/^\d{5}$/.test(branchNo)) fieldErrors[`${prefix}.branchNo`] = msg.branchNo;
  if (address.length < 10) fieldErrors[`${prefix}.address`] = msg.address;
  return { name, taxId, branch: kind === "person" ? null : kind === "branch" ? branchNo : HEAD_OFFICE, address };
}
