import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkoutEditorRoute } from "@/components/workouts/WorkoutEditorRoute";

export const metadata: Metadata = {
  title: "Éditer une séance",
  description: "Compose ta séance : exercices, séries, répétitions, charges et temps de repos.",
};

/**
 * L'identifiant de la séance passe par la chaîne de requête plutôt que par un
 * segment dynamique : les séances vivent dans le navigateur de chaque
 * utilisateur, donc aucune page ne peut être pré-rendue pour elles. Cela rend
 * au passage l'application entièrement exportable en statique.
 */
export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-white/40">Chargement de la séance…</p>}>
      <WorkoutEditorRoute />
    </Suspense>
  );
}
