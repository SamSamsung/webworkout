"use client";

import { useEffect, useState } from "react";
import {
  fetchAuthCapabilities,
  isSupabaseConfigured,
  sendMagicLink,
  signInWithGoogle,
  type AuthCapabilities,
} from "@/lib/auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, SectionTitle } from "@/components/ui";

/**
 * Carte « compte & synchronisation ».
 *
 * Le mode local reste pleinement fonctionnel, mais il doit être dit
 * clairement : sans compte, chaque appareil a sa propre sauvegarde, et c'est
 * exactement ce qui surprend quand on ouvre le site sur un second appareil.
 *
 * Quand un projet Supabase est branché, la carte commence par demander à
 * l'API quels modes de connexion sont réellement actifs. Sans cette
 * vérification, cliquer sur « Continuer avec Google » alors que le
 * fournisseur n'est pas activé côté Supabase ne produit qu'un HTTP 400
 * illisible : ici le bouton n'apparaît que s'il peut marcher, et la carte dit
 * quoi régler sinon.
 */
export function AccountCard() {
  const session = useApp((s) => s.session);
  const storage = useApp((s) => s.storage);
  const syncing = useApp((s) => s.syncing);
  const syncMessage = useApp((s) => s.syncMessage);
  const disconnect = useApp((s) => s.disconnect);
  const logs = useApp((s) => s.state.logs.length);

  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  /** `null` tant que la vérification est en cours. */
  const [caps, setCaps] = useState<AuthCapabilities | null>(null);

  // Une seule sonde, au montage, et uniquement s'il y a un compte à proposer.
  useEffect(() => {
    if (!isSupabaseConfigured || session) return;
    let alive = true;
    void fetchAuthCapabilities().then((result) => {
      if (alive) setCaps(result);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  // `window` n'existe pas au prérendu ; les lignes qui s'en servent ne sont
  // affichées qu'une fois la sonde revenue, donc côté client uniquement.
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function google() {
    setBusy(true);
    const result = await signInWithGoogle();
    // En cas de succès, la page est redirigée : l'état local n'a plus d'importance.
    if (!result.ok) setFeedback(result);
    setBusy(false);
  }

  async function magicLink() {
    if (!email.includes("@")) {
      setFeedback({ ok: false, message: "Saisis une adresse e-mail valide." });
      return;
    }
    setBusy(true);
    setFeedback(await sendMagicLink(email));
    setBusy(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon="☁️"
        title="Compte & synchronisation"
        action={
          <Chip color={storage === "supabase" ? "#a3e635" : "#60a5fa"}>
            {syncing ? "⏳ Synchronisation…" : storage === "supabase" ? "☁️ Compte synchronisé" : "📱 Cet appareil"}
          </Chip>
        }
      />

      {!isSupabaseConfigured ? (
        <>
          <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/[0.06] p-3">
            <p className="font-display text-sm font-bold text-neon-amber">
              Il n&apos;y a pas encore de compte sur ce site
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              Ta progression est enregistrée dans le navigateur de{" "}
              <strong className="text-white">cet appareil uniquement</strong>. C&apos;est pour cela que ton téléphone
              et ton ordinateur n&apos;affichent pas la même chose : ce ne sont pas deux comptes différents, ce sont
              deux sauvegardes séparées, et aucune n&apos;est perdue.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-white/55">
            En attendant, tu peux transporter ta progression d&apos;un appareil à l&apos;autre avec l&apos;export et
            l&apos;import JSON, juste en dessous. Pour une vraie synchronisation automatique (et la connexion Google),
            il faut brancher un projet Supabase : la procédure complète tient en cinq minutes et elle est décrite dans
            le README du dépôt, section « Mode local ou mode Supabase ».
          </p>
        </>
      ) : session ? (
        <>
          <p className="text-sm text-white/70">
            Connecté en tant que <strong className="text-white">{session.email ?? "utilisateur"}</strong>.
          </p>
          <p className="text-xs leading-relaxed text-white/45">
            Chaque séance est enregistrée sur ton compte. Connecte-toi avec la même adresse depuis un autre appareil :
            les deux historiques fusionnent, rien n&apos;est écrasé.
          </p>
          <div>
            <Button size="sm" variant="ghost" onClick={() => void disconnect()}>
              Se déconnecter
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-white/55">
            Connecte-toi pour retrouver la même progression sur tous tes appareils.{" "}
            {logs > 0 && (
              <>
                Tes {logs} séance{logs > 1 ? "s" : ""} déjà enregistrée{logs > 1 ? "s" : ""} ici{" "}
                {logs > 1 ? "seront jointes" : "sera jointe"} à ton compte, sans rien écraser de ce qui s&apos;y
                trouve déjà.
              </>
            )}
          </p>

          {/* Projet injoignable : clé refusée, URL erronée, ou hors ligne. */}
          {caps && !caps.reachable && (
            <div className="rounded-xl border border-neon-rose/30 bg-neon-rose/[0.07] p-3">
              <p className="font-display text-sm font-bold text-neon-rose">Connexion impossible pour l&apos;instant</p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{caps.problem}</p>
            </div>
          )}

          {caps?.signupsDisabled && (
            <p className="rounded-lg bg-neon-amber/10 px-3 py-2 text-xs leading-relaxed text-neon-amber">
              Les inscriptions sont désactivées côté Supabase : seuls les comptes déjà créés peuvent se connecter.
              Active « Allow new users to sign up » dans Authentication → Sign In / Providers → Email.
            </p>
          )}

          {caps?.google && (
            <Button size="lg" onClick={() => void google()} disabled={busy}>
              <span aria-hidden>🔵</span> Continuer avec Google
            </Button>
          )}

          {(caps === null || caps.email) && (
            <>
              <p className="text-xs font-semibold text-white/45">
                {caps?.google ? "Ou reçois un lien par e-mail" : "Reçois un lien de connexion par e-mail"}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.fr"
                  aria-label="Adresse e-mail"
                  autoComplete="email"
                  className="flex-1 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
                />
                <Button variant="soft" onClick={() => void magicLink()} disabled={busy || caps === null}>
                  {busy ? "Envoi…" : "✉️ Recevoir mon lien"}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-white/40">
                Aucun mot de passe : tu reçois un lien à ouvrir depuis cet appareil. Le même e-mail sur ton téléphone
                et ton ordinateur, c&apos;est le même compte.
              </p>
            </>
          )}

          {/* Google indisponible : on le dit une fois, avec la marche à suivre. */}
          {caps?.reachable && !caps.google && (
            <p className="text-xs leading-relaxed text-white/40">
              La connexion Google n&apos;est pas activée sur ce projet Supabase — c&apos;est facultatif, le lien par
              e-mail suffit. Pour l&apos;ajouter : Supabase → Authentication → Sign In / Providers → Google, avec un
              identifiant client Google (README, section « Activer la connexion Google »).
            </p>
          )}

          {caps === null && (
            <p className="text-xs text-white/35" role="status">
              Vérification des modes de connexion disponibles…
            </p>
          )}

          {/*
            Diagnostic replié : ce que le navigateur voit réellement. Sans lui,
            un échec de connexion se débogue à l'aveugle, puisque les
            variables d'environnement sont figées au moment du build et qu'un
            oubli de redéploiement est invisible depuis l'interface.
          */}
          <details className="rounded-lg bg-ink-800/60 px-3 py-2 text-xs text-white/50">
            <summary className="cursor-pointer font-semibold text-white/60">Diagnostic de la connexion</summary>
            <ul className="mt-2 flex flex-col gap-1 font-mono text-[11px] leading-relaxed">
              <li>Projet : {SUPABASE_URL || "—"}</li>
              <li>
                Clé publique : {SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.slice(0, 8)}… (${SUPABASE_ANON_KEY.length} caractères)` : "—"}
              </li>
              {caps === null ? (
                <li>API d&apos;authentification : test en cours…</li>
              ) : (
                <>
                  <li>API d&apos;authentification : {caps.reachable ? "joignable ✓" : "injoignable ✗"}</li>
                  <li>Fournisseur Google : {caps.google ? "activé ✓" : "désactivé ✗"}</li>
                  <li>Lien par e-mail : {caps.email ? "activé ✓" : "désactivé ✗"}</li>
                  <li>{`Adresse à autoriser dans Supabase : ${origin}/**`}</li>
                </>
              )}
            </ul>
          </details>
        </>
      )}

      {feedback && (
        <p
          className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${feedback.ok ? "bg-neon-lime/10 text-neon-lime" : "bg-neon-rose/10 text-neon-rose"}`}
          role="status"
        >
          {feedback.message}
        </p>
      )}
      {syncMessage && (
        <p className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white/70" role="status">
          {syncMessage}
        </p>
      )}
    </Card>
  );
}
