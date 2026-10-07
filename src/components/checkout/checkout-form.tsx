"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { whatsappUrl } from "@/config/site";
import { useWhatsappNumber } from "@/lib/use-whatsapp";
import { clearCart, toInput, useCart, useCoupon } from "@/lib/cart";
import { clearSavedCustomer, placeOrder } from "@/lib/checkout/actions";
import type { AreaOption, CheckoutError, HelperOption, SavedCustomer } from "@/lib/checkout/types";
import { formatMoney } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { CartLine } from "@/components/cart/cart-line";
import { CartSummary, CouponField } from "@/components/cart/cart-summary";
import { useQuote } from "@/components/cart/use-quote";
import { TrackOnMount } from "@/components/analytics/analytics";
import { primaryButton } from "@/components/ui/styles";
import { materials } from "@/lib/catalog/materials";
import { CheckoutSteps } from "./checkout-steps";
import { LoginButton } from "@/components/auth/login-dialog";

type Props = {
  areas: AreaOption[];
  helpers: HelperOption[];
  freeShippingOver: number;
  /** The customer this browser is verified as: prefills the form. */
  saved: SavedCustomer | null;
  /** Checkout needs a login first (Settings). */
  loginRequired: boolean;
  /** The shop's WhatsApp number: the order goes there once it is saved. */
  whatsapp: string;
};

type Field = "name" | "phone" | "area" | "address";

const fieldFor: Partial<Record<CheckoutError, Field>> = {
  name_required: "name",
  phone_invalid: "phone",
  area_invalid: "area",
  address_required: "address",
};

const input =
  "h-12 w-full rounded-lg border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted focus:border-gold";
const section = "flex flex-col gap-4";
const legend = "mb-1 font-display text-2xl";

