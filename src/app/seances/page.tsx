import type { Metadata } from "next";
import { WorkoutsPage } from "@/components/workouts/WorkoutsPage";

export const metadata: Metadata = {
  title: "Mes séances",
  description: "Crée tes séances personnalisées ou laisse le générateur composer un entraînement adapté à ton objectif, ton matériel et ton temps.",
};

export default function Page() {
  return <WorkoutsPage />;
}
