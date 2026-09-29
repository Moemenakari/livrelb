"use client";

import Image from "next/image";
import { useCoinMode } from "./coin-mode";

export type AnchorId = "hero" | "lira";

// A slot the 3D coin travels to. The coin itself is drawn by <CoinStage>
// in a fixed layer behind the page; this empty box only tells it where and
// how big to be. With reduced motion or no WebGL, the slot shows the photo.
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
    <div data-coin-anchor={id} className={`relative aspect-square ${className}`}>
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
