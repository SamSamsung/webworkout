"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Calque plein écran d'une modale.
 *
 * Le portail vers `document.body` n'est pas un détail : l'utilitaire `card`
 * applique un `backdrop-filter`, et un élément filtré devient le bloc
 * conteneur de ses descendants en `position: fixed`. Une modale ouverte
 * depuis une carte se retrouvait donc enfermée dans celle-ci, réduite à
 * quelques centaines de pixels dans un coin de l'écran. Portaliser ici une
 * fois pour toutes évite que le bug ne revienne au prochain appel.
 */
export function Overlay({ label, children }: { label: string; children: ReactNode }) {
  // Rendu serveur : pas de `document`. Une modale ne s'ouvre jamais avant
  // l'hydratation, ce garde-fou est de la pure prudence.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>,
    document.body,
  );
}
