/**
 * Statistiques de la base d'exercices (`npm run data:stats`).
 * Utile pour tenir le README à jour et repérer les zones sous-couvertes.
 */
import { EXERCISES, FAMILIES } from "../src/data/exercises";
import { GROUP_META } from "../src/data/taxonomy";

const count = <T extends string>(pick: (e: (typeof EXERCISES)[number]) => T[] | T) => {
  const map = new Map<string, number>();
  for (const ex of EXERCISES) {
    const values = pick(ex);
    for (const v of Array.isArray(values) ? values : [values]) {
      map.set(v, (map.get(v) ?? 0) + 1);
    }
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`\n=== IronQuest — base d'exercices ===`);
console.log(`Total : ${EXERCISES.length} exercices, ${FAMILIES.length} familles de mouvement\n`);

console.log("Par groupe musculaire :");
for (const [group, n] of count((e) => e.group)) {
  console.log(`  ${GROUP_META[group as keyof typeof GROUP_META]?.label ?? group}`.padEnd(24) + n);
}

console.log("\nPar difficulté :");
for (const [d, n] of count((e) => String(e.difficulty)).sort()) console.log(`  Niveau ${d}`.padEnd(24) + n);

console.log("\nPar catégorie :");
for (const [c, n] of count((e) => e.category)) console.log(`  ${c}`.padEnd(24) + n);

console.log("\nSans matériel :", EXERCISES.filter((e) => e.equipment.length === 1 && e.equipment[0] === "aucun").length);
console.log("Réalisables à la maison :", EXERCISES.filter((e) => e.locations.includes("maison")).length);
console.log("Unilatéraux :", EXERCISES.filter((e) => e.unilateral).length);

console.log("\nTop 12 des familles :");
for (const [f, n] of count((e) => e.family).slice(0, 12)) console.log(`  ${f}`.padEnd(24) + n);
console.log();
