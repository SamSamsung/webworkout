/**
 * Génère les icônes PNG de la PWA sans aucune dépendance externe.
 *
 * Node embarque `zlib`, et le format PNG est suffisamment simple pour être
 * écrit à la main : on évite ainsi d'ajouter une bibliothèque d'images (et
 * plusieurs dizaines de mégaoctets) au projet pour trois fichiers.
 *
 * Usage : node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** CRC32, requis par chaque chunk PNG. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Encode un buffer RGBA (largeur × hauteur × 4) en PNG. */
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtre « None »
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur de bit
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Éclair stylisé, décrit dans un carré unitaire. */
const BOLT = [
  [0.56, 0.08],
  [0.26, 0.54],
  [0.46, 0.54],
  [0.38, 0.92],
  [0.74, 0.42],
  [0.52, 0.42],
];

/** Test d'appartenance à un polygone (lancer de rayon). */
function inPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Dessine l'icône : fond sombre arrondi, halo violet, éclair en dégradé
 * violet → cyan → citron vert (les trois accents du design system).
 */
function renderIcon(size, { padding = 0 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const inner = size - padding * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Coins arrondis : en dehors du gabarit, pixel transparent.
      const cx = Math.min(Math.max(x, radius), size - radius);
      const cy = Math.min(Math.max(y, radius), size - radius);
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > radius) {
        rgba[i + 3] = 0;
        continue;
      }

      // Fond : ardoise très sombre, éclairci par un halo en haut à gauche.
      const glow = Math.max(0, 1 - Math.hypot(x - size * 0.2, y - size * 0.1) / (size * 0.75));
      rgba[i] = Math.round(lerp(8, 60, glow * glow));
      rgba[i + 1] = Math.round(lerp(7, 24, glow * glow));
      rgba[i + 2] = Math.round(lerp(15, 92, glow * glow));
      rgba[i + 3] = 255;

      // Éclair, avec un dégradé vertical.
      const ux = (x - padding) / inner;
      const uy = (y - padding) / inner;
      if (inPolygon(ux, uy, BOLT)) {
        const t = Math.min(1, Math.max(0, uy));
        const [r, g, b] =
          t < 0.5
            ? [lerp(168, 34, t * 2), lerp(85, 211, t * 2), lerp(247, 238, t * 2)]
            : [lerp(34, 163, (t - 0.5) * 2), lerp(211, 230, (t - 0.5) * 2), lerp(238, 53, (t - 0.5) * 2)];
        rgba[i] = Math.round(r);
        rgba[i + 1] = Math.round(g);
        rgba[i + 2] = Math.round(b);
        rgba[i + 3] = 255;
      }
    }
  }
  return encodePng(size, size, rgba);
}

/**
 * Encapsule un PNG dans un conteneur ICO.
 * Le format ICO accepte des images PNG depuis Windows Vista : un en-tête de
 * 22 octets suffit, inutile de produire un bitmap indexé à l'ancienne.
 */
function pngToIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // type : icône
  header.writeUInt16LE(1, 4); // nombre d'images
  header[6] = size >= 256 ? 0 : size; // largeur (0 signifie 256)
  header[7] = size >= 256 ? 0 : size; // hauteur
  header[8] = 0; // palette
  header[9] = 0; // réservé
  header.writeUInt16LE(1, 10); // plans
  header.writeUInt16LE(32, 12); // bits par pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // décalage des données
  return Buffer.concat([header, png]);
}

mkdirSync(resolve(ROOT, "public"), { recursive: true });

const outputs = [
  ["public/icon-192.png", renderIcon(192)],
  ["public/icon-512.png", renderIcon(512)],
  // L'icône « maskable » doit tolérer un recadrage circulaire : on ajoute une
  // marge de sécurité de 10 % autour de l'éclair.
  ["public/icon-maskable-512.png", renderIcon(512, { padding: 512 * 0.14 })],
  ["public/apple-touch-icon.png", renderIcon(180)],
  // Certains navigateurs et robots demandent /favicon.ico sans regarder les
  // balises <link>, ce qui produirait un 404 à chaque visite.
  ["public/favicon.ico", pngToIco(renderIcon(32), 32)],
];

for (const [path, buffer] of outputs) {
  writeFileSync(resolve(ROOT, path), buffer);
  console.log(`✓ ${path} (${(buffer.length / 1024).toFixed(1)} Ko)`);
}
