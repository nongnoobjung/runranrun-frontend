import { getLocale, getT } from "@/i18n/server";
import Link from "@/i18n/link";
import { POLICY_DATE } from "@/lib/legal";

/** One legal page's text in one language. */
export interface LegalContent {
  title: string;
  intro: React.ReactNode;
  sections: { heading: string; body: React.ReactNode }[];
}

/** Layout shared by the privacy policy, terms and refund policy. */
export async function LegalPage({ title, intro, sections }: LegalContent) {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  const l = t.privacy.legal;
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted">{l.effective(POLICY_DATE[locale])}</p>
        {l.translationNote && <p className="rounded-2xl bg-ice px-4 py-3 text-sm">{l.translationNote}</p>}
        <div className="text-ink/85">{intro}</div>
      </div>
      <nav aria-label={l.contents} className="rounded-card bg-tint p-5 text-sm">
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          {sections.map((s, i) => (
            <li key={s.heading}>
              <a href={`#s${i + 1}`}>{s.heading}</a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <section key={s.heading} id={`s${i + 1}`} className="flex scroll-mt-6 flex-col gap-2 leading-relaxed">
          <h2 className="text-xl font-semibold">
            {i + 1}. {s.heading}
          </h2>
          <div className="flex flex-col gap-2 text-ink/85 [&_li]:ml-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1">{s.body}</div>
        </section>
      ))}
      <p className="border-t border-line pt-4 text-sm text-muted">
        {l.seeAlso} <Link href="/privacy">{l.privacy}</Link> · <Link href="/terms">{l.terms}</Link> · <Link href="/refund-policy">{l.refund}</Link>
      </p>
    </div>
  );
}
