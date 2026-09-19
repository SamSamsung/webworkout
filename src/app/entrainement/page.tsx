import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionPlayer } from "@/components/workouts/SessionPlayer";

export const metadata: Metadata = {
  title: "Séance en cours",
  description: "Chronomètre, validation des séries, minuteur de repos et calcul d'XP en direct.",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-white/40">Chargement de la séance…</p>}>
      <SessionPlayer />
    </Suspense>
  );
}
