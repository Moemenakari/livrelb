import { useTranslations } from "next-intl";

// Every order ships in the LIVRE gift box, free: a highlight, not an option
// (product page and cart).
export function GiftBoxNote({ className = "" }: { className?: string }) {
  const t = useTranslations("giftBox");
  return (
    <p className={`flex items-center gap-3 rounded-lg bg-blush px-4 py-3 text-sm ${className}`}>
      <span aria-hidden className="text-lg leading-none">
        🎁
      </span>
      <span>
        {t.rich("free", { strong: (chunks) => <strong className="font-medium text-gold-dark">{chunks}</strong> })}
      </span>
    </p>
  );
}
