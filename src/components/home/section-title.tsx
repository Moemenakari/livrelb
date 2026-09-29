import type { ReactNode } from "react";
import { eyebrow as eyebrowClass } from "@/components/ui/styles";

// Centered section heading: small gold eyebrow, serif title, muted line.
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col items-center gap-3 text-center lg:mb-12">
      {eyebrow && <p className={eyebrowClass}>{eyebrow}</p>}
      <h2 className="text-4xl lg:text-5xl">{title}</h2>
      {subtitle && <p className="max-w-xl text-muted">{subtitle}</p>}
      {children}
    </div>
  );
}
