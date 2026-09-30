import type { MaterialKey, MetalTone } from "@/lib/catalog/types";
import { materials } from "@/lib/catalog/materials";

// Metal look shared by the name preview and the product art: a vertical
// multi-stop gradient (bright top, dark band, second highlight) reads as a
// polished curved surface; the filter adds a bevel highlight and a soft
// shadow so it looks like cut metal, not flat text.

export const metalStops: Record<MetalTone, [number, string][]> = {
  gold: [
    [0, "#fdf1c9"],
    [0.25, "#e8c678"],
    [0.48, "#b98a3c"],
    [0.56, "#f3d995"],
    [0.78, "#b3843a"],
    [1, "#7d5a26"],
  ],
  silver: [
    [0, "#ffffff"],
    [0.25, "#e3e5e9"],
    [0.48, "#a4a9b1"],
    [0.56, "#f3f4f6"],
    [0.78, "#9aa0a8"],
    [1, "#686d75"],
  ],
  rose: [
    [0, "#ffe9df"],
    [0.25, "#f0bba4"],
    [0.48, "#c27c62"],
    [0.56, "#f7d0bf"],
    [0.78, "#b8725b"],
    [1, "#85493a"],
  ],
};

/** Darker edge color: outlines, chain links, engraving. */
export const metalEdge: Record<MetalTone, string> = {
  gold: "#8a6428",
  silver: "#747a82",
  rose: "#94533f",
};

/** Light color: chain link highlights. */
export const metalLight: Record<MetalTone, string> = {
  gold: "#f6dea0",
  silver: "#f4f5f7",
  rose: "#f8d3c3",
};

/** Tints the grey coin photo to the metal color (feColorMatrix values). */
export const coinTint: Record<MetalTone, string> = {
  silver: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0",
  gold: "0.5 0.5 0.1 0 0.08  0.4 0.4 0.08 0 0.04  0.2 0.2 0.04 0 0  0 0 0 1 0",
  rose: "0.48 0.48 0.09 0 0.08  0.33 0.33 0.06 0 0.04  0.27 0.27 0.06 0 0.02  0 0 0 1 0",
};

export function toTone(material: MaterialKey | MetalTone): MetalTone {
  return material in materials
    ? materials[material as MaterialKey].tone
    : (material as MetalTone);
}

/**
 * <defs> for one SVG: `${id}-fill` gradient and `${id}-metal` filter.
 * `id` must be unique on the page (use useId()).
 */
export function MetalDefs({ id, tone }: { id: string; tone: MetalTone }) {
  return (
    <>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
        {metalStops[tone].map(([offset, color]) => (
          <stop key={offset} offset={offset} stopColor={color} />
        ))}
      </linearGradient>
      <filter
        id={`${id}-metal`}
        x="-15%"
        y="-25%"
        width="130%"
        height="160%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="blur" />
        <feSpecularLighting
          in="blur"
          surfaceScale="2.5"
          specularConstant="1.1"
          specularExponent="22"
          lightingColor="#ffffff"
          result="spec"
        >
          <feDistantLight azimuth="225" elevation="42" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
        <feComposite
          in="SourceGraphic"
          in2="specIn"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="0.75"
          k4="0"
          result="lit"
        />
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="shadowBlur" />
        <feOffset in="shadowBlur" dy="3" result="shadowOffset" />
        <feFlood floodColor="#3b2a16" floodOpacity="0.28" />
        <feComposite in2="shadowOffset" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="lit" />
        </feMerge>
      </filter>
    </>
  );
}
