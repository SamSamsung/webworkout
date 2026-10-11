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
import { SUPABASE_ANON_KEY, SUPABASE_URL, getSupabase, isSupabaseConfigured } from "./supabase";

/** Session simplifiée, telle que l'interface en a besoin. */
export interface AuthSession {
  userId: string;
  email: string | null;
}

/** URL vers laquelle l'e-mail de connexion doit ramener l'utilisateur. */
function redirectUrl(): string {
  return `${window.location.origin}${BASE_PATH}/profil/`;
}

/**
 * Traduit une erreur Supabase en consigne actionnable.
 *
 * Les messages bruts de l'API sont en anglais, laconiques, et renvoient tous
 * un HTTP 400 : « erreur 400 » dans la console ne dit pas quoi corriger. Cette
 * table fait le pont entre le message technique et le réglage exact à changer
 * dans le tableau de bord Supabase.
 */
export function describeAuthError(raw: string): string {
  const m = raw.toLowerCase();

  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
    return (
      "La connexion Google n'est pas encore activée côté Supabase. " +
      "Deux options : utiliser le lien par e-mail juste en dessous (ça marche tout de suite), " +
      "ou activer le fournisseur dans Supabase → Authentication → Sign In / Providers → Google " +
      "(il faut un identifiant client Google, voir le README, section « Activer la connexion Google »)."
    );
  }
  if (m.includes("invalid api key") || m.includes("no api key")) {
    return (
      "La clé publique du projet est refusée. Recopie la clé « anon » / « publishable » depuis " +
      "Supabase → Project Settings → API Keys dans la variable NEXT_PUBLIC_SUPABASE_ANON_KEY, " +
      "sans espace ni retour à la ligne, puis redéploie le site."
    );
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled") || m.includes("signups are disabled")) {
    return (
      "Les inscriptions sont désactivées sur le projet Supabase. " +
      "Active-les dans Authentication → Sign In / Providers → Email (« Allow new users to sign up »)."
    );
  }
  if (m.includes("email logins are disabled") || m.includes("email provider")) {
    return (
      "Le fournisseur « Email » est désactivé côté Supabase. " +
      "Réactive-le dans Authentication → Sign In / Providers → Email."
    );
  }
  if (m.includes("redirect") && (m.includes("not allowed") || m.includes("invalid"))) {
    return (
      `L'adresse de retour n'est pas autorisée. Ajoute ${typeof window === "undefined" ? "l'URL du site" : `${window.location.origin}/**`} ` +
      "dans Supabase → Authentication → URL Configuration → Redirect URLs, puis réessaie."
    );
  }
  if (m.includes("only request this after") || m.includes("rate limit") || m.includes("too many")) {
    return "Trop de tentatives d'affilée. Attends une minute avant de redemander un lien.";
  }
  if (m.includes("error sending") && m.includes("email")) {
    return (
      "Supabase n'a pas réussi à envoyer l'e-mail. Le serveur d'envoi intégré est limité à quelques " +
      "messages par heure : réessaie plus tard, ou configure un SMTP dans Authentication → Emails."
    );
  }
  if (m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Le projet Supabase est injoignable depuis ce navigateur. Vérifie l'URL du projet (NEXT_PUBLIC_SUPABASE_URL) et ta connexion.";
  }
  return raw;
}

/**
 * Ce que le projet Supabase accepte réellement, lu sur l'API plutôt que
 * supposé.
 *
 * `/auth/v1/settings` est un point d'entrée public : il liste les
 * fournisseurs actifs. On s'en sert pour ne proposer le bouton Google que
 * s'il peut marcher, et pour dire précisément ce qui manque sinon — plutôt
 * que de laisser l'utilisateur découvrir un 400 après le clic.
 */
export interface AuthCapabilities {
  /** `false` si l'API n'a pas répondu (URL erronée, clé refusée, hors ligne). */
  reachable: boolean;
  google: boolean;
  email: boolean;
  /** `true` si le projet refuse la création de nouveaux comptes. */
  signupsDisabled: boolean;
  /** Message explicatif quand `reachable` est faux. */
  problem?: string;
}

export async function fetchAuthCapabilities(): Promise<AuthCapabilities> {
  if (!isSupabaseConfigured) {
    return {
      reachable: false,
      google: false,
      email: false,
      signupsDisabled: false,
      problem: "Aucun projet Supabase configuré.",
    };
  }
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!response.ok) {
      return {
        reachable: false,
        google: false,
        email: false,
        signupsDisabled: false,
        problem:
          response.status === 401
            ? describeAuthError("invalid api key")
            : `L'API d'authentification a répondu ${response.status}. Vérifie l'URL du projet et la clé publique, puis redéploie.`,
      };
    }
    const settings = (await response.json()) as {
      external?: Record<string, boolean>;
      disable_signup?: boolean;
    };
    return {
      reachable: true,
      google: Boolean(settings.external?.google),
      // Le fournisseur e-mail est actif par défaut sur un projet neuf.
      email: settings.external?.email !== false,
      signupsDisabled: settings.disable_signup === true,
    };
  } catch {
    return {
      reachable: false,
      google: false,
      email: false,
      signupsDisabled: false,
      problem: describeAuthError("failed to fetch"),
    };
  }
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
  if (error) return { ok: false, message: describeAuthError(error.message) };
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
  if (error) return { ok: false, message: describeAuthError(error.message) };
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
