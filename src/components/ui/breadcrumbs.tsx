import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type Crumb = { label: string; href?: string };

// Home › Necklaces › Name Necklaces. The last crumb is the current page.
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1 text-[11.5px] text-muted sm:text-[12.5px]">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="size-3 rtl:-scale-x-100" strokeWidth={1.5} aria-hidden />
            )}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
