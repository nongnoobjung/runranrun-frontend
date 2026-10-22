import type { Metadata } from "next";
import Link from "@/i18n/link";
import { getT } from "@/i18n/server";
import type { Dict } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.howto.title, description: t.howto.intro };
}

type Step = Dict["howto"]["steps"][number];

function StepLinks({ links }: { links: Step["links"] }) {
  if (links.length === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="font-semibold">
          {l.label} →
        </Link>
      ))}
    </span>
  );
}

/** Steps without numbers, for the sections after the main flow. */
function StepList({ steps }: { steps: Step[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {steps.map((s) => (
        <li key={s.title} className="flex flex-col gap-1 rounded-card bg-tint p-5">
          <h3 className="text-lg font-semibold">{s.title}</h3>
          <p className="text-[15px] text-muted">{s.text}</p>
          <StepLinks links={s.links} />
        </li>
      ))}
    </ul>
  );
}

/** How a runner registers, start to finish, with links to the pages that do each step. */
export default async function HowToRegisterPage() {
  const t = await getT();
  const h = t.howto;
  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-10 px-4 py-8 sm:px-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">{h.title}</h1>
        <p className="text-lg text-muted">{h.intro}</p>
      </div>

      <ol aria-label={h.stepsLabel} className="flex flex-col gap-5">
        {h.steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4">
            <span aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-full bg-ice text-xl font-bold text-brand">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1 pt-1.5">
              <h2 className="text-lg font-semibold leading-snug">{s.title}</h2>
              <p className="text-[15px] text-muted">{s.text}</p>
              <StepLinks links={s.links} />
            </div>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">{h.changesTitle}</h2>
          <p className="mt-1 text-muted">{h.changesIntro}</p>
        </div>
        <StepList steps={h.changes} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">{h.afterTitle}</h2>
        <StepList steps={h.after} />
      </section>

      <Link href="/events" className="self-start rounded-2xl bg-brand px-7 py-4 font-semibold text-white no-underline hover:bg-brand-dark">
        {h.cta}
      </Link>
    </div>
  );
}
