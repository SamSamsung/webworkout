import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      icon="🧭"
      title="Page introuvable"
      description="Le lien est peut-être erroné, ou l'exercice recherché n'existe pas sous cet identifiant."
      action={
        <div className="flex gap-2">
          <Button href="/">Accueil</Button>
          <Button variant="ghost" href="/exercices">
            Base d&apos;exercices
          </Button>
        </div>
      }
    />
  );
}
