import type { Metadata } from "next";
import { Suspense } from "react";
import { ManualWorkoutRoute } from "@/components/workouts/ManualWorkoutRoute";

export const metadata: Metadata = {
  title: "Enregistrer une séance passée",
  description:
    "Saisis une séance que tu as déjà faite : date, exercices, séries, charges. Elle rejoint ton historique, tes records et ta progression.",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-white/40">Chargement…</p>}>
      <ManualWorkoutRoute />
    </Suspense>
  );
}
