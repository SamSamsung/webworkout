/**
 * Carte musculaire SVG.
 *
 * Plutôt que des photos ou des GIF (lourds, difficiles à sourcer et à
 * maintenir pour 472 fiches), chaque exercice est illustré par une silhouette
 * stylisée où les zones sollicitées s'allument : en plein pour les muscles
 * principaux, en teinte atténuée pour les secondaires.
 *
 * Les tracés sont volontairement schématiques — l'objectif est la lisibilité
 * immédiate d'un coup d'œil, pas la précision d'une planche d'anatomie.
 */
import type { Muscle } from "@/types/exercise";

type View = "face" | "dos";

/** Une zone dessinable : son tracé, la vue où elle apparaît, et les muscles qu'elle couvre. */
interface Region {
  id: string;
  view: View;
  muscles: Muscle[];
  /** Tracé SVG dans un repère 100 × 200. */
  d: string;
}

const REGIONS: Region[] = [
  // ----------------------------------------------------------- Vue de face
  { id: "cou-face", view: "face", muscles: ["sterno-cleido-mastoidien"], d: "M44 26 h12 v7 h-12 z" },
  {
    id: "pectoraux",
    view: "face",
    muscles: ["grand-pectoral-claviculaire", "grand-pectoral-sternal", "petit-pectoral"],
    d: "M34 38 q16 -6 32 0 l-2 14 q-14 5 -28 0 z",
  },
  {
    id: "deltoides-avant",
    view: "face",
    muscles: ["deltoide-anterieur", "deltoide-lateral", "coiffe-des-rotateurs"],
    d: "M26 36 q-7 4 -7 13 l9 3 q2 -9 6 -14 z M74 36 q7 4 7 13 l-9 3 q-2 -9 -6 -14 z",
  },
  {
    id: "biceps",
    view: "face",
    muscles: ["biceps-brachial", "brachial-anterieur"],
    d: "M19 51 l9 3 l-2 16 l-9 -2 z M81 51 l-9 3 l2 16 l9 -2 z",
  },
  {
    id: "avant-bras-face",
    view: "face",
    muscles: ["brachio-radial", "flechisseurs-avant-bras", "extenseurs-avant-bras"],
    d: "M17 70 l9 2 l-2 20 l-9 -2 z M83 70 l-9 2 l2 20 l9 -2 z",
  },
  {
    id: "abdominaux",
    view: "face",
    muscles: ["grand-droit-abdomen", "transverse", "diaphragme"],
    d: "M40 54 h20 v28 q-10 5 -20 0 z",
  },
  {
    id: "obliques",
    view: "face",
    muscles: ["obliques-externes", "obliques-internes", "dentele-anterieur"],
    d: "M33 52 l6 2 v28 l-7 -4 z M67 52 l-6 2 v28 l7 -4 z",
  },
  {
    id: "psoas",
    view: "face",
    muscles: ["psoas-iliaque", "tenseur-fascia-lata"],
    d: "M41 83 h18 l-2 8 h-14 z",
  },
  {
    id: "quadriceps",
    view: "face",
    muscles: ["quadriceps-droit-femoral", "quadriceps-vastes"],
    d: "M38 92 h9 l-1 34 h-10 z M53 92 h9 l2 34 h-10 z",
  },
  {
    id: "adducteurs",
    view: "face",
    muscles: ["adducteurs"],
    d: "M47 92 h6 v26 h-6 z",
  },
  {
    id: "tibial",
    view: "face",
    muscles: ["tibial-anterieur"],
    d: "M38 133 h8 l-1 30 h-8 z M54 133 h8 l1 30 h-8 z",
  },

  // ------------------------------------------------------------ Vue de dos
  { id: "cou-dos", view: "dos", muscles: ["splenius"], d: "M44 26 h12 v7 h-12 z" },
  {
    id: "trapezes",
    view: "dos",
    muscles: ["trapeze-superieur", "trapeze-moyen", "trapeze-inferieur", "rhomboides"],
    d: "M34 34 q16 -5 32 0 l-6 24 h-20 z",
  },
  {
    id: "deltoides-arriere",
    view: "dos",
    muscles: ["deltoide-posterieur", "coiffe-des-rotateurs"],
    d: "M26 36 q-7 4 -7 13 l9 3 q2 -9 6 -14 z M74 36 q7 4 7 13 l-9 3 q-2 -9 -6 -14 z",
  },
  {
    id: "dorsaux",
    view: "dos",
    muscles: ["grand-dorsal", "grand-rond"],
    d: "M32 50 l8 8 h20 l8 -8 l-3 26 q-15 6 -30 0 z",
  },
  {
    id: "lombaires",
    view: "dos",
    muscles: ["erecteurs-du-rachis", "carre-des-lombes"],
    d: "M41 76 h18 v12 h-18 z",
  },
  {
    id: "triceps",
    view: "dos",
    muscles: ["triceps-longue-portion", "triceps-vaste-lateral", "triceps-vaste-medial"],
    d: "M19 51 l9 3 l-2 16 l-9 -2 z M81 51 l-9 3 l2 16 l9 -2 z",
  },
  {
    id: "avant-bras-dos",
    view: "dos",
    muscles: ["extenseurs-avant-bras", "brachio-radial"],
    d: "M17 70 l9 2 l-2 20 l-9 -2 z M83 70 l-9 2 l2 20 l9 -2 z",
  },
  {
    id: "fessiers",
    view: "dos",
    muscles: ["grand-fessier", "moyen-fessier", "petit-fessier"],
    d: "M37 88 q13 -4 26 0 l2 16 q-15 6 -30 0 z",
  },
  {
    id: "ischios",
    view: "dos",
    muscles: ["ischio-jambiers"],
    d: "M37 106 h10 l-1 24 h-10 z M53 106 h10 l1 24 h-10 z",
  },
  {
    id: "mollets",
    view: "dos",
    muscles: ["gastrocnemien", "soleaire"],
    d: "M38 136 h9 l-2 26 h-8 z M53 136 h9 l1 26 h-8 z",
  },
];

