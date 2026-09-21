"use client";

import { useState } from "react";
import { isSupabaseConfigured, sendMagicLink, signInWithGoogle } from "@/lib/auth";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, SectionTitle } from "@/components/ui";

/**
 * Carte « compte & synchronisation ».
 *
 * Le mode local reste pleinement fonctionnel, mais il doit être dit
 * clairement : sans compte, chaque appareil a sa propre sauvegarde, et c'est
 * exactement ce qui surprend quand on ouvre le site sur un second appareil.
 */
export function AccountCard() {
  const session = useApp((s) => s.session);
  const storage = useApp((s) => s.storage);
  const syncing = useApp((s) => s.syncing);
  const syncMessage = useApp((s) => s.syncMessage);
  const disconnect = useApp((s) => s.disconnect);
  const logs = useApp((s) => s.state.logs.length);

  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

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

          <Button size="lg" onClick={() => void google()} disabled={busy}>
            <span aria-hidden>🔵</span> Continuer avec Google
          </Button>

          {showEmail ? (
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
              <Button variant="soft" onClick={() => void magicLink()} disabled={busy}>
                {busy ? "Envoi…" : "✉️ Recevoir mon lien"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-xs font-semibold text-white/45 underline-offset-2 hover:text-white hover:underline"
            >
              Ou recevoir un lien par e-mail
            </button>
          )}
        </>
      )}

      {feedback && (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${feedback.ok ? "bg-neon-lime/10 text-neon-lime" : "bg-neon-rose/10 text-neon-rose"}`}
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
