/**
 * Identité du site, pour les pages légales et les métadonnées.
 *
 * Le nom de l'éditeur et l'adresse de contact sont lus dans l'environnement :
 * ils dépendent de la personne qui déploie l'instance, pas du code. Sans eux,
 * les pages légales renvoient vers le dépôt GitHub, qui reste un moyen de
 * contact public et vérifiable.
 */
export const SITE_NAME = "IronQuest";

/** Dépôt public du projet : code source, suivi des bugs, contact de repli. */
export const REPO_URL = "https://github.com/SamSamsung/webworkout";
export const ISSUES_URL = `${REPO_URL}/issues`;

/** Éditeur du site (responsable de traitement au sens du RGPD). */
export const SITE_OWNER = process.env.NEXT_PUBLIC_SITE_OWNER ?? "";

/** Adresse de contact affichée sur les pages légales. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

/**
 * Date de dernière révision des pages légales.
 * À mettre à jour à la main quand leur contenu change : une date automatique
 * laisserait croire à une révision qui n'a pas eu lieu.
 */
export const LEGAL_UPDATED = "12 octobre 2026";
