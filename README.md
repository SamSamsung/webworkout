# ⚡ IronQuest

**La musculation qui se joue.** Une base d'exercices exhaustive doublée d'un système de progression façon RPG : XP, niveaux, badges, séries d'assiduité, quêtes hebdomadaires et défis entre amis.

> **472 exercices** détaillés · **28 familles** de mouvement · **17 groupes musculaires** · **40 badges** · fonctionne **hors ligne**, **sans compte** et **sans backend**.

---

## Sommaire

- [Ce que fait l'application](#ce-que-fait-lapplication)
- [La base d'exercices](#la-base-dexercices)
- [Stack technique et justification](#stack-technique-et-justification)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Scripts disponibles](#scripts-disponibles)
- [Architecture du projet](#architecture-du-projet)
- [Ajouter un exercice](#ajouter-un-exercice)
- [Comment l'XP est calculée](#comment-lxp-est-calculée)
- [Mode local ou mode Supabase](#mode-local-ou-mode-supabase)
- [Déploiement sur Vercel](#déploiement-sur-vercel)
- [PWA et mode hors ligne](#pwa-et-mode-hors-ligne)
- [Feuille de route](#feuille-de-route)
- [Avertissement](#avertissement)

---

## Ce que fait l'application

| Page | Contenu |
| --- | --- |
| **Accueil** | Niveau et rang, série d'assiduité, défi du jour, quêtes de la semaine, bilan hebdomadaire, dernière séance rejouable |
| **Exercices** | Recherche instantanée et filtres cumulables (groupe musculaire, matériel, niveau, catégorie, lieu, favoris), 5 modes de tri |
| **Fiche d'exercice** | Description, exécution pas à pas, erreurs fréquentes, consignes de sécurité, respiration, tempo, repos conseillé, carte musculaire, échelle de progression, variantes de la famille, record personnel |
| **Séances** | Modèles personnalisés, générateur automatique, historique complet |
| **Entraînement** | Chronomètre, validation des séries, minuteur de repos sonore, XP et volume en direct, écran de fin avec records et badges |
| **Progression** | Courbes d'XP cumulée, volume hebdomadaire, répartition par groupe musculaire, calendrier d'assiduité, records avec courbe de progression |
| **Social** | Classement XP, gestion des amis, défis sur n'importe quel exercice |
| **Outils** | 1RM (4 formules), table de pourcentages, chargement de barre, calories par MET, zones cardiaques, IMC, besoins caloriques, minuteur de repos |
| **Profil** | Réglages, collection de badges, échelle des rangs, export / import / effacement des données |

---

## La base d'exercices

C'est le cœur du projet, et la partie la plus travaillée.

**472 fiches** réparties ainsi :

| Groupe | Nb | Groupe | Nb | Groupe | Nb |
| --- | ---: | --- | ---: | --- | ---: |
| Pectoraux | 64 | Épaules | 46 | Avant-bras | 15 |
| Corps entier | 64 | Quadriceps | 44 | Ischio-jambiers | 14 |
| Dos | 58 | Fessiers | 23 | Mollets | 8 |
| Abdominaux | 54 | Triceps | 21 | Lombaires | 7 |
| Cardio | 17 | Biceps | 19 | Adducteurs / abducteurs / cou | 18 |

**Par difficulté** : 127 niveau 1 · 120 niveau 2 · 105 niveau 3 · 77 niveau 4 · 43 niveau 5
**Accessibilité** : 75 exercices sans aucun matériel · 293 réalisables à la maison · 113 unilatéraux

**Les plus grosses familles** : pompes (54 variantes), squat (31), tractions (30), rowing (28), gainage (22), développé couché (21), curl biceps (20), extension de hanche (19), étirements (19).

Chaque fiche contient :

```ts
{
  id, name, nameEn, aliases, family, variantOf,
  category, mechanic, force,                    // taxonomie du mouvement
  group, primaryMuscles, secondaryMuscles,      // muscles sollicités
  equipment, difficulty, metric, unilateral, locations,
  description,                                  // à quoi sert le mouvement
  steps,                                        // exécution pas à pas
  commonMistakes,                               // erreurs fréquentes
  safetyTips,                                   // sécurité et contre-indications
  breathing, tempo, restSeconds, repRange,
  xpFactor, met,                                // gamification et calories
  progressions, regressions,                    // échelle de progression
  tags,
}
```

Toute la taxonomie est typée par unions littérales : une fiche mal renseignée **casse la compilation** plutôt que de passer en production. Un script de validation vérifie en plus la complétude, les plages numériques et l'intégrité référentielle (`variantOf`, `progressions`, `regressions`).

### Illustrations

Plutôt que 472 photos ou GIF à sourcer, héberger et maintenir, chaque fiche est illustrée par une **carte musculaire SVG** : une silhouette face et dos où les zones sollicitées s'allument — rose pour les muscles principaux, cyan pour les secondaires. Léger, cohérent, et immédiatement lisible.

---

## Stack technique et justification

| Choix | Pourquoi |
| --- | --- |
| **Next.js 16 (App Router)** | Les 472 fiches sont **pré-rendues statiquement** (`generateStaticParams`) : navigation instantanée et excellent référencement, ce qui compte pour un site dont l'axe premier est informatif. |
| **React 19 + TypeScript strict** | La base d'exercices est typée de bout en bout. Une faute de frappe dans un nom de muscle est une erreur de compilation, pas un bug silencieux. |
| **Tailwind CSS v4** | Design system déclaré une seule fois dans `globals.css` (`@theme`), couleurs par groupe musculaire réutilisées partout : filtres, badges, graphiques. |
| **Zustand** | Un store minimal, sans boilerplate. Toutes les mutations passent par un point unique qui recalcule XP, records, série, quêtes et badges de façon cohérente. |
| **Recharts** | Graphiques React déclaratifs, suffisants pour les courbes de progression, avec un habillage commun défini une fois. |
| **localStorage d'abord** | L'application est utilisable **immédiatement, sans compte et sans serveur**. Les données restent sur l'appareil. |
| **Supabase en option** | Auth, Postgres et RLS prêts à l'emploi pour le jour où l'on veut de la synchronisation multi-appareils et un vrai réseau social. Branché derrière une interface `StorageAdapter` : le reste du code ne sait pas quel stockage est actif. |
| **Service worker écrit à la main** | Une quarantaine de lignes lisibles plutôt qu'une dépendance opaque, avec une stratégie adaptée à chaque type de ressource. |
| **Icônes générées en Node pur** | `scripts/generate-icons.mjs` encode les PNG avec `zlib` uniquement : pas de bibliothèque d'images de plusieurs dizaines de mégaoctets pour quatre fichiers. |

---

## Démarrage rapide

**Prérequis** : Node.js 20 ou plus récent.

```bash
git clone https://github.com/SamSamsung/webworkout.git
cd webworkout
npm install
npm run dev
```

L'application est disponible sur <http://localhost:3000>. **Aucune configuration n'est nécessaire** : tout fonctionne en mode local.

---

## Variables d'environnement

Toutes sont **facultatives**. Sans elles, l'application tourne en mode local (localStorage).

Copiez `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

| Variable | Requis | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | non | URL du projet Supabase (`https://xxxx.supabase.co`). Active la synchronisation. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | non | Clé publique `anon` du projet Supabase. |

> ⚠️ Ces deux variables sont **publiques** (préfixe `NEXT_PUBLIC_`) et exposées au navigateur : c'est normal et sûr, à condition que les politiques RLS soient en place — elles le sont dans `supabase/schema.sql`. Ne mettez **jamais** la clé `service_role` dans une variable `NEXT_PUBLIC_`.

---

## Scripts disponibles

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (pré-rend les 472 fiches) |
| `npm start` | Sert le build de production |
| `npm run lint` | ESLint (configuration `next/core-web-vitals` + `next/typescript`) |
| `npm run typecheck` | Vérification TypeScript sans émission |
| `npm run check` | `typecheck` + `lint`, à lancer avant de pousser |
| `npm run data:validate` | Contrôle qualité de la base d'exercices (sort en code 1 en cas d'erreur) |
| `npm run data:stats` | Statistiques de la base (groupes, difficultés, familles) |
| `node scripts/generate-icons.mjs` | Régénère les icônes PNG de la PWA |

---

## Architecture du projet

```
src/
├─ app/                      # Routes (App Router)
│  ├─ page.tsx               # Tableau de bord
│  ├─ exercices/             # Liste + fiche [id] (pré-rendue)
│  ├─ seances/               # Modèles + éditeur [id]
│  ├─ entrainement/          # Séance en direct
│  ├─ progression/ profil/ social/ outils/
│  └─ hors-ligne/            # Page de repli du service worker
│
├─ types/
│  ├─ exercise.ts            # Schéma de la base d'exercices (unions littérales)
│  └─ app.ts                 # Profil, séances, records, badges, quêtes
│
├─ data/
│  ├─ taxonomy.ts            # Libellés, couleurs et icônes de la taxonomie
│  ├─ _helpers.ts            # `family()` : factorise les métadonnées communes
│  └─ exercises/             # 13 fichiers thématiques + index agrégateur
│
├─ lib/                      # Logique métier pure, sans React
│  ├─ xp.ts  calculs.ts  records.ts  badges.ts
│  ├─ streak.ts  quests.ts  generator.ts  search.ts
│  └─ storage.ts  supabase.ts
│
├─ store/useApp.ts           # Point d'entrée unique des mutations
└─ components/               # UI, découpée par domaine

scripts/                     # Validation, statistiques, génération d'icônes
supabase/schema.sql          # Schéma, vues et politiques RLS
```

**Principe directeur** : les données (`data/`), la logique (`lib/`) et l'interface (`components/`) sont strictement séparées. `lib/` ne connaît pas React ; `data/` ne connaît ni l'un ni l'autre.

---

## Ajouter un exercice

1. Ouvrez le fichier thématique correspondant dans `src/data/exercises/` (ou créez-en un nouveau et importez-le dans `index.ts`).
2. Ajoutez une entrée via le constructeur de famille. Seuls les champs qui **distinguent** la variante sont nécessaires : le reste est hérité.

```ts
pompe({
  id: "pompe-scorpion",                    // kebab-case, unique dans toute la base
  name: "Pompe scorpion",
  nameEn: "Scorpion push-up",
  difficulty: 3,
  description: "Pompe classique avec une jambe qui passe derrière…",
  steps: [
    "Pars en position haute de pompe.",
    "Pendant la descente, fais passer une jambe derrière l'autre.",
    "Repousse et alterne.",
  ],
  addMistakes: ["Laisser le bassin tourner complètement."],   // s'ajoute aux erreurs de la famille
  addTips: ["Ralentis si la hanche tire."],                   // s'ajoute aux conseils de la famille
  tags: ["mobilite", "obliques"],
});
```

3. Validez :

```bash
npm run data:validate
```

Le script refuse les identifiants en double, les descriptions trop courtes, les fiches sans erreur fréquente ou sans consigne de sécurité, les plages inversées et les références (`progressions`, `regressions`, `variantOf`) pointant vers un exercice inexistant.

---

## Comment l'XP est calculée

L'XP récompense le **travail réel**, jamais le temps passé sur le site.

```
XP d'une série = base(métrique) × xpFactor(exercice) × multiplicateur(difficulté) × bonus(unilatéral)
```

| Métrique | Base |
| --- | --- |
| Charge × répétitions | `poids × reps / 10` |
| Poids du corps (lest possible) | `(poids_de_corps × 0,35 + lest) × reps / 22` |
| Répétitions | `reps × 1,2` |
| Temps | `secondes / 5` |
| Distance | `mètres / 50` |

Multiplicateur de difficulté : ×1 (niv. 1-2), ×1,15 (3), ×1,35 (4), ×1,6 (5). Un mouvement unilatéral vaut ×1,7, puisqu'il se réalise des deux côtés.

**Niveaux** : passer du niveau `n` au suivant demande `120 × n^1,45` XP — doux au début, franchement exigeant au-delà du niveau 40. Dix rangs jalonnent le parcours, du *Poussin de fonte* (niv. 1) à la *Légende vivante* (niv. 100).

---

## Mode local ou mode Supabase

### Mode local (par défaut)

Tout vit dans le `localStorage` du navigateur. Aucune donnée ne quitte l'appareil, aucun compte n'est requis, l'application fonctionne hors ligne. Les « amis » sont des profils que vous saisissez vous-même, pour suivre un partenaire d'entraînement.

Pensez à **exporter votre sauvegarde** (Profil → Mes données) avant de changer de navigateur.

### Mode Supabase (optionnel)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL, exécutez l'intégralité de `supabase/schema.sql`. Il crée :
   - la table `profiles` (état complet en `jsonb` + colonnes indexables pour le classement) ;
   - les tables `friendships`, `challenges` et `challenge_participants` ;
   - la vue `leaderboard`, qui n'expose jamais l'état complet d'un joueur ;
   - les politiques RLS et le trigger de création automatique du profil à l'inscription.
3. Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Dans **Authentication → URL Configuration**, ajoutez l'URL de votre site (et `http://localhost:3000`) aux *Redirect URLs*.
5. Redémarrez l'application, puis allez dans **Profil → Compte & synchronisation** et saisissez votre e-mail : vous recevez un lien de connexion, sans mot de passe.

Au moment de la connexion :

- si le compte est vierge, **la progression locale y est envoyée** ;
- s'il contient déjà des données, la plus riche des deux progressions est conservée (comparaison sur le nombre de séances puis l'XP), l'autre restant récupérable via l'export JSON ;
- si le réseau échoue, l'application **reste en mode local** et le signale : une séance n'est jamais bloquée par un problème de synchronisation.

---

## Déploiement

Le site est **entièrement statique** : `npm run build:static` produit un dossier `out/` publiable sur n'importe quel hébergeur de fichiers. Aucune route ne dépend d'un serveur, toutes les données utilisateur vivent dans le navigateur.

### GitHub Pages (workflow inclus)

Le dépôt contient `.github/workflows/deploy.yml`, qui valide la base, construit l'export statique et publie le résultat.

**Une seule action manuelle est nécessaire, et une seule fois** — le jeton d'un workflow n'a pas le droit de créer un site Pages, seulement d'y publier :

1. **Settings → Pages → Build and deployment → Source : `GitHub Actions`**.
2. Si le déploiement part d'une branche autre que la branche par défaut, autorisez-la dans **Settings → Environments → `github-pages` → Deployment branches**.
3. Relancez le workflow (**Actions → Déploiement GitHub Pages → Run workflow**) ou poussez un commit.

Le site est alors publié sur `https://<utilisateur>.github.io/<dépôt>/`. Le workflow injecte automatiquement le sous-chemin via `NEXT_PUBLIC_BASE_PATH`.

Pour activer la synchronisation Supabase sur le site déployé, ajoutez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans **Settings → Secrets and variables → Actions**.

### Vercel

#### En un clic

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SamSamsung/webworkout)

#### En ligne de commande

```bash
npm i -g vercel
vercel          # déploiement de prévisualisation
vercel --prod   # déploiement en production
```

#### Depuis l'interface Vercel

1. **Add New → Project**, puis importez le dépôt GitHub.
2. Vercel détecte Next.js : laissez les réglages par défaut (`npm run build`, sortie `.next`).
3. Ajoutez éventuellement les deux variables Supabase dans **Settings → Environment Variables**.
4. **Deploy**.

Le build pré-rend les 472 fiches : comptez une à deux minutes. Aucune configuration serveur n'est nécessaire.

### Tout autre hébergeur statique

```bash
npm run build:static          # produit out/
npm run preview:static        # sert out/ en local pour vérifier
```

Déposez le contenu de `out/` sur Netlify, Cloudflare Pages, un bucket S3 ou n'importe quel serveur de fichiers. Si le site est servi depuis un sous-dossier, définissez `NEXT_PUBLIC_BASE_PATH=/le-sous-dossier` au moment du build.

---

## PWA et mode hors ligne

- **Manifeste** complet avec icônes 192 / 512 / maskable et trois raccourcis (séance, exercices, progression).
- **Service worker** (`public/sw.js`) : réseau d'abord pour les navigations, cache d'abord pour les ressources versionnées, page `/hors-ligne` en dernier recours.
- **Installation** : sur mobile, « Ajouter à l'écran d'accueil » ; sur desktop, l'icône d'installation dans la barre d'adresse.
- Les données étant locales, **séances, records et badges restent pleinement accessibles sans connexion**.

Le service worker n'est enregistré qu'en production, pour ne pas gêner le rechargement à chaud en développement.

---

## Feuille de route

- [ ] Synchronisation temps réel des classements et des défis
- [ ] Recherche d'amis par pseudo sur les profils publics
- [ ] Illustrations animées pour les mouvements les plus techniques
- [ ] Programmes sur plusieurs semaines (push/pull/legs, full body, 5/3/1)
- [ ] Périodisation automatique et suggestion de charge à partir des records
- [ ] Journal de poids de corps et de mensurations
- [ ] Export des séances au format CSV et `.ics`
- [ ] Traduction anglaise de l'interface (les noms anglais sont déjà dans la base)

---

## Avertissement

IronQuest est un outil de suivi et d'information, **pas un avis médical**. Les estimations (1RM, calories, fréquence cardiaque, IMC, métabolisme de base) reposent sur des formules de population et servent d'ordres de grandeur. En cas de douleur, de pathologie ou de reprise après blessure, consultez un professionnel de santé. Les consignes de sécurité de chaque fiche sont un rappel utile, jamais un substitut à l'encadrement d'un coach.

---

## Licence

MIT.
