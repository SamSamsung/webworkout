"use client";

import { useEffect } from "react";
import { useApp } from "@/store/useApp";

/**
 * Charge l'état persisté au démarrage et enregistre le service worker.
 * Placé dans le layout racine pour que toute l'application dispose du store.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useApp((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Le service worker n'est utile qu'en production : en développement, il
    // masquerait les rechargements à chaud.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // L'échec d'enregistrement ne doit jamais bloquer l'application.
    });
  }, []);

  return <>{children}</>;
}
