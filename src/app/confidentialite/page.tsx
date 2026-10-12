import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { REPO_URL, SITE_NAME, SITE_OWNER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données IronQuest enregistre, où elles sont stockées, qui peut les voir, et comment les exporter ou les effacer.",
};

/**
 * Politique de confidentialité.
 *
 * Écrite pour décrire le comportement réel du code, pas un idéal : chaque
 * affirmation ici correspond à un emplacement précis du dépôt (adaptateurs de
 * stockage, schéma SQL, service worker). Toute évolution de ces fichiers doit
 * s'accompagner d'une relecture de cette page.
 */
export default function ConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro={`${SITE_NAME} est une application de suivi d'entraînement. Elle est conçue pour fonctionner sans compte et sans serveur : par défaut, aucune donnée ne quitte votre appareil. Cette page décrit précisément ce qui change lorsque vous choisissez de créer un compte.`}
    >
      <LegalSection title="1. Qui est responsable de ces données">
        <p>
          Ce site est édité et exploité à titre personnel et non commercial par{" "}
          <strong>{SITE_OWNER || "le propriétaire de cette instance"}</strong>, responsable du traitement au sens du
          règlement (UE) 2016/679 (RGPD). Le code source est public et vérifiable :{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {REPO_URL}
          </a>
          .
        </p>
        <p>
          L&apos;application n&apos;est ni vendue, ni financée par la publicité, et ne comporte aucun dispositif de
          mesure d&apos;audience.
        </p>
      </LegalSection>

      <LegalSection title="2. Le principe : local par défaut">
        <p>
          Tant que vous ne vous connectez pas, <strong>absolument toutes</strong> vos données restent dans le stockage
          local de votre navigateur (<code>localStorage</code>, sous la clé <code>ironquest:state</code>). Elles ne sont
          transmises à aucun serveur, pas même à celui qui héberge le site. C&apos;est ce qui permet à
          l&apos;application de fonctionner hors ligne.
        </p>
        <p>
          Conséquence directe : deux navigateurs ou deux appareils ont deux sauvegardes séparées, et vider les données
          du navigateur efface la progression. L&apos;export JSON (Profil → Mes données) existe pour cela.
        </p>
      </LegalSection>

      <LegalSection title="3. Ce qui est enregistré sur votre appareil">
        <ul>
          <li>
            Votre progression : séances réalisées, records, favoris, modèles de séance, badges, XP, série de jours,
            quêtes, pseudo et avatar (un emoji), objectif et matériel déclarés.
          </li>
          <li>
            Si vous vous connectez : le jeton de session fourni par Supabase, nécessaire pour vous maintenir connecté.
          </li>
          <li>
            Un cache de pages et d&apos;icônes, créé par le service worker, pour l&apos;usage hors ligne. Il ne contient
            aucune donnée personnelle.
          </li>
        </ul>
        <p>
          Aucun cookie publicitaire ni traceur tiers n&apos;est déposé. Le stockage utilisé est strictement nécessaire
          au fonctionnement du service.
        </p>
      </LegalSection>

      <LegalSection title="4. Ce qui est enregistré sur le serveur si vous créez un compte">
        <p>
          Créer un compte est facultatif. Son seul objet est de retrouver la même progression sur plusieurs appareils.
          Dans ce cas, et seulement dans ce cas, les données suivantes sont enregistrées dans une base Postgres
          hébergée par Supabase :
        </p>
        <ul>
          <li>
            <strong>votre adresse e-mail</strong>, ainsi que les informations renvoyées par le fournisseur
            d&apos;identité si vous passez par Google (identifiant du compte, nom affiché, photo de profil) ;
          </li>
          <li>
            <strong>votre progression</strong>, c&apos;est-à-dire l&apos;état de l&apos;application décrit au point 3 ;
          </li>
          <li>
            <strong>votre pseudo, votre avatar, votre XP et votre niveau</strong>, dupliqués en colonnes séparées pour
            le classement, ainsi que l&apos;indicateur « profil public » ;
          </li>
          <li>les dates de création et de dernière modification de votre profil.</li>
        </ul>
        <p>
          Aucun mot de passe n&apos;est créé ni stocké : la connexion se fait par lien à usage unique envoyé par
          e-mail, ou via Google.
        </p>
        <p>
          L&apos;accès à ces données est restreint au niveau de la base par des politiques de sécurité par ligne (RLS) :
          chaque compte ne peut lire et écrire que sa propre ligne. Le schéma complet est public dans le dépôt
          (<code>supabase/schema.sql</code>).
        </p>
      </LegalSection>

      <LegalSection title="5. Ce que les autres utilisateurs peuvent voir">
        <p>
          Rien, par défaut. Le classement n&apos;expose votre profil que si vous activez vous-même l&apos;option
          « profil public » dans votre profil. Dans ce cas, les autres utilisateurs connectés voient uniquement votre
          pseudo, votre avatar, votre XP, votre niveau et la date de votre dernière mise à jour.
        </p>
        <p>
          Votre historique de séances, vos records et votre adresse e-mail ne sont <strong>jamais</strong> exposés :
          techniquement, le classement passe par une vue SQL qui ne contient pas ces colonnes.
        </p>
      </LegalSection>

      <LegalSection title="6. Connexion avec Google">
        <p>
          Si vous choisissez « Continuer avec Google », l&apos;authentification est déléguée à Google. Les seules
          autorisations demandées sont celles de votre identité de base : adresse e-mail, nom et photo de profil
          (périmètres <code>email</code> et <code>profile</code>).
        </p>
        <p>
          L&apos;application ne demande, ne lit et ne modifie aucune autre donnée de votre compte Google : ni Gmail, ni
          Drive, ni contacts, ni agenda. Elle n&apos;écrit rien dans votre compte Google. Vous pouvez révoquer cet accès
          à tout moment depuis{" "}
          <a href="https://myaccount.google.com/connections" target="_blank" rel="noopener noreferrer">
            la page des connexions de votre compte Google
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Sous-traitants et hébergement">
        <ul>
          <li>
            <strong>Vercel Inc.</strong> — hébergement du site. Comme tout serveur web, il conserve des journaux
            techniques de courte durée (adresse IP, date, page demandée, navigateur) à des fins de sécurité et de
            diagnostic.
          </li>
          <li>
            <strong>Supabase Inc.</strong> — base de données et authentification, uniquement si vous créez un compte.
          </li>
          <li>
            <strong>Google LLC</strong> — uniquement si vous utilisez le bouton de connexion Google.
          </li>
        </ul>
        <p>
          Ces prestataires peuvent traiter des données en dehors de l&apos;Union européenne ; leurs transferts sont
          encadrés par les clauses contractuelles types de la Commission européenne. Aucune donnée n&apos;est vendue,
          louée, ni transmise à des fins publicitaires ou de profilage.
        </p>
      </LegalSection>

      <LegalSection title="8. Base légale et durée de conservation">
        <p>
          Le traitement repose sur l&apos;exécution du service que vous demandez (article 6.1.b du RGPD) pour les
          données de compte et de progression, et sur votre consentement (article 6.1.a) pour la publication de votre
          profil dans le classement, que vous pouvez retirer à tout moment en désactivant l&apos;option.
        </p>
        <p>
          Les données locales restent sur votre appareil jusqu&apos;à ce que vous les effaciez. Les données de compte
          sont conservées tant que le compte existe, puis supprimées lors de sa suppression.
        </p>
      </LegalSection>

      <LegalSection title="9. Vos droits">
        <ul>
          <li>
            <strong>Accès et portabilité</strong> : Profil → Mes données → « Exporter » produit un fichier JSON
            contenant l&apos;intégralité de vos données, immédiatement et sans demande préalable.
          </li>
          <li>
            <strong>Rectification</strong> : toutes les données sont modifiables depuis l&apos;application (pseudo,
            avatar, séances, records).
          </li>
          <li>
            <strong>Effacement</strong> : le bouton « Réinitialiser » de la même carte remet votre progression à zéro,
            sur l&apos;appareil comme sur le compte. La suppression complète du compte, adresse e-mail comprise, est
            faite sur simple demande (voir ci-dessous).
          </li>
          <li>
            <strong>Opposition et limitation</strong> : vous pouvez cesser d&apos;utiliser le compte et revenir au mode
            local à tout moment en vous déconnectant ; l&apos;application reste pleinement fonctionnelle.
          </li>
        </ul>
        <p>
          Vous disposez également du droit d&apos;introduire une réclamation auprès de la{" "}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
            CNIL
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Sécurité">
        <p>
          Les échanges se font exclusivement en HTTPS. Aucun mot de passe n&apos;est stocké. L&apos;accès aux données
          est contrôlé ligne par ligne par la base elle-même, et non par le code du navigateur. La clé publique
          utilisée par l&apos;application est, par construction, sans pouvoir au-delà de ces politiques.
        </p>
        <p>
          Cela reste un projet personnel : malgré ces précautions, n&apos;y déposez aucune information sensible dont la
          divulgation vous porterait préjudice.
        </p>
      </LegalSection>

      <LegalSection title="11. Mineurs">
        <p>
          Le service n&apos;est pas destiné aux enfants de moins de 15 ans. Aucune donnée n&apos;est collectée
          sciemment auprès d&apos;eux.
        </p>
      </LegalSection>

      <LegalSection title="12. Modifications">
        <p>
          Cette politique peut évoluer avec l&apos;application. La date de dernière mise à jour figure en haut de la
          page, et l&apos;historique des modifications est public dans le dépôt Git.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <LegalContact />
        <p>
          Voir aussi les <Link href="/conditions">conditions d&apos;utilisation</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
