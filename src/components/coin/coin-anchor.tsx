"use client";

import Image from "next/image";
import { endDrag, moveDrag, startDrag } from "./coin-drag";
import { useCoinMode } from "./coin-mode";

export type AnchorId = "hero" | "lira";

// A slot the 3D coin travels to. The coin itself is drawn by <CoinStage>
// in a fixed layer behind the page; this empty box tells it where and how
// big to be, and catches drags to spin it (horizontal only: `pan-y` leaves
// vertical swipes to the page). With reduced motion or no WebGL, the slot
// shows the photo.
export function CoinAnchor({
  id,
  alt,
  eager = false,
  className = "",
}: {
  id: AnchorId;
  alt: string;
  /** Above the fold: load the fallback photo right away. */
  eager?: boolean;
  className?: string;
}) {
  const mode = useCoinMode();

  return (
    <div
      data-coin-anchor={id}
      className={`relative aspect-square ${mode === "3d" ? "cursor-grab touch-pan-y select-none active:cursor-grabbing" : ""} ${className}`}
      onPointerDown={
        mode === "3d"
          ? (e) => {
              if (startDrag(e.clientX, e.clientY, e.timeStamp)) {
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }
          : undefined
      }
      onPointerMove={mode === "3d" ? (e) => moveDrag(e.clientX, e.timeStamp) : undefined}
      onPointerUp={mode === "3d" ? endDrag : undefined}
      onPointerCancel={mode === "3d" ? endDrag : undefined}
      onLostPointerCapture={mode === "3d" ? endDrag : undefined}
    >
      {mode === "static" && (
        <Image
          src="/coin/coin.webp"
          alt={alt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 420px, 70vw"
          className="rounded-full object-contain drop-shadow-[0_18px_30px_rgba(43,38,34,0.25)]"
        />
      )}
    </div>
  );
}
