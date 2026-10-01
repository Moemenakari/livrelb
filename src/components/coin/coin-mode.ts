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
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    webgl = Boolean(gl);
    // Software rendering (no graphics chip) would freeze the page: use the photo.
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software/i.test(renderer)) webgl = false;
  } catch {
    webgl = false;
  }
  // Very weak phones (2 cores or less, 2 GB of memory or less) also get the photo.
  const weak =
    (navigator.hardwareConcurrency ?? 8) <= 2 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2;
  if (weak) webgl = false;
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
