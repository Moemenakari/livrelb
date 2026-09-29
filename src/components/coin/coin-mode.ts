"use client";

import { useSyncExternalStore } from "react";

// How the Lira coin is shown on this device (restart brief): the real 3D
// coin, or the static photo only when reduced motion is on or WebGL is
// unavailable. "pending" on the server and during hydration.
export type CoinMode = "pending" | "3d" | "static";

let cached: CoinMode | null = null;

function detect(): CoinMode {
  if (cached) return cached;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    webgl = false;
  }
  cached = reduced || !webgl ? "static" : "3d";
  return cached;
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listener = () => {
    cached = null;
    onChange();
  };
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function useCoinMode(): CoinMode {
  return useSyncExternalStore(subscribe, detect, () => "pending");
}
