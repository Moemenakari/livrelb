// Browser-only helpers for the charm import: turns a photo of a charm on a white
// background into an 800 x 800 picture with a transparent background (the charm
// centered), and reads family / metal / price from the folders the photo is in.

export const CUTOUT_SIZE = 800;
const WORK = 1600;

/** How strongly near-white is removed. Strong also removes light shadows but can eat pale silver edges. */
export type CutLevel = "gentle" | "normal" | "strong";
const threshold: Record<CutLevel, number> = { gentle: 246, normal: 234, strong: 216 };

export const cutLevels: { value: CutLevel; label: string }[] = [
  { value: "gentle", label: "Gentle (clean white backgrounds)" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Strong (shadows, grey backgrounds)" },
];

/**
 * Photo -> transparent 800 x 800 (WebP, or PNG where the browser can't make WebP).
 * The background is the near-white area connected to the edges of the photo, so white
 * parts inside the charm (pearls, highlights) stay. A photo that already has a
 * transparent background is only centered and resized.
 */
export async function cutout(file: Blob, level: CutLevel): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, WORK / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const work = document.createElement("canvas");
  work.width = w;
  work.height = h;
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const alphaAt = (x: number, y: number) => d[(y * w + x) * 4 + 3];
  const hasAlpha = [alphaAt(0, 0), alphaAt(w - 1, 0), alphaAt(0, h - 1), alphaAt(w - 1, h - 1)].some((a) => a < 250);

  if (!hasAlpha) removeBackground(d, w, h, threshold[level]);

  // Where the charm is.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("No charm found (the whole photo looks like background).");
  ctx.putImageData(image, 0, 0);

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const fit = Math.min((CUTOUT_SIZE * 0.88) / bw, (CUTOUT_SIZE * 0.88) / bh);
  const out = document.createElement("canvas");
  out.width = out.height = CUTOUT_SIZE;
  const o = out.getContext("2d")!;
  o.imageSmoothingQuality = "high";
  const dw = bw * fit;
  const dh = bh * fit;
  o.drawImage(work, minX, minY, bw, bh, (CUTOUT_SIZE - dw) / 2, (CUTOUT_SIZE - dh) / 2, dw, dh);

  const webp = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/webp", 0.92));
  if (webp && webp.type === "image/webp") return webp;
  const png = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
  if (!png) throw new Error("This photo couldn't be converted.");
  return png;
}

function removeBackground(d: Uint8ClampedArray, w: number, h: number, t: number) {
  const near = (i: number) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lo = Math.min(r, g, b);
    return lo >= t && Math.max(r, g, b) - lo <= 30;
  };
  const gone = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (p: number) => {
    if (gone[p] || !near(p * 4)) return;
    gone[p] = 1;
    stack[top++] = p;
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (top > 0) {
    const p = stack[--top];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  for (let p = 0; p < w * h; p++) {
    if (gone[p]) {
      d[p * 4 + 3] = 0;
      continue;
    }
    // A pixel that touches the background and is still very light is half see-through,
    // so the cut edge doesn't show a white halo on a beige page.
    const x = p % w;
    const touches = (x > 0 && gone[p - 1]) || (x < w - 1 && gone[p + 1]) || (p >= w && gone[p - w]) || (p < w * (h - 1) && gone[p + w]);
    if (touches && Math.min(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]) >= t - 22) d[p * 4 + 3] = 140;
  }
}

// ---- Folder layout -----------------------------------------------------------------------------

export type Plan = {
  file: File;
  row?: { family: "charms" | "turkish"; metal: "gold" | "silver"; code: string; priceCents: number | null };
  problem?: string;
};

const PICTURE = /\.(png|jpe?g|webp)$/i;
const FLAT = /^(charms|turkish)_(gold|silver)_([a-z0-9-]{1,60})\.(png|jpe?g|webp)$/i;
const PRICE = /^\$?(\d+(?:[.,]\d{1,2})?)\$?$/;
const MAX_BYTES = 30 * 1024 * 1024;

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/**
 * Reads where each photo belongs from its folders: <charms | turkish>/<gold | silver>/<price in $>/photo.jpg
 * (any order, any depth). The old flat name family_metal_code.png also works. Files that aren't
 * pictures (Thumbs.db, .DS_Store) are left out; the count is returned.
 */
export function planCharmFiles(files: File[]): { plans: Plan[]; ignored: number } {
  const pictures = files.filter((f) => PICTURE.test(f.name));
  const seen = new Set<string>();
  const plans = pictures.map((file): Plan => {
    if (file.size > MAX_BYTES) return { file, problem: "Bigger than 30 MB" };
    const dirs = (file.webkitRelativePath || "").split("/").slice(0, -1);
    const flat = FLAT.exec(file.name);
    let family: "charms" | "turkish" | null = flat ? (flat[1].toLowerCase() as "charms" | "turkish") : null;
    let metal: "gold" | "silver" | null = flat ? (flat[2].toLowerCase() as "gold" | "silver") : null;
    let priceCents: number | null = null;
    for (const dir of dirs) {
      const d = dir.trim().toLowerCase();
      if (!family && /^(charms?|turkish|turkish[ _-]?charms?)$/.test(d)) family = d.startsWith("turkish") ? "turkish" : "charms";
      else if (!metal && /^(gold|silver)$/.test(d)) metal = d as "gold" | "silver";
      else if (priceCents === null && PRICE.test(d)) {
        const dollars = Number(PRICE.exec(d)![1].replace(",", "."));
        // A folder called 2024 or 1000 is not a price.
        if (dollars <= 500) priceCents = Math.round(dollars * 100);
      }
    }
    if (!family || !metal) return { file, problem: "Put it in folders like turkish / gold / 8 (family / metal / price)" };
    const code = flat ? flat[3].toLowerCase() : slug(file.name.replace(/\.[^.]+$/, ""));
    if (!code) return { file, problem: "The file name has no letters or numbers" };
    const key = `${family}|${metal}|${code}`;
    if (seen.has(key)) return { file, problem: "Same family, metal and file name twice (rename one)" };
    seen.add(key);
    return { file, row: { family, metal, code, priceCents } };
  });
  return { plans, ignored: files.length - pictures.length };
}
