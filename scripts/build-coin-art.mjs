// Builds the flat coin images for the 250 and 500 Livres products from the
// reference photos (both faces side by side on a white background: the
// Arabic/cedar face on the left, the number face on the right). The product
// art tints them to the chosen metal, so they are saved in grey, like
// public/coin/coin.webp. Run once after changing a photo:
//
//   node scripts/build-coin-art.mjs
//
// Writes public/coin/lira-<value>.webp (cedar face) and
// public/coin/lira-<value>-back.webp (number face), 512 px, transparent
// outside the coin.
import sharp from "sharp";

const path = (rel) =>
  new URL(rel, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const COINS = [
  { value: 250, src: path("../assets/lira-coin-250-1996.jpg") },
  { value: 500, src: path("../assets/lira-coin-500-2006.jpg") },
];
const OUT = path("../public/coin/");
const SIZE = 512;

/** Bounding circle of the non-white pixels in columns [x0, x1). */
async function findFace(src, x0, x1) {
  const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
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
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, r: (maxX - minX + (maxY - minY)) / 4 };
}

const circleMask = (size) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#fff"/></svg>`,
  );

async function face(src, f, name) {
  const pad = Math.ceil(f.r);
  const padded = await sharp(src)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#ffffff" })
    .png()
    .toBuffer();
  const side = Math.round(f.r * 2);
  const coin = await sharp(padded)
    .extract({
      left: Math.round(f.cx - f.r) + pad,
      top: Math.round(f.cy - f.r) + pad,
      width: side,
      height: side,
    })
    .resize(SIZE, SIZE, { kernel: "lanczos3" })
    // Grey like the 1975 coin: the tint filter adds the metal color back.
    .greyscale()
    .normalise({ lower: 1, upper: 99 })
    .png()
    .toBuffer();
  await sharp(coin)
    .ensureAlpha()
    .composite([{ input: circleMask(SIZE), blend: "dest-in" }])
    .webp({ quality: 82 })
    .toFile(`${OUT}${name}.webp`);
}

for (const { value, src } of COINS) {
  const { width } = await sharp(src).metadata();
  const front = await findFace(src, 0, Math.floor(width / 2));
  const back = await findFace(src, Math.floor(width / 2), width);
  console.log(value, "front", front, "back", back);
  await face(src, front, `lira-${value}`);
  await face(src, back, `lira-${value}-back`);
}
console.log(`Coin art written to ${OUT}`);
