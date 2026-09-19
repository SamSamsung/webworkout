import type { Metadata } from "next";
import { ProgressPage } from "@/components/progress/ProgressPage";

export const metadata: Metadata = {
  title: "Progression",
  description: "Courbes de progression, records personnels, calendrier d'assiduité et répartition du travail par groupe musculaire.",
};

export default function Page() {
  return <ProgressPage />;
}
