import type { Locale } from "@/i18n/config";

/**
 * Who runs the platform, as the legal pages name it. The bracketed values are placeholders: fill in the real
 * company details (and have the policies reviewed by a lawyer) before launch.
 */
export const COMPANY = {
  name: "[ชื่อบริษัทผู้ให้บริการแพลตฟอร์มก้าว]",
  address: "[ที่อยู่บริษัท]",
  email: "[อีเมลติดต่อ เช่น privacy@โดเมน]",
  dpoEmail: "[อีเมลเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)]",
};

/** The same, for the English pages. */
export const COMPANY_EN: typeof COMPANY = {
  name: "[Name of the company that operates Kao]",
  address: "[Company address]",
  email: "[Contact email, e.g. privacy@domain]",
  dpoEmail: "[Data protection officer (DPO) email]",
};

export function companyFor(locale: Locale): typeof COMPANY {
  return locale === "th" ? COMPANY : COMPANY_EN;
}

/** Must match POLICY_VERSION in the API, which records it with every consent. */
export const POLICY_VERSION = "2026-10-22";
export const POLICY_DATE: Record<Locale, string> = { th: "22 ตุลาคม 2026", en: "22 October 2026" };
