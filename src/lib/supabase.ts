/**
 * Client Supabase, activé uniquement si les variables d'environnement sont
 * présentes. Sans elles, l'application fonctionne intégralement en local :
 * c'est le mode MVP, sans backend à configurer.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
