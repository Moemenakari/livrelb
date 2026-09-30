import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { orderSteps, type OrderStatus } from "@/lib/checkout/types";

// New → Confirmed → In production → Out for delivery → Delivered.
export function OrderStatusSteps({ status }: { status: OrderStatus }) {
  const t = useTranslations("orderStatus");

  if (status === "cancelled") {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        <X className="size-4" strokeWidth={2} aria-hidden />
        {t("cancelled")}
      </p>
    );
  }

  const current = orderSteps.indexOf(status);
  return (
    <ol className="flex flex-col gap-0">
      {orderSteps.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} className="flex gap-3" aria-current={i === current ? "step" : undefined}>
            <span className="flex flex-col items-center">
              <span
                className={`flex size-7 items-center justify-center rounded-full border text-xs ${
                  done ? "border-cedar bg-cedar text-white" : "border-line bg-background text-muted"
                }`}
              >
                {done ? <Check className="size-4" strokeWidth={2} aria-hidden /> : i + 1}
              </span>
              {i < orderSteps.length - 1 && (
                <span className={`h-6 w-px ${i < current ? "bg-cedar" : "bg-line"}`} aria-hidden />
              )}
            </span>
            <span className={`pt-1 text-sm ${i === current ? "font-medium" : done ? "" : "text-muted"}`}>
              {t(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
