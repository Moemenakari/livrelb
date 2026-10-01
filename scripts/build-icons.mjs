// Builds the app icons (home-screen icon of the phone): public/icons/*.png
// and src/app/apple-icon.png, from the brand mark in src/app/icon.svg.
//   node scripts/build-icons.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const svg = readFileSync(root("src/app/icon.svg"));
mkdirSync(root("public/icons"), { recursive: true });

// Normal icons: the round mark on the ivory background (full square).
const square = async (size, out, inset = 0) => {
  const mark = await sharp(svg, { density: 600 }).resize(Math.round(size * (1 - inset * 2))).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#faf7f2" } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(root(out));
};
await square(192, "public/icons/icon-192.png", 0.08);
await square(512, "public/icons/icon-512.png", 0.08);
// Maskable: Android may crop to a circle, so keep the mark inside the safe zone.
await square(512, "public/icons/maskable-512.png", 0.2);
await square(180, "src/app/apple-icon.png", 0.1);
console.log("icons written");