// Checkout (brief §8.4): one page, no account and no email. Prices, the
// discount and delivery come from the server (quote_order) and are
// recalculated again when the order is placed (place_order).
export function CheckoutForm({ areas, helpers, freeShippingOver, saved, loginRequired, whatsapp }: Props) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const router = useRouter();
  const items = useCart();
  const coupon = useCoupon();

  const locale = useLocale();
  // Prefilled from her remembered device or Google account (never from a
  // typed phone number); she can edit everything.
  const [known, setKnown] = useState(saved?.name ? saved : null);
  const [name, setName] = useState(known?.name ?? "");
  const [phone, setPhone] = useState(known?.phone ? localPhone(known.phone) : "");
  const [area, setArea] = useState(known?.area && areas.some((a) => a.slug === known.area) ? known.area : "");
  const [address, setAddress] = useState(known?.address ?? "");
  const [building, setBuilding] = useState(known?.building ?? "");
  const [usePoints, setUsePoints] = useState(false);
  const [clearing, startClearing] = useTransition();
  const [notes, setNotes] = useState("");
  const [helper, setHelper] = useState("");
  // Honeypot: hidden from people, bots fill it; the server drops those orders.
  const [website, setWebsite] = useState("");
  const number = useWhatsappNumber(whatsapp);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [placed, setPlaced] = useState(false);
  const [pending, startTransition] = useTransition();
  // One id per checkout: a double tap or a retry can't create two orders.
  const [requestId] = useState(() => crypto.randomUUID());
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const e164 = normalizePhone(phone);
  const { quote, fresh, failed } = useQuote({
    items: items.map(toInput),
    coupon,
    phone: e164 ?? undefined,
    area: area || undefined,
    usePoints,
  });

  const total = quote?.total ?? items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  const forget = () =>
    startClearing(async () => {
      await clearSavedCustomer();
      setKnown(null);
      setName("");
      setPhone("");
      setArea("");
      setAddress("");
      setBuilding("");
      setUsePoints(false);
    });

  const errorField = error ? fieldFor[error] : undefined;
  const border = (field: Field) => (errorField === field ? "border-red-700" : "border-line");

  const orderMessage = (orderNumber: number) => {
    const who = locale as "en" | "ar";
    const line = (i: (typeof items)[number]) => {
      const what = i.charmNames?.length ? i.charmNames.map((n) => n[who]).join(", ") : i.text;
      const size = i.size ? ` ${i.size} cm` : "";
      return `• ${i.name[who]}${what ? ` (${what})` : ""}${size} ${materials[i.material]?.name[who] ?? ""} ×${i.qty}`.replace(/\s+/g, " ");
    };
    return [
      t("whatsappIntro", { number: orderNumber }),
      ...items.map(line),
      `${t("whatsappTotal")}: ${formatMoney(total)}`,
      t("whatsappCustomer", { name, phone: e164 ?? phone, area: areas.find((a) => a.slug === area)?.name ?? area, address: building ? `${address}, ${building}` : address }),
      notes.trim() && `${t("notes")}: ${notes.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const submit = () => {
    if (submitting.current || pending) return;
    // Quick checks before the round trip; the server checks everything again.
    const local: CheckoutError | null = !name.trim()
      ? "name_required"
      : !e164
        ? "phone_invalid"
        : !area
          ? "area_invalid"
          : !address.trim()
            ? "address_required"
            : null;
    if (local) {
      setError(local);
      formRef.current?.querySelector<HTMLElement>(`[name="${fieldFor[local]}"]`)?.focus();
      return;
    }
    setError(null);
    submitting.current = true;
    startTransition(async () => {
      const result = await placeOrder({
        requestId,
        name,
        phone,
        area,
        address,
        building,
        notes,
        coupon,
        helper,
        usePoints,
        website,
        items: items.map(toInput),
      });
      if (result.ok) {
        setPlaced(true);
        clearCart();
        // The order is saved: its number goes to the shop's WhatsApp (or the employee's) with
        // everything the team needs. Without a WhatsApp number she sees her order page instead.
        if (number) window.location.assign(whatsappUrl(number, orderMessage(result.number)));
        else router.replace(`/order/${result.number}`);
        return;
      }
      submitting.current = false;
      setError(result.error);
      const field = fieldFor[result.error];
      if (field) formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
    });
  };

  if (placed) {
    return (
      <p className="flex items-center justify-center gap-3 py-24 text-muted">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        {t("redirecting")}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <p className="text-muted">{tCart("empty")}</p>
        <Link href="/category/name-necklaces" className={`${primaryButton} px-7 py-3`}>
          {tCart("emptyCta")}
        </Link>
      </div>
    );
  }

  if (loginRequired && !saved?.google) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-8 text-center">
        <Lock className="size-8 text-gold-dark" strokeWidth={1.25} aria-hidden />
        <h2 className="text-3xl">{t("loginTitle")}</h2>
        <p className="text-muted">{t("loginText")}</p>
        <LoginButton label={t("loginButton")} className={`${primaryButton} w-full py-4`} />
      </div>
    );
  }

  const hasLineErrors = fresh && quote?.lines.some((l) => l.error);
  const ready = Boolean(name.trim() && e164 && area && address.trim());

  return (
    <>
    <TrackOnMount event="InitiateCheckout" data={{ value: total, quantity: items.reduce((s, i) => s + i.qty, 0) }} />
    <div className="mb-8 max-w-xl">
      <CheckoutSteps current={ready ? "confirm" : "details"} />
    </div>
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-14"
    >
      <div className="flex flex-col gap-10">
        <div aria-hidden className="pointer-events-none absolute size-px overflow-hidden opacity-0">
          <label htmlFor="co-website">{"Website"}</label>
          <input
            id="co-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        {known ? (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blush px-4 py-3 text-sm" role="status">
            <span>{t("welcomeBack", { name: (known.name ?? "").split(" ")[0] })}</span>
            <button
              type="button"
              onClick={forget}
              disabled={clearing}
              className="text-muted underline underline-offset-4 hover:text-foreground"
            >
              {t("notYou")}
            </button>
          </p>
        ) : saved?.google ? (
          <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">{t("googleSignedIn")}</p>
        ) : null}

        <fieldset className={section}>
          <legend className={legend}>{t("details")}</legend>
          <Labeled label={t("name")} id="co-name" error={errorField === "name" ? t(`errors.${error!}`) : undefined}>
            <input
              id="co-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              required
              aria-invalid={errorField === "name" || undefined}
              className={`${input} ${border("name")}`}
            />
          </Labeled>
          <Labeled
            label={t("phone")}
            id="co-phone"
            hint={t("phoneHint")}
            error={errorField === "phone" ? t(`errors.${error!}`) : undefined}
          >
            <div className={`flex items-center rounded-lg border bg-background focus-within:border-gold ${border("phone")}`} dir="ltr">
              {/* "+961" unless she typed a country code or a leading 0 (03 123 456). */}
              {!/^\s*(\+|0)/.test(phone) && (
                <span className="ps-4 text-base text-muted" aria-hidden>
                  {t("phonePrefix")}
                </span>
              )}
              <input
                id="co-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03 123 456"
                maxLength={25}
                required
                aria-invalid={errorField === "phone" || undefined}
                className="h-12 w-full min-w-0 bg-transparent px-3 text-base outline-none placeholder:text-muted"
              />
            </div>
          </Labeled>
        </fieldset>

        <fieldset className={section}>
          <legend className={legend}>{t("delivery")}</legend>
          <Labeled label={t("area")} id="co-area" error={errorField === "area" ? t(`errors.${error!}`) : undefined}>
            <select
              id="co-area"
              name="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              aria-invalid={errorField === "area" || undefined}
              className={`${input} ${border("area")} ${area ? "" : "text-muted"}`}
            >
              <option value="" disabled>
                {t("areaPlaceholder")}
              </option>
              {areas.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled
            label={t("address")}
            id="co-address"
            error={errorField === "address" ? t(`errors.${error!}`) : undefined}
          >
            <input
              id="co-address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
              placeholder={t("addressPlaceholder")}
              maxLength={400}
              required
              aria-invalid={errorField === "address" || undefined}
              className={`${input} ${border("address")}`}
            />
          </Labeled>
          <Labeled label={t("building")} id="co-building">
            <input
              id="co-building"
              name="building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              maxLength={100}
              className={`${input} border-line`}
            />
          </Labeled>
          <Labeled label={t("notes")} id="co-notes">
            <textarea
              id="co-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-line bg-background px-4 py-3 text-base outline-none placeholder:text-muted focus:border-gold"
            />
          </Labeled>
        </fieldset>

        {helpers.length > 0 && (
          <fieldset className={section}>
            <Labeled label={t("helper")} id="co-helper">
              <select
                id="co-helper"
                name="helper"
                value={helper}
                onChange={(e) => setHelper(e.target.value)}
                className={`${input} border-line`}
              >
                <option value="">{t("helperNone")}</option>
                {helpers.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Labeled>
          </fieldset>
        )}
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-2xl">{t("summary")}</h2>
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item, i) => (
            <CartLine key={item.id} item={item} quoted={fresh ? quote?.lines[i] : undefined} readOnly />
          ))}
        </ul>
        {hasLineErrors && (
          <p className="text-sm text-red-700">
            {t("errors.cart_changed")}{" "}
            <Link href="/cart" className="underline underline-offset-4">
              {tCart("viewCart")}
            </Link>
          </p>
        )}
        <CouponField coupon={coupon} quote={quote} />
        <CartSummary
          quote={quote}
          fresh={fresh}
          failed={failed}
          estimate={items.reduce((s, i) => s + i.unitPrice * i.qty, 0)}
          freeShippingOver={freeShippingOver}
          coupon={coupon}
          couponField={false}
          points={{ on: usePoints, onChange: setUsePoints }}
        />

        {error && !errorField && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {t(`errors.${error}`)}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || Boolean(hasLineErrors)}
          className={`${primaryButton} w-full py-4 text-base disabled:opacity-60`}
        >
          {pending ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              {t("placing")}
            </>
          ) : (
            <>
              <Lock className="size-4.5" strokeWidth={1.5} aria-hidden />
              {t("placeOrder", { total: formatMoney(total) })}
            </>
          )}
        </button>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
          {"🔒"} {t("secure")}
        </p>
      </div>
    </form>
    </>
  );
}

/** +9613123456 -> "03123456" for the phone field (+961 is shown before it). */
function localPhone(e164: string): string {
  return e164.startsWith("+961") ? `0${e164.slice(4)}` : e164;
}

function Labeled({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
