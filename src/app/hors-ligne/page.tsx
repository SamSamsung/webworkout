import type { Metadata } from "next";
import { Button, EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Hors ligne",
  description: "Cette page n'est pas disponible sans connexion.",
};

/** Page servie par le service worker quand une navigation échoue hors ligne. */
export default function OfflinePage() {
  return (
    <EmptyState
      icon="📡"
      title="Pas de connexion"
      description="Cette page n'a pas encore été mise en cache. Les pages déjà visitées, tes séances et tes records restent accessibles hors ligne."
      action={<Button href="/">Retour à l&apos;accueil</Button>}
    />
  );
}
