import { Banknote, Check, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

const steps = ["bag", "details", "confirm", "done"] as const;
export type CheckoutStep = (typeof steps)[number];

// Bag → Details → Confirm → Done, at the top of the checkout and the
// order confirmation (Phase 4 A3).
export function CheckoutSteps({ current }: { current: CheckoutStep }) {
  const t = useTranslations("checkout");
  const at = steps.indexOf(current);
  return (
    <ol aria-label={t("stepsLabel")} className="flex items-center gap-2 text-[12px] sm:text-sm">
      {steps.map((step, i) => {
        const done = i < at || current === "done";
        const now = i === at;
        return (
          <li key={step} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={now ? "step" : undefined}>
            <span className="flex items-center gap-1.5">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                  done
                    ? "border-cedar bg-cedar text-white"
                    : now
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-background text-muted"
                }`}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : i + 1}
              </span>
              <span className={now ? "font-medium" : done ? "" : "text-muted"}>{t(`steps.${step}`)}</span>
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden className={`h-px flex-1 ${i < at ? "bg-cedar" : "bg-line"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function PaymentBadges() {
  const t = useTranslations("checkout");
  const tPay = useTranslations("payment");
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span>{t("weAccept")}</span>
      <span className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2 py-1 text-foreground">
        <Banknote className="size-3.5" strokeWidth={1.5} aria-hidden />
        {tPay("cod")}
      </span>
      <span className="inline-flex items-center gap-1 rounded-md border border-line bg-background px-2 py-1 text-foreground">
        <Smartphone className="size-3.5" strokeWidth={1.5} aria-hidden />
        {tPay("whish")}
      </span>
    </p>
  );
}
