import { Star } from "lucide-react";

// Five stars, filled to the nearest whole star. Pass `label` for screen
// readers ("4.9 out of 5 stars"); without it the stars are decorative.
export function Stars({
  rating,
  label,
  className = "size-4",
}: {
  rating: number;
  label?: string;
  className?: string;
}) {
  const full = Math.round(rating);
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="inline-flex gap-0.5 text-gold"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${className} ${i <= full ? "fill-current" : "text-line"}`}
          strokeWidth={i <= full ? 0 : 1.5}
        />
      ))}
    </span>
  );
}
