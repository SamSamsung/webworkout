/**
 * Authentification Supabase par lien magique.
 *
 * Choix du lien magique plutôt qu'un mot de passe : aucun secret à stocker ni
 * à faire tourner, pas de formulaire d'inscription, et un parcours en deux
 * clics. Sans projet Supabase configuré, toutes ces fonctions renvoient
 * proprement une erreur explicite et l'application reste en mode local.
 */
import { BASE_PATH } from "./base-path";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/** Session simplifiée, telle que l'interface en a besoin. */
export interface AuthSession {
  userId: string;
  email: string | null;
}

/** URL vers laquelle l'e-mail de connexion doit ramener l'utilisateur. */
function redirectUrl(): string {
  return `${window.location.origin}${BASE_PATH}/profil/`;
}

/** Session courante, ou `null` si personne n'est connecté. */
export async function getSession(): Promise<AuthSession | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return { userId: data.session.user.id, email: data.session.user.email ?? null };
}

/** Envoie un lien de connexion par e-mail. */
export async function sendMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: "Aucun projet Supabase n'est configuré sur cette instance." };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectUrl() },
  });
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: `Lien envoyé à ${email.trim()}. Ouvre-le depuis cet appareil pour te connecter.`,
  };
}

/** Ferme la session ; l'application repasse automatiquement en mode local. */
export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

/**
 * S'abonne aux changements de session (connexion, déconnexion, rafraîchissement
 * du jeton). Renvoie une fonction de désabonnement.
 */
export function onAuthChange(callback: (session: AuthSession | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? { userId: session.user.id, email: session.user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}

export { isSupabaseConfigured };
