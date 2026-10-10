"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Trash2 } from "lucide-react";
import { metalEdge } from "@/components/preview/metal";
import type { Localized, MetalTone } from "@/lib/catalog/types";
import type { CharmShape } from "@/lib/charms";
import { CharmArt } from "./charm-art";

/** What is on the chain: a drawn shape or a charm with a photo. */
export type Entry = { key: string; price: number; name: Localized } & ({ shape: CharmShape } | { image: string });
export type Piece = "necklace" | "bracelet" | "keychain";
/** One side: the charms sit together in the middle. Two sides: they spread over the whole chain. */
export type Sides = "one" | "two";

const W = 360;
const H = 140;
const KEY_SPAN = [40, 320] as const;

// A point on the chain, u from 0 to 1 (left to right).
function onChain(piece: Piece, u: number) {
  if (piece === "keychain") {
    // Two short chains falling from the key ring: a roof shape.
    return { x: KEY_SPAN[0] + u * (KEY_SPAN[1] - KEY_SPAN[0]), y: 92 - (1 - Math.abs(2 * u - 1)) * 40 };
  }
  const [end, mid] = piece === "necklace" ? [10, 100] : [24, 80];
  return { x: W * u, y: (1 - u) * (1 - u) * end + 2 * (1 - u) * u * mid + u * u * end };
}

function slotU(i: number, n: number, size: number, piece: Piece, sides: Sides) {
  if (sides === "two") return (i + 1) / (n + 1);
  const width = piece === "keychain" ? KEY_SPAN[1] - KEY_SPAN[0] : W;
  const step = Math.min((size * 1.15) / width, 0.9 / n);
  return 0.5 + (i - (n - 1) / 2) * step;
}

// The chosen charms on a neck, a wrist or a key ring. Tap one to select it, drag it along the chain
// (or use the arrow keys) to move it, then remove it.
export function CharmPreview({
  entries,
  gradient,
  tone,
  piece,
  sides,
  onMove,
  onRemove,
  removeLabel,
  removeSelected,
  hint,
}: {
  entries: Entry[];
  gradient: string;
  tone: MetalTone;
  piece: Piece;
  sides: Sides;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  removeLabel: (entry: Entry) => string;
  removeSelected: string;
  hint: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ from: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const sel = selected !== null && selected < entries.length ? selected : null;

  const n = entries.length;
  const size = n > 8 ? 26 : n > 5 ? 32 : 38;
  const edge = metalEdge[tone];
  const line = "currentColor";
  const slots = entries.map((_, i) => onChain(piece, slotU(i, n, size, piece, sides)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= n || to === from) return;
    onMove(from, to);
    setSelected(to);
  };

  const onDown = (i: number) => (e: PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    drag.current = { from: i };
    setSelected(i);
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onDrag = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const box = svgRef.current?.getBoundingClientRect();
    if (!d || !box || n < 2) return;
    const x = ((e.clientX - box.left) * W) / box.width;
    let best = 0;
    slots.forEach((s, j) => {
      if (Math.abs(s.x - x) < Math.abs(slots[best].x - x)) best = j;
    });
    if (best !== d.from) {
      move(d.from, best);
      d.from = best;
    }
  };
  const onKey = (i: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") setSelected(i);
    else if (e.key === "ArrowLeft") move(i, i - 1);
    else if (e.key === "ArrowRight") move(i, i + 1);
    else if (e.key === "Delete" || e.key === "Backspace") {
      onRemove(i);
      setSelected(null);
    } else return;
    e.preventDefault();
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block h-auto max-h-32 w-full touch-none text-ink/25 select-none"
        role="group"
        aria-label=""
        onPointerMove={onDrag}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onPointerDown={() => setSelected(null)}
      >
        {/* The neck, the wrist or the key ring the chain hangs on. */}
        <g fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round">
          {piece === "necklace" && <path d="M130 0C132 34 120 46 60 62M230 0C228 34 240 46 300 62" />}
          {piece === "bracelet" && <path d="M0 6H360M0 78H360" />}
        </g>
        {piece === "keychain" && <circle cx="180" cy="30" r="14" fill="none" stroke={`url(#${gradient}-fill)`} strokeWidth="4" />}

        <path
          d={
            piece === "keychain"
              ? `M${KEY_SPAN[0]} 92L180 52L${KEY_SPAN[1]} 92`
              : piece === "necklace"
                ? `M0 10Q${W / 2} 100 ${W} 10`
                : `M0 24Q${W / 2} 80 ${W} 24`
          }
          fill="none"
          stroke={edge}
          strokeWidth="2.2"
          strokeDasharray="3.2 1.6"
          strokeLinecap="round"
        />

        {entries.map((e, i) => {
          const { x, y } = slots[i];
          const k = size / 24;
          const on = sel === i;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3.2" fill="none" stroke={`url(#${gradient}-fill)`} strokeWidth="1.6" />
              <g
                transform={`translate(${x - size / 2} ${y + 3}) scale(${k})`}
                className="cursor-grab active:cursor-grabbing"
                role="button"
                tabIndex={0}
                aria-label={removeLabel(e)}
                aria-pressed={on}
                onPointerDown={onDown(i)}
                onKeyDown={onKey(i)}
              >
                <title>{removeLabel(e)}</title>
                <rect x="-3" y="-3" width="30" height="30" rx="6" fill={on ? "rgba(217,183,110,0.22)" : "transparent"} stroke={on ? "#c9a45c" : "none"} strokeWidth="1.2" />
                {"shape" in e ? (
                  <CharmArt as="g" shape={e.shape} gradient={gradient} tone={tone} />
                ) : (
                  // The cut-out is drawn with its own outline: whole, centered, nothing cropped.
                  <image href={e.image} x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet" />
                )}
              </g>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex min-h-8 items-center justify-between gap-2 text-xs text-muted">
        <span>{hint}</span>
        {sel !== null && (
          <button
            type="button"
            onClick={() => {
              onRemove(sel);
              setSelected(null);
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden />
            {removeSelected}
          </button>
        )}
      </div>
    </div>
  );
}
