/**
 * Signaux sonores de l'entraînement.
 *
 * Les sons sont synthétisés à la volée en Web Audio : aucun fichier à
 * télécharger, aucune latence au premier déclenchement, et un poids nul pour
 * le mode hors ligne.
 *
 * Toutes les fonctions échouent en silence : sur mobile, l'audio reste bloqué
 * tant que l'utilisateur n'a pas interagi avec la page, et une séance ne doit
 * jamais s'interrompre pour un bip manqué.
 */

type ToneOptions = {
  /** Fréquence en hertz. */
  frequency: number;
  /** Durée en secondes. */
  duration: number;
  /** Volume de 0 à 1. */
  volume?: number;
  /** Décalage avant le déclenchement, en secondes. */
  delay?: number;
};

/** Joue une ou plusieurs notes courtes. */
function play(tones: ToneOptions[]): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    let end = 0;

    for (const { frequency, duration, volume = 0.2, delay = 0 } of tones) {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      // Enveloppe exponentielle : un créneau brut produit un « clic » désagréable.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.02);
      end = Math.max(end, delay + duration);
    }

    setTimeout(() => void ctx.close(), (end + 0.3) * 1000);
  } catch {
    // Audio indisponible ou bloqué : sans conséquence pour l'entraînement.
  }
}

/** Fin d'un temps de repos : une note claire. */
export function beepRest(): void {
  play([{ frequency: 880, duration: 0.4 }]);
}

/** Décompte des dernières secondes : note courte et discrète. */
export function beepTick(): void {
  play([{ frequency: 660, duration: 0.12, volume: 0.15 }]);
}

/** Départ d'un nouveau tour : double note montante, impossible à confondre. */
export function beepRoundStart(): void {
  play([
    { frequency: 740, duration: 0.14 },
    { frequency: 1110, duration: 0.22, delay: 0.16 },
  ]);
}

/** Fin de la séance ou du protocole : petit arpège. */
export function beepFinish(): void {
  play([
    { frequency: 660, duration: 0.15 },
    { frequency: 880, duration: 0.15, delay: 0.16 },
    { frequency: 1320, duration: 0.35, delay: 0.32 },
  ]);
}
