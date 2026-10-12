import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, ISSUES_URL, LEGAL_UPDATED } from "@/lib/site";

/**
 * Gabarit des pages légales.
 *
 * Volontairement sans état ni interactivité : ces pages sont rendues en
 * statique, lisibles sans compte et sans JavaScript, parce qu'elles doivent
 * rester consultables par un tiers — un utilisateur, ou l'examen d'un
 * fournisseur d'identité comme Google.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-xs font-semibold text-white/45 hover:text-white">
          ← Retour à l&apos;application
        </Link>
        <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-white/60">{intro}</p>
        <p className="text-xs text-white/35">Dernière mise à jour : {LEGAL_UPDATED}</p>
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </article>
  );
}

/** Section de page légale. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-white/70 [&_a]:text-neon-cyan [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-white [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
    </section>
  );
}

/**
 * Bloc de contact partagé par les deux pages légales.
 * L'adresse e-mail n'est affichée que si l'instance en déclare une ; sinon on
 * renvoie vers le dépôt, pour ne jamais publier d'adresse par défaut.
 */
export function LegalContact() {
  return CONTACT_EMAIL ? (
    <p>
      Par e-mail : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
    </p>
  ) : (
    <p>
      En ouvrant un ticket sur le dépôt public du projet :{" "}
      <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
        {ISSUES_URL}
      </a>
      .
    </p>
  );
}
