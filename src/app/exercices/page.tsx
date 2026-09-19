import type { Metadata } from "next";
import { ExerciseBrowser } from "@/components/exercises/ExerciseBrowser";
import { EXERCISES, FAMILIES } from "@/data/exercises";
import { SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Base d'exercices",
  description: `${EXERCISES.length} exercices détaillés : technique, muscles sollicités, erreurs fréquentes, progressions et variantes.`,
};

export default function ExercicesPage() {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon="📚"
        title="Base d'exercices"
        subtitle={`${EXERCISES.length} fiches détaillées réparties en ${FAMILIES.length} familles de mouvement. Filtre par muscle, matériel ou niveau.`}
      />
      <ExerciseBrowser />
    </div>
  );
}
