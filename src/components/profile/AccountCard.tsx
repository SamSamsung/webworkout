"use client";

import { useState } from "react";
import { isSupabaseConfigured, sendMagicLink } from "@/lib/auth";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, SectionTitle } from "@/components/ui";

/**
 * Carte « compte & synchronisation ».
 *
 * Le mode local reste le mode par défaut et pleinement fonctionnel : la
 * connexion n'est proposée que comme une option, pour retrouver sa
 * progression sur un autre appareil et alimenter le classement.
 */
export function AccountCard() {
  const session = useApp((s) => s.session);
  const storage = useApp((s) => s.storage);
  const syncing = useApp((s) => s.syncing);
  const syncMessage = useApp((s) => s.syncMessage);
  const disconnect = useApp((s) => s.disconnect);

  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!email.includes("@")) {
      setFeedback({ ok: false, message: "Saisis une adresse e-mail valide." });
      return;
    }
    setSending(true);
    setFeedback(await sendMagicLink(email));
    setSending(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle
        icon="☁️"
        title="Compte & synchronisation"
        subtitle="Facultatif : l'application fonctionne entièrement sans compte."
        action={
          <Chip color={storage === "supabase" ? "#a3e635" : "#60a5fa"}>
            {syncing ? "⏳ Synchronisation…" : storage === "supabase" ? "☁️ Compte synchronisé" : "📱 Cet appareil"}
          </Chip>
        }
      />

      {!isSupabaseConfigured ? (
        <p className="text-xs leading-relaxed text-white/55">
          Cette instance n&apos;a pas de backend configuré : ta progression vit dans le stockage de ce navigateur et
          n&apos;en sort jamais. Pour activer la synchronisation multi-appareils et le classement partagé, il suffit de
          renseigner un projet Supabase (procédure détaillée dans le README) — le code est déjà en place, aucune
          modification n&apos;est nécessaire.
        </p>
      ) : session ? (
        <>
          <p className="text-sm text-white/70">
            Connecté en tant que <strong className="text-white">{session.email ?? "utilisateur"}</strong>.
          </p>
          <p className="text-xs text-white/45">
            Chaque séance terminée est enregistrée sur ton compte : retrouve ta progression sur n&apos;importe quel
            appareil en te connectant avec la même adresse.
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
            Connecte-toi pour retrouver ta progression sur tous tes appareils. Pas de mot de passe : tu reçois un lien
            par e-mail. Ta progression actuelle sera envoyée sur ton compte lors de la première connexion.
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
            <Button onClick={() => void submit()} disabled={sending}>
              {sending ? "Envoi…" : "✉️ Recevoir mon lien"}
            </Button>
          </div>
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
