// Drag-to-spin state shared by the coin slots (pointer events in the page)
// and the 3D scene (applies the spin every frame). Plain mutable object: it
// changes every pointer move and every frame, so no React state.

/** Radians of spin per dragged CSS pixel. */
export const DRAG_SPIN = 0.012;
const MAX_VELOCITY = 40; // rad/s

export const coinDrag = {
  dragging: false,
  /** Extra rotation added by the user, radians. */
  offset: 0,
  /** Spin speed when released (inertia), rad/s. */
  velocity: 0,
  lastX: 0,
  lastTime: 0,
  /** Where the coin is on screen, written by the scene each frame. */
  screen: { x: 0, y: 0, radius: 0, visible: false },
};

export function startDrag(x: number, y: number, time: number): boolean {
  const s = coinDrag.screen;
  if (!s.visible || Math.hypot(x - s.x, y - s.y) > s.radius) return false;
  coinDrag.dragging = true;
  coinDrag.velocity = 0;
  coinDrag.lastX = x;
  coinDrag.lastTime = time;
  return true;
}

export function moveDrag(x: number, time: number) {
  if (!coinDrag.dragging) return;
  const delta = (x - coinDrag.lastX) * DRAG_SPIN;
  const dt = Math.max(1, time - coinDrag.lastTime) / 1000;
  coinDrag.offset += delta;
  // Smoothed so the release speed doesn't depend on the last tiny move.
  const velocity = 0.7 * coinDrag.velocity + 0.3 * (delta / dt);
  coinDrag.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocity));
  coinDrag.lastX = x;
  coinDrag.lastTime = time;
}

export function endDrag() {
  coinDrag.dragging = false;
}

/**
 * After release: keep spinning with friction, then ease back to the nearest
 * whole turn so the coin returns to its idle rotation.
 */
export function settleDrag(dt: number) {
  if (coinDrag.dragging) return;
  coinDrag.offset += coinDrag.velocity * dt;
  coinDrag.velocity *= Math.exp(-2.4 * dt);
  if (Math.abs(coinDrag.velocity) < 0.8) {
    const home = Math.round(coinDrag.offset / (Math.PI * 2)) * Math.PI * 2;
    coinDrag.offset += (home - coinDrag.offset) * (1 - Math.exp(-1.5 * dt));
  }
}
