import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/ProfilePage";

export const metadata: Metadata = {
  title: "Profil & badges",
  description: "Réglages du profil, collection de badges, niveau et gestion de tes données.",
};

export default function Page() {
  return <ProfilePage />;
}
