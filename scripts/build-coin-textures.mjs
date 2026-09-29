// Builds the 3D Lira coin textures from the reference photo
// (assets/lira-coin-1975.jpg: cedar face on the left, "1 LIVRE" face on the
// right, white background). Run once after changing the photo:
//
//   node scripts/build-coin-textures.mjs
//
// Writes to public/coin/:
//   front.webp, back.webp            color maps (inside the raised lip)
//   front-bump.webp, back-bump.webp  height maps for the relief
//   coin.webp                        static fallback (whole coin, transparent)
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const SRC = new URL("../assets/lira-coin-1975.jpg", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);
const OUT = new URL("../public/coin/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

// The coin's flat face ends where the raised lip starts (0.975 of the
// radius, measured on the photo). The 3D model draws the lip itself.
const FACE_FRACTION = 0.975;
const COLOR_SIZE = 768;
const BUMP_SIZE = 512;
const FALLBACK_SIZE = 512;

mkdirSync(OUT, { recursive: true });

/** Finds the bounding circle of the non-white pixels in [x0, x1). */
async function findFace(x0, x1) {
  const { data, info } = await sharp(SRC)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = Infinity, maxX = -1, minY = Infinity, maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[y * info.width + x] < 225) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    r: (maxX - minX + (maxY - minY)) / 4,
  };
}

/** Square crop of radius r around the face center, padded with white. */
async function crop(face, r, size) {
  const pad = Math.ceil(r);
  const left = Math.round(face.cx - r) + pad;
  const top = Math.round(face.cy - r) + pad;
  const side = Math.round(r * 2);
  // Separate pipelines: sharp runs extract before extend within one.
  const padded = await sharp(SRC)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#ffffff" })
    .png()
    .toBuffer();
  return sharp(padded)
    .extract({ left, top, width: side, height: side })
    .resize(size, size, { kernel: "lanczos3" });
}

function circleMask(size, featherPx = 1.5) {
  const r = size / 2 - featherPx;
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#fff"/></svg>`,
  );
}

async function colorMap(face, name) {
  const img = await crop(face, face.r * FACE_FRACTION, COLOR_SIZE);
  const masked = await img
    .clone()
    .ensureAlpha()
    .composite([{ input: circleMask(COLOR_SIZE), blend: "dest-in" }])
    .png()
    .toBuffer();
  // Fill outside the circle with coin grey so mipmaps don't bleed white
  // into the edge of the face.
  await sharp({
    create: { width: COLOR_SIZE, height: COLOR_SIZE, channels: 3, background: "#8d8f92" },
  })
    .composite([{ input: masked }])
    .webp({ quality: 80 })
    .toFile(`${OUT}${name}.webp`);
}

// Height from brightness, high-passed so the photo's broad lighting doesn't
// read as a tilt: raised relief is lighter than the field around it.
async function bumpMap(face, name) {
  const base = (await crop(face, face.r * FACE_FRACTION, BUMP_SIZE)).greyscale();
  const sharpPx = await base.clone().blur(1.1).raw().toBuffer();
  const broadPx = await base.clone().blur(10).raw().toBuffer();
  const out = Buffer.alloc(sharpPx.length);
  const c = BUMP_SIZE / 2;
  for (let i = 0; i < out.length; i++) {
    const x = i % BUMP_SIZE;
    const y = Math.floor(i / BUMP_SIZE);
    const inside = Math.hypot(x - c, y - c) < c - 2;
    const v = 128 + (sharpPx[i] - broadPx[i]) * 1.4;
    out[i] = inside ? Math.max(0, Math.min(255, Math.round(v))) : 128;
  }
  await sharp(out, { raw: { width: BUMP_SIZE, height: BUMP_SIZE, channels: 1 } })
    .webp({ quality: 80 })
    .toFile(`${OUT}${name}-bump.webp`);
}

async function fallback(face) {
  const img = await crop(face, face.r, FALLBACK_SIZE);
  await img
    .ensureAlpha()
    .composite([{ input: circleMask(FALLBACK_SIZE, 1), blend: "dest-in" }])
    .webp({ quality: 80 })
    .toFile(`${OUT}coin.webp`);
}

const meta = await sharp(SRC).metadata();
const front = await findFace(0, Math.floor(meta.width / 2));
const back = await findFace(Math.floor(meta.width / 2), meta.width);
console.log("front face", front, "back face", back);

await colorMap(front, "front");
await colorMap(back, "back");
await bumpMap(front, "front");
await bumpMap(back, "back");
await fallback(front);
console.log(`Coin textures written to ${OUT}`);
