"use client";

import { useSearchParams } from "next/navigation";
import { Button, EmptyState } from "@/components/ui";
import { WorkoutEditor } from "./WorkoutEditor";

/** Lit l'identifiant de séance dans l'URL et monte l'éditeur correspondant. */
export function WorkoutEditorRoute() {
  const id = useSearchParams().get("id");

  if (!id) {
    return (
      <EmptyState
        icon="🧭"
        title="Aucune séance sélectionnée"
        description="Choisis une séance à modifier depuis la liste de tes modèles."
        action={<Button href="/seances">Mes séances</Button>}
      />
    );
  }

  return <WorkoutEditor templateId={id} />;
}
