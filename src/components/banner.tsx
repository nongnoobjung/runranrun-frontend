import type { EventType } from "@/lib/types";

type Scene = "night" | "mountain" | "sea" | "city";

const SCENES: Record<Scene, { sky: string; ground: string; sun: string; text: string; path: string; extra?: string; groundPct: number }> = {
  night: {
    sky: "#1b2b5a",
    ground: "#0b1530",
    sun: "#f5f1c8",
    text: "#ffffff",
    groundPct: 23.75,
    path: "M0 160 L0 122 L78 122 L78 64 L88 64 L88 122 L212 122 L212 64 L222 64 L222 122 L300 122 L300 160 Z",
    extra: "M83 66 L150 120 M83 66 L40 120 M217 66 L150 120 M217 66 L260 120",
  },
  mountain: {
    sky: "#f4b860",
    ground: "#2e5e4e",
    sun: "#ffe7a8",
    text: "#1f2a24",
    groundPct: 30,
    path: "M0 160 L0 112 L46 74 L84 102 L140 44 L190 96 L232 68 L300 106 L300 160 Z",
  },
  sea: {
    sky: "#8ed8f8",
    ground: "#1478b8",
    sun: "#fff4c2",
    text: "#0e2a47",
    groundPct: 26.25,
    path: "M0 160 L0 118 Q 25 108 50 118 T 100 118 T 150 118 T 200 118 T 250 118 T 300 118 L300 160 Z",
  },
  city: {
    sky: "#b9dffc",
    ground: "#1270cc",
    sun: "#ffffff",
    text: "#0e2a47",
    groundPct: 30,
    path: "M0 160 L0 112 L30 112 L45 92 L60 112 L90 112 L90 97 L120 97 L120 112 L150 112 L170 82 L190 112 L220 112 L220 102 L250 102 L265 87 L280 102 L300 102 L300 160 Z",
  },
};

export function sceneFor(slug: string, type: EventType): Scene {
  if (type === "trail" || type === "ultra") return "mountain";
  if (/night/i.test(slug)) return "night";
  if (/beach|sea|island|andaman/i.test(slug)) return "sea";
  return "city";
}

/**
 * Illustrated stand-in for an event banner. When the organiser uploads a cover image
 * the image is shown instead.
 */
export function EventBanner({
  slug,
  type,
  title,
  subtitle,
  imageUrl,
  className = "",
  titleSize = "text-xl",
  children,
}: {
  slug: string;
  type: EventType;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  className?: string;
  titleSize?: string;
  children?: React.ReactNode;
}) {
  const s = SCENES[sceneFor(slug, type)];
  return (
    <div
      role="img"
      aria-label={`แบนเนอร์งาน ${title}`}
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: s.sky }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- organiser uploads come from arbitrary storage hosts
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          {/* The scene keeps its proportions and sits at the right; a ground strip carries it across wide banners. */}
          <div aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: `${s.groundPct}%`, backgroundColor: s.ground }} />
          <svg aria-hidden viewBox="0 0 300 160" preserveAspectRatio="xMaxYMax meet" className="absolute inset-0 h-full w-full">
            <circle cx="226" cy="62" r="22" fill={s.sun} />
            <path d={s.path} fill={s.ground} />
            {s.extra && <path d={s.extra} stroke="#3b5294" strokeWidth="1.5" fill="none" />}
          </svg>
        </>
      )}
      <div className="absolute left-4 top-3.5 right-24 leading-tight" style={{ color: imageUrl ? "#ffffff" : s.text }}>
        <div className={`${titleSize} line-clamp-2 font-bold uppercase`}>{title}</div>
        {subtitle && <div className="pt-1 text-xs font-medium tracking-[0.14em] uppercase">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}
