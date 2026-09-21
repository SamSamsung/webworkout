/**
 * Authentification Supabase.
 *
 * Deux parcours, aucun mot de passe à retenir ni à stocker :
 * - Google, en un clic, pour qui a déjà un compte Google sur ses appareils ;
 * - lien magique par e-mail, en repli universel.
 *
 * Sans projet Supabase configuré, toutes ces fonctions renvoient proprement
 * une erreur explicite et l'application reste en mode local.
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

/**
 * Lance la connexion Google.
 *
 * La page est redirigée vers Google puis revient avec un code d'autorisation
 * que le client Supabase échange contre une session (flux PKCE). Il n'y a donc
 * rien à faire au retour : `onAuthChange` se déclenche tout seul.
 */
export async function signInWithGoogle(): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: "Aucun projet Supabase n'est configuré sur cette instance." };
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUrl() },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Redirection vers Google…" };
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
