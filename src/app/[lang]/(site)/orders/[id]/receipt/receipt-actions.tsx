"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { requestTaxInvoice, type FormState } from "@/app/actions";
import { TaxInvoiceFields } from "@/components/tax-invoice-fields";
import { buttonClass, ErrorNote, ghostButtonClass } from "@/components/ui";
import { useT } from "@/i18n/client";

export function PrintButton() {
  const t = useT().receipts.receipt;
  return (
    <button type="button" onClick={() => window.print()} className={ghostButtonClass}>
      {t.print}
    </button>
  );
}

/** Asks for a full tax invoice; the page then shows the new document in place of the receipt. */
export function TaxInvoiceForm({ orderId, vatRegistered }: { orderId: string; vatRegistered: boolean }) {
  const t = useT().receipts.tax;
  const [state, formAction, pending] = useActionState<FormState, FormData>(requestTaxInvoice.bind(null, orderId), {});
  const [, startTransition] = useTransition();
  // Submit through a transition so what was typed stays in the form when the server sends back an error.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="tax-invoice-title" className="flex flex-col gap-4 rounded-card bg-white p-5 sm:p-6">
      <div>
        <h2 id="tax-invoice-title" className="text-lg font-semibold">
          {t.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{vatRegistered ? t.intro : t.introNoVat}</p>
      </div>
      <TaxInvoiceFields errors={state.fieldErrors} />
      <ErrorNote message={state.error} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {pending ? t.pending : t.submit}
      </button>
    </form>
  );
}
