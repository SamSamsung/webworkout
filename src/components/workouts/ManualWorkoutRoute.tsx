"use client";

import { useSearchParams } from "next/navigation";
import { ManualWorkoutForm } from "./ManualWorkoutForm";

/**
 * Deux points d'entrée possibles : repartir d'un modèle de séance
 * (`?template=`) ou dupliquer une séance déjà enregistrée (`?from=`).
 */
export function ManualWorkoutRoute() {
  const params = useSearchParams();
  return <ManualWorkoutForm templateId={params.get("template")} fromLogId={params.get("from")} />;
}
