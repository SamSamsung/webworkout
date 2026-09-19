import type { Metadata } from "next";
import { ToolsPage } from "@/components/tools/ToolsPage";

export const metadata: Metadata = {
  title: "Outils & calculateurs",
  description: "1RM, table de pourcentages, chargement de barre, calories, zones cardiaques, IMC, métabolisme de base et minuteur de repos.",
};

export default function Page() {
  return <ToolsPage />;
}
