/**
 * Contrôle qualité de la base d'exercices.
 *
 * Lancé par `npm run data:validate`, ce script vérifie que chaque fiche est
 * complète et cohérente. Il sort en code 1 dès qu'une erreur bloquante est
 * détectée, ce qui permet de le brancher en CI.
 */
import { EXERCISES, EXERCISES_BY_ID } from "../src/data/exercises";
import { EQUIPMENT_META, GROUP_META, MUSCLE_LABELS } from "../src/data/taxonomy";

const errors: string[] = [];
const warnings: string[] = [];

for (const ex of EXERCISES) {
  const at = `[${ex.id}]`;

  // --- Champs obligatoires et format
  if (!/^[a-z0-9-]+$/.test(ex.id)) errors.push(`${at} identifiant non conforme (kebab-case attendu)`);
  if (!ex.name.trim()) errors.push(`${at} nom vide`);
  if (ex.description.length < 60) errors.push(`${at} description trop courte (${ex.description.length} caractères)`);
  if (ex.steps.length < 2) errors.push(`${at} moins de 2 étapes d'exécution`);
  if (ex.commonMistakes.length < 1) errors.push(`${at} aucune erreur fréquente renseignée`);
  if (ex.safetyTips.length < 1) errors.push(`${at} aucun conseil de sécurité renseigné`);
  if (ex.primaryMuscles.length < 1 && ex.category !== "étirement" && ex.category !== "mobilité") {
    warnings.push(`${at} aucun muscle principal`);
  }
  if (!ex.equipment.length) errors.push(`${at} matériel non renseigné`);
  if (!ex.locations.length) errors.push(`${at} aucun lieu de pratique`);

  // --- Cohérence des plages numériques
  const [restMin, restMax] = ex.restSeconds;
  if (restMin > restMax) errors.push(`${at} fourchette de repos inversée`);
  if (ex.repRange && ex.repRange[0] > ex.repRange[1]) errors.push(`${at} fourchette de répétitions inversée`);
  if (ex.xpFactor <= 0 || ex.xpFactor > 5) errors.push(`${at} xpFactor hors plage (${ex.xpFactor})`);

  // --- Cohérence référentielle
  if (ex.variantOf && !EXERCISES_BY_ID.has(ex.variantOf)) {
    errors.push(`${at} variantOf pointe vers un exercice inconnu : ${ex.variantOf}`);
  }
  for (const id of ex.progressions ?? []) {
    if (!EXERCISES_BY_ID.has(id)) errors.push(`${at} progression inconnue : ${id}`);
  }
  for (const id of ex.regressions ?? []) {
    if (!EXERCISES_BY_ID.has(id)) errors.push(`${at} régression inconnue : ${id}`);
  }

  // --- Taxonomie : toutes les clés doivent être documentées
  if (!GROUP_META[ex.group]) errors.push(`${at} groupe musculaire sans métadonnée : ${ex.group}`);
  for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
    if (!MUSCLE_LABELS[m]) errors.push(`${at} muscle sans libellé : ${m}`);
  }
  for (const e of ex.equipment) {
    if (!EQUIPMENT_META[e]) errors.push(`${at} matériel sans libellé : ${e}`);
  }

  // --- Un muscle ne peut pas être à la fois principal et secondaire
  const overlap = ex.primaryMuscles.filter((m) => ex.secondaryMuscles.includes(m));
  if (overlap.length) warnings.push(`${at} muscles à la fois principaux et secondaires : ${overlap.join(", ")}`);
}

console.log(`Base d'exercices : ${EXERCISES.length} fiches contrôlées.`);
if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`);
  for (const w of warnings.slice(0, 40)) console.log("  ⚠ " + w);
  if (warnings.length > 40) console.log(`  … et ${warnings.length - 40} de plus`);
}
if (errors.length) {
  console.error(`\n${errors.length} erreur(s) bloquante(s) :`);
  for (const e of errors.slice(0, 60)) console.error("  ✗ " + e);
  if (errors.length > 60) console.error(`  … et ${errors.length - 60} de plus`);
  process.exit(1);
}
console.log("\n✓ Base valide.");
