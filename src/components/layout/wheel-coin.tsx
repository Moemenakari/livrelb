"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

// Degrees of turn per scrolled pixel.
const TURN_PER_PX = 0.35;

// A small half Lira coin peeking from the end edge of the screen (right in
// English, left in Arabic) on every page, turning like a wheel with the
// scroll: down turns it one way, up turns it back. A plain image rotated
// with CSS, so it costs nothing (no three.js). Decorative: ignores taps,
// hidden under 360px, still for reduced motion.
export function WheelCoin() {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Rolling along the edge: clockwise on the right, counter-clockwise on
    // the left, as if the page were the ground under it.
    const direction = document.documentElement.dir === "rtl" ? -1 : 1;
    let frame = 0;
    const turn = () => {
      frame = 0;
      img.style.transform = `rotate(${window.scrollY * TURN_PER_PX * direction}deg)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(turn);
    };
    turn();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed end-0 top-1/2 z-30 hidden -translate-y-1/2 opacity-70 ltr:translate-x-1/2 rtl:-translate-x-1/2 min-[360px]:block"
    >
      <Image
        ref={ref}
        src="/coin/coin-sm.webp"
        alt=""
        width={64}
        height={64}
        unoptimized
        className="size-10 rounded-full drop-shadow-[0_4px_8px_rgba(43,38,34,0.25)] will-change-transform sm:size-12 lg:size-16"
      />
    </div>
  );
}
