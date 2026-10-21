import Link from "next/link";
import { POLICY_DATE } from "@/lib/legal";

/** Layout shared by the privacy policy, terms and refund policy. */
export function LegalPage({ title, intro, sections }: { title: string; intro: React.ReactNode; sections: { heading: string; body: React.ReactNode }[] }) {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted">มีผลตั้งแต่ {POLICY_DATE}</p>
        <div className="text-ink/85">{intro}</div>
      </div>
      <nav aria-label="สารบัญ" className="rounded-card bg-tint p-5 text-sm">
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
        ดูเพิ่ม: <Link href="/privacy">นโยบายความเป็นส่วนตัว</Link> · <Link href="/terms">เงื่อนไขการใช้งาน</Link> ·{" "}
        <Link href="/refund-policy">นโยบายคืนเงิน</Link>
      </p>
    </div>
  );
}
