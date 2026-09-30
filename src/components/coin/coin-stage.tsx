"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { COIN_TEXTURES } from "./coin-assets";
import { useCoinMode } from "./coin-mode";

// three.js is only downloaded when the 3D coin will actually be shown.
const CoinScene = dynamic(() => import("./coin-scene"), { ssr: false });

/**
 * Fixed layer behind the homepage that draws the 3D Lira coin. Section
 * content must be `relative z-[1]` to sit above it; a section whose own
 * background should hide the coin is itself `relative z-[1]`.
 */
export function CoinStage() {
  const mode = useCoinMode();

  // Fetch the textures while the three.js chunk downloads, instead of after.
  useEffect(() => {
    if (mode !== "3d") return;
    for (const src of COIN_TEXTURES) new Image().src = src;
  }, [mode]);

  if (mode !== "3d") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh">
      <CoinScene />
    </div>
  );
}
