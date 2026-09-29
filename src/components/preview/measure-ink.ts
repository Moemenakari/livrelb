// Where the letters' ink actually is, so jump rings touch the metal.
// SVG getBBox() only gives the font's line box, which for script fonts is
// far from the strokes. Instead the name is drawn on a small offscreen canvas
// with the same font and scanned. All points are relative to the text anchor
// (horizontal center, baseline), in font pixels = SVG user units.

export type Point = { x: number; y: number };

export type Ink = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Highest stroke near the middle: where a center ring attaches. */
  topAttach: Point;
  /** Outermost strokes in the upper half: where side rings attach. */
  leftAttach: Point;
  rightAttach: Point;
};

/** Rough ink box before fonts load (and on the server). */
export function estimateInk(text: string, fontSize: number): Ink {
  const half = Math.max(1, [...text].length) * fontSize * 0.25;
  const midY = -fontSize * 0.36;
  return {
    left: -half,
    right: half,
    top: -fontSize * 0.72,
    bottom: fontSize * 0.2,
    topAttach: { x: 0, y: -fontSize * 0.46 },
    leftAttach: { x: -half, y: midY },
    rightAttach: { x: half, y: midY },
  };
}

let ctx: CanvasRenderingContext2D | null = null;

function setup(c: CanvasRenderingContext2D, font: string, rtl: boolean) {
  c.font = font;
  c.direction = rtl ? "rtl" : "ltr";
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
}

export function measureInk(text: string, font: string, rtl: boolean): Ink | null {
  ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  setup(ctx, font, rtl);
  const m = ctx.measureText(text);
  const pad = 4;
  const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2);
  const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2);
  if (w <= pad * 2 || h <= pad * 2) return null;

  ctx.canvas.width = w; // resets the context state
  ctx.canvas.height = h;
  setup(ctx, font, rtl);
  const ox = pad + m.actualBoundingBoxLeft;
  const oy = pad + m.actualBoundingBoxAscent;
  ctx.fillText(text, ox, oy);
  const px = ctx.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => px[(y * w + x) * 4 + 3] > 110;

  const top = pad;
  const inkH = h - pad * 2;
  const inkW = w - pad * 2;

  // Center ring: highest stroke in a band around the middle, widening the
  // band if the middle falls between two letters.
  let topAttach: Point | null = null;
  for (const band of [0.06, 0.14, 0.3]) {
    const x0 = Math.max(0, Math.floor(ox - inkW * band));
    const x1 = Math.min(w - 1, Math.ceil(ox + inkW * band));
    for (let y = 0; y < h && !topAttach; y++) {
      for (let x = x0; x <= x1; x++) {
        if (solid(x, y)) {
          topAttach = { x: x - ox, y: y - oy };
          break;
        }
      }
    }
    if (topAttach) break;
  }

  // Side rings: outermost strokes between 15% and 60% of the ink height.
  const y0 = Math.floor(top + inkH * 0.15);
  const y1 = Math.ceil(top + inkH * 0.6);
  let leftAttach: Point | null = null;
  let rightAttach: Point | null = null;
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) {
        if (!leftAttach || x < leftAttach.x + ox) leftAttach = { x: x - ox, y: y - oy };
        break;
      }
    }
    for (let x = w - 1; x >= 0; x--) {
      if (solid(x, y)) {
        if (!rightAttach || x > rightAttach.x + ox) rightAttach = { x: x - ox, y: y - oy };
        break;
      }
    }
  }

  return {
    left: -m.actualBoundingBoxLeft,
    right: m.actualBoundingBoxRight,
    top: -m.actualBoundingBoxAscent,
    bottom: m.actualBoundingBoxDescent,
    topAttach: topAttach ?? { x: 0, y: -m.actualBoundingBoxAscent },
    leftAttach: leftAttach ?? { x: -m.actualBoundingBoxLeft, y: -inkH * 0.4 },
    rightAttach: rightAttach ?? { x: m.actualBoundingBoxRight, y: -inkH * 0.4 },
  };
}
