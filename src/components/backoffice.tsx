import type { OrgFormState } from "@/lib/org-actions";

/** Building blocks of the organizer backoffice (design D: white cards on the tint background). */

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: React.ReactNode; title: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <span className="text-sm text-muted">{eyebrow}</span>}
        <h1 className="text-3xl font-bold leading-tight">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold whitespace-nowrap ${className}`}>{label}</span>;
}

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="text-[13px] text-bad">{error}</span> : hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}

/** Error or success line under a form; role=alert / status so screen readers announce it. */
export function FormMessage({ state }: { state: OrgFormState | undefined }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
        {state.error}
      </p>
    );
  }
  if (state?.notice) {
    return (
      <p role="status" className="rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
        {state.notice}
      </p>
    );
  }
  return null;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[28px] bg-white p-8 text-center text-muted">{children}</div>;
}

export const smallButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";
export const smallGhostButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-white px-4 text-sm font-medium text-ink no-underline transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-60";
export const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-bad-soft px-4 text-sm font-semibold text-bad transition hover:bg-bad hover:text-white disabled:cursor-not-allowed disabled:opacity-60";