/** Silhouette de fond, identique pour les deux vues. */
const SILHOUETTE =
  "M50 8 a10 10 0 0 1 0 20 a10 10 0 0 1 0 -20 z " +
  "M50 30 q14 0 20 8 l10 12 l6 44 l-10 2 l-4 -30 v40 q0 8 -2 16 l-4 46 h-10 l-2 -44 h-8 l-2 44 h-10 l-4 -46 q-2 -8 -2 -16 v-40 l-4 30 l-10 -2 l6 -44 l10 -12 q6 -8 20 -8 z";

export function MuscleMap({
  primary,
  secondary = [],
  className,
  showLabels = true,
}: {
  primary: Muscle[];
  secondary?: Muscle[];
  className?: string;
  showLabels?: boolean;
}) {
  const primarySet = new Set(primary);
  const secondarySet = new Set(secondary);

  const fillFor = (region: Region): { fill: string; opacity: number } => {
    if (region.muscles.some((m) => primarySet.has(m))) return { fill: "#fb7185", opacity: 0.92 };
    if (region.muscles.some((m) => secondarySet.has(m))) return { fill: "#22d3ee", opacity: 0.55 };
    return { fill: "#2a2440", opacity: 0.55 };
  };

  const renderView = (view: View, label: string) => (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 185"
        className="h-44 w-auto sm:h-52"
        role="img"
        aria-label={`Muscles sollicités, vue ${label.toLowerCase()}`}
      >
        <path d={SILHOUETTE} fill="#16132a" stroke="#332c4f" strokeWidth={1} />
        {REGIONS.filter((r) => r.view === view).map((region) => {
          const { fill, opacity } = fillFor(region);
          return <path key={region.id} d={region.d} fill={fill} opacity={opacity} />;
        })}
      </svg>
      {showLabels && <figcaption className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</figcaption>}
    </figure>
  );

  return (
    <div className={className}>
      <div className="flex items-start justify-center gap-4">
        {renderView("face", "Face")}
        {renderView("dos", "Dos")}
      </div>
      {showLabels && (
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-white/50">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-neon-rose" /> Principal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-neon-cyan/60" /> Secondaire
          </span>
        </div>
      )}
    </div>
  );
}
