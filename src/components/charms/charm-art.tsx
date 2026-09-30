import { metalEdge, metalStops } from "@/components/preview/metal";
import { isGlyph, type CharmShape } from "@/lib/charms";
import type { MetalTone } from "@/lib/catalog/types";

// A charm drawn in metal. Icons live in a 24 x 24 box; the gradient is in
// that same box (userSpaceOnUse), so straight lines get the shine too.

/** <defs> for one metal, once per page: `${id}-fill`. */
export function CharmDefs({ id, tone }: { id: string; tone: MetalTone }) {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <linearGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="24">
          {metalStops[tone].map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
    </svg>
  );
}

type Props = {
  shape: CharmShape;
  /** id of the page's <CharmDefs>. */
  gradient: string;
  tone: MetalTone;
  className?: string;
  /** Standalone <svg> (list / tray) or a <g> drawn inside a bigger svg. */
  as?: "svg" | "g";
};

function Drawing({ shape, gradient, tone }: Omit<Props, "className" | "as">) {
  const fill = `url(#${gradient}-fill)`;
  if (isGlyph(shape)) {
    const arabic = shape.group === "arabic";
    return (
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={arabic ? 19 : 20}
        fontWeight={600}
        fill={fill}
        stroke={metalEdge[tone]}
        strokeWidth="0.45"
        paintOrder="stroke"
        style={{ fontFamily: arabic ? "var(--font-naskh), serif" : "var(--font-cormorant), serif" }}
      >
        {shape.glyph}
      </text>
    );
  }
  return (
    <g fill="none" stroke={fill} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      {shape.nodes.map(([tag, attrs], i) => {
        const Tag = tag as "path";
        return <Tag key={i} {...attrs} />;
      })}
    </g>
  );
}

export function CharmArt({ shape, gradient, tone, className = "size-10", as = "svg" }: Props) {
  if (as === "g") return <Drawing shape={shape} gradient={gradient} tone={tone} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${className} overflow-visible drop-shadow-[0_1px_1px_rgba(60,40,10,0.35)]`}>
      <Drawing shape={shape} gradient={gradient} tone={tone} />
    </svg>
  );
}
