"use client";

import dynamic from "next/dynamic";
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
  if (mode !== "3d") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh">
      <CoinScene />
    </div>
  );
}
