import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { REPO_URL, SITE_NAME, SITE_OWNER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Règles d'usage d'IronQuest : service gratuit fourni en l'état, avertissement santé, règles de compte et de classement.",
};

/**
 * Conditions d'utilisation.
 *
 * Deux points comptent vraiment ici : l'avertissement santé, parce qu'une
 * application de musculation peut inciter à faire des mouvements mal exécutés
 * ou trop lourds, et l'absence de garantie de conservation des données,
 * puisque l'hébergement repose sur des offres gratuites.
 */
export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      intro={`En utilisant ${SITE_NAME}, vous acceptez les règles ci-dessous. Elles sont courtes et sans surprise : le service est gratuit, personnel, et fourni tel quel.`}
    >
      <LegalSection title="1. Objet du service">
        <p>
          {SITE_NAME} est une application gratuite de suivi d&apos;entraînement : base d&apos;exercices documentée,
          enregistrement de séances et de records, progression ludifiée. Elle est éditée à titre personnel et non
          commercial par <strong>{SITE_OWNER || "le propriétaire de cette instance"}</strong>, et son code source est
          public :{" "}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {REPO_URL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Avertissement santé — à lire">
        <p>
          <strong>
            Les contenus de ce site sont informatifs et ne constituent ni un avis médical, ni une prescription, ni un
            encadrement sportif.
          </strong>{" "}
          Les descriptions techniques, les conseils de sécurité, les niveaux de difficulté et les programmes générés
          automatiquement ne remplacent pas l&apos;avis d&apos;un médecin ou d&apos;un entraîneur qualifié.
        </p>
        <p>
          Demandez un avis médical avant de commencer ou de reprendre une activité physique, en particulier en cas de
          problème cardiaque ou articulaire, de blessure, de grossesse, de traitement en cours, ou si vous êtes
          sédentaire depuis longtemps. Arrêtez immédiatement tout exercice qui provoque une douleur.
        </p>
        <p>
          Vous pratiquez sous votre seule responsabilité. L&apos;éditeur ne peut être tenu responsable d&apos;une
          blessure, d&apos;un dommage matériel ou d&apos;un préjudice résultant de l&apos;usage de l&apos;application
          ou de l&apos;exécution d&apos;un exercice qu&apos;elle décrit.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte et usage loyal">
        <p>Le compte est facultatif. Si vous en créez un :</p>
        <ul>
          <li>utilisez une adresse e-mail dont vous êtes titulaire ;</li>
          <li>vous êtes responsable de l&apos;accès à votre boîte e-mail, qui vaut accès au compte ;</li>
          <li>
            choisissez un pseudo et un avatar qui ne soient ni injurieux, ni haineux, ni trompeurs sur votre identité —
            ils peuvent apparaître publiquement dans le classement si vous activez cette option ;
          </li>
          <li>
            n&apos;automatisez pas l&apos;envoi de données dans le but de fausser les classements, et ne tentez pas
            d&apos;accéder aux données d&apos;autres utilisateurs.
          </li>
        </ul>
        <p>
          Un compte contrevenant à ces règles peut être supprimé sans préavis, de même que les données de classement
          manifestement falsifiées.
        </p>
      </LegalSection>

      <LegalSection title="4. Disponibilité et conservation des données">
        <p>
          Le service est fourni <strong>en l&apos;état et sans garantie</strong>, sur une infrastructure gratuite. Il
          peut être interrompu, modifié ou arrêté à tout moment, sans préavis ni indemnité, et une perte de données
          n&apos;est pas exclue.
        </p>
        <p>
          <strong>Exportez régulièrement votre sauvegarde</strong> (Profil → Mes données → Exporter) : c&apos;est le
          seul moyen fiable de conserver votre progression sur la durée. Aucune obligation de sauvegarde ou de
          restauration n&apos;incombe à l&apos;éditeur.
        </p>
      </LegalSection>

      <LegalSection title="5. Propriété et code source">
        <p>
          Le code source est publié sur GitHub et régi par la licence qui y figure. Les textes descriptifs des
          exercices sont rédigés pour ce projet ; les emojis et icônes proviennent des jeux de caractères standard des
          systèmes d&apos;exploitation. Les données que vous saisissez restent les vôtres.
        </p>
      </LegalSection>

      <LegalSection title="6. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>, qui fait partie intégrante des présentes
          conditions.
        </p>
      </LegalSection>

      <LegalSection title="7. Modifications et droit applicable">
        <p>
          Ces conditions peuvent être modifiées ; la date de dernière mise à jour figure en haut de la page. Elles sont
          soumises au droit français, et les tribunaux français sont compétents en cas de litige.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
