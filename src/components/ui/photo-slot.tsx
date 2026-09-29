import { Camera } from "lucide-react";

const tones = {
  ivory: "bg-surface",
  beige: "bg-beige",
  blush: "bg-blush",
} as const;

type Props = {
  /** What photo goes here, for the owner ("Model photo"). */
  label: string;
  tone?: keyof typeof tones;
  className?: string;
};

// A ready-to-swap slot where a real photo will go (restart brief: "large,
// ready-to-swap image placeholders everywhere"). Replace with next/image
// once the photo exists.
export function PhotoSlot({ label, tone = "beige", className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-muted/70 ${tones[tone]} ${className}`}
    >
      <Camera className="size-6" strokeWidth={1.25} aria-hidden />
      <span className="tracking-caps text-[10px] uppercase">{label}</span>
    </div>
  );
}
