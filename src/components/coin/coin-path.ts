// Where the coin is on screen for a given scroll position. Pure, so the
// renderer and the "is it hidden?" check agree.
//
//  1. Travel: from the hero slot to the Lira-section slot. The coin stays
//     at the same height on screen (the page scrolls under it) and drifts
//     sideways, arriving exactly as the Lira slot reaches it.
//  2. Ambient: it shrinks, fades and keeps drifting left and right in the
//     background for the rest of the page.

export type AnchorBox = {
  /** Center x in viewport px. */
  cx: number;
  /** Center y in document px (independent of scroll). */
  cy: number;
  /** Diameter in px. */
  size: number;
};

export type CoinFrame = { x: number; y: number; size: number; opacity: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => t * t * (3 - 2 * t);

export function coinFrame(
  scrollY: number,
  hero: AnchorBox,
  lira: AnchorBox | null,
  vw: number,
  vh: number,
): CoinFrame {
  const mobile = vw < 768;
  // The screen height the coin is pinned at: where the hero slot sits at
  // the top of the page.
  const pinY = Math.min(hero.cy, vh * 0.6);

  if (!lira || lira.cy <= hero.cy) {
    return { x: hero.cx, y: hero.cy - scrollY, size: hero.size, opacity: 1 };
  }

  const travel = lira.cy - hero.cy;
  if (scrollY <= travel) {
    const e = easeInOut(clamp01(scrollY / travel));
    return {
      x: lerp(hero.cx, lira.cx, e),
      y: lerp(hero.cy - scrollY, pinY, clamp01(scrollY / (travel * 0.25))),
      size: lerp(hero.size, lira.size, e),
      opacity: 1,
    };
  }

  const q = scrollY - travel;
  const b = easeInOut(clamp01(q / (vh * 0.9)));
  const amplitude = vw * (mobile ? 0.26 : 0.32);
  // Start the sine where the Lira slot is so the drift continues smoothly.
  const phase = Math.asin(Math.max(-1, Math.min(1, (lira.cx - vw / 2) / amplitude)));
  const ambientX = vw / 2 + amplitude * Math.sin(q / 700 + phase);
  const ambientSize = Math.min(vw, vh) * (mobile ? 0.42 : 0.3);

  return {
    x: lerp(lira.cx, ambientX, b),
    y: pinY + Math.sin(q / 900) * 18 * b,
    size: lerp(lira.size, ambientSize, b),
    opacity: lerp(1, 0.32, b),
  };
}
