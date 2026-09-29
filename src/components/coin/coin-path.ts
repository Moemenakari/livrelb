// Where the coin is on screen for a given scroll position. Pure, so the
// renderer and the "is it hidden?" check agree.
//
//  1. Travel: from the hero slot to the Lira-section slot. The coin stays
//     at the same height on screen (the page scrolls under it) and drifts
//     sideways, arriving exactly as the Lira slot reaches it.
//  2. Leave: it rides up with the Lira section like part of the page, so
//     it never sits under the section's text at full brightness.
//  3. Ambient: once off screen, a smaller, faint coin fades in and drifts
//     left and right in the background for the rest of the page.

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
  // One-column layouts scroll text over the pinned coin: dim it mid-way.
  const stacked = vw < 1024;
  // The screen height the coin is pinned at: where the hero slot sits at
  // the top of the page.
  const pinY = Math.min(hero.cy, vh * 0.6);

  if (!lira || lira.cy <= hero.cy) {
    return { x: hero.cx, y: hero.cy - scrollY, size: hero.size, opacity: 1 };
  }

  const travel = lira.cy - hero.cy;
  if (scrollY <= travel) {
    const p = clamp01(scrollY / travel);
    const e = easeInOut(p);
    return {
      x: lerp(hero.cx, lira.cx, e),
      y: lerp(hero.cy - scrollY, pinY, clamp01(p * 4)),
      size: lerp(hero.size, lira.size, e),
      opacity: stacked ? 1 - 0.7 * Math.sin(Math.PI * p) : 1,
    };
  }

  const q = scrollY - travel;
  const exit = pinY + lira.size / 2;
  if (q <= exit) {
    return { x: lira.cx, y: pinY - q, size: lira.size, opacity: 1 };
  }

  const a = q - exit;
  const amplitude = vw * (mobile ? 0.26 : 0.32);
  return {
    x: vw / 2 + amplitude * Math.sin(a / 700),
    y: vh * 0.55 + Math.sin(a / 900) * 18,
    size: Math.min(vw, vh) * (mobile ? 0.42 : 0.3),
    opacity: 0.3 * easeInOut(clamp01(a / (vh * 0.5))),
  };
}
