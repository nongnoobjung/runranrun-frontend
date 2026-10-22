"use client";

import { useState } from "react";
import { Field } from "@/components/runner-fields";
import { inputClass } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { BillingKind } from "@/lib/billing";

/**
 * Who a full tax invoice is made out to: name, 13-digit tax ID, head office / branch / person, and address.
 * Field names are `<prefix>.name` etc., read by billingOf() in the Server Action.
 */
export function TaxInvoiceFields({ prefix = "billing", errors = {} }: { prefix?: string; errors?: Record<string, string | undefined> }) {
  const t = useT().receipts.tax;
  const [kind, setKind] = useState<BillingKind>("head_office");
  const err = (name: string) => errors[`${prefix}.${name}`];
  const kinds: [BillingKind, string][] = [
    ["head_office", t.headOffice],
    ["branch", t.branch],
    ["person", t.person],
  ];
  return (
    <div className="flex flex-col gap-3">
      <Field label={t.name} name={`${prefix}.name`} error={err("name")} required autoComplete="organization" />
      <Field label={t.taxId} name={`${prefix}.taxId`} error={err("taxId")} required inputMode="numeric" maxLength={17} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-[13px] text-muted">{t.kind}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {kinds.map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-2 text-[15px]">
              <input
                type="radio"
                name={`${prefix}.kind`}
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="h-5 w-5 accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {kind === "branch" && <Field label={t.branchNo} name={`${prefix}.branchNo`} error={err("branchNo")} required inputMode="numeric" maxLength={5} />}
      <label className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">
          {t.address}
          <span className="text-bad"> *</span>
        </span>
        <textarea
          name={`${prefix}.address`}
          rows={3}
          required
          autoComplete="street-address"
          aria-invalid={Boolean(err("address"))}
          className={`${inputClass} py-3 ${err("address") ? "border-bad" : ""}`}
        />
        {err("address") && <span className="text-sm text-bad">{err("address")}</span>}
      </label>
    </div>
  );
}
