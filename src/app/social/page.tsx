import type { Metadata } from "next";
import { SocialPage } from "@/components/social/SocialPage";

export const metadata: Metadata = {
  title: "Social — amis, classements et défis",
  description: "Ajoute des amis, compare ton XP et lance des défis sur n'importe quel exercice de la base.",
};

export default function Page() {
  return <SocialPage />;
}
