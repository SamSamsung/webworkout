/**
 * Client Supabase, activé uniquement si les variables d'environnement sont
 * présentes. Sans elles, l'application fonctionne intégralement en local :
 * c'est le mode MVP, sans backend à configurer.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * URL et clé publique du projet, exportées telles quelles.
 *
 * Elles servent au diagnostic de la page profil, qui interroge directement
 * l'API d'authentification pour savoir ce qui est réellement activé côté
 * Supabase (voir `lib/auth.ts`). Les deux sont publiques par construction :
 * elles sont de toute façon embarquées dans le bundle du navigateur.
 */
export const SUPABASE_URL = url ?? "";
export const SUPABASE_ANON_KEY = anonKey ?? "";

/** `true` si un backend Supabase est configuré pour cette instance. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Renvoie le client partagé, ou `null` en mode local.
 * Le client est créé paresseusement pour éviter tout appel réseau au build.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Indispensable pour les liens magiques : le jeton arrive dans le
      // fragment de l'URL au retour de l'e-mail.
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return client;
}
