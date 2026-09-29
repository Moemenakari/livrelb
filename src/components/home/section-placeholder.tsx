type Props = {
  number: string;
  badge: string;
  title: string;
  description: string;
  className?: string;
};

// Stand-in for a homepage section until the catalog phase builds it. Sized
// roughly like the real section so the page rhythm is already visible.
export function SectionPlaceholder({
  number,
  badge,
  title,
  description,
  className = "",
}: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 lg:px-8">
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center ${className}`}
      >
        <p className="tracking-caps text-[11px] text-gold uppercase">
          {number} · {badge}
        </p>
        <h2 className="text-xl sm:text-2xl">{title}</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
      </div>
    </section>
  );
}
