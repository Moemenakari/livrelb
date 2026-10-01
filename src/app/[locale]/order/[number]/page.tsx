import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarClock, MessageCircle, PackageSearch, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";
import { whatsappUrl } from "@/config/site";
import { findProduct, getCatalog } from "@/lib/catalog";
import { fonts, isFontKey, materials } from "@/lib/catalog/materials";
import { pieceOf, type MaterialKey } from "@/lib/catalog/types";
import { ORDERS_COOKIE } from "@/lib/checkout/cookies";
import { orderPoints } from "@/lib/checkout/points";
import { formatPrice } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/public";
import { CheckoutSteps } from "@/components/checkout/checkout-steps";
import { TrackingPanel } from "@/components/checkout/tracking-panel";
import { orderTracking } from "@/lib/checkout/tracking";
import { WhishPayment } from "@/components/checkout/whish-payment";
import { whish } from "@/lib/payments/whish";
import { cardConfigured } from "@/lib/payments/card";
import { TrackOnMount } from "@/components/analytics/analytics";
import { CardPayment } from "@/components/checkout/card-payment";
import { ProductArt } from "@/components/product/product-art";
import { GiftBoxNote } from "@/components/product/gift-box-note";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

export async function generateMetadata({ params }: PageProps<"/[locale]/order/[number]">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { number } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return { title: t("number", { number }), robots: { index: false } };
}

const dollars = (cents: number) => cents / 100;

// Thank-you page (brief §8.4). Only the browser that placed the order sees
// it (its id is in an httpOnly cookie); anyone else is sent to "Track my
// order", which asks for the phone number.
export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/order/[number]">) {
  const locale = await resolveLocale(params);
  const { number } = await params;
  const paidFlag = (await searchParams).paid;
  if (!/^\d{1,12}$/.test(number) || !isSupabaseConfigured()) notFound();
  const db = createAdminClient();
  if (!db) notFound();

  const t = await getTranslations("order");
  const tCart = await getTranslations("cart");
  const tCheckout = await getTranslations("checkout");
  const tProduct = await getTranslations("product");

  const mine = ((await cookies()).get(ORDERS_COOKIE)?.value ?? "").split(".");
  const [{ data: order }, { data: settings }, catalog] = await Promise.all([
    db
      .from("orders")
      .select(
        `id, number, status, created_at, carrier, tracking_number, customer_name, phone, payment_method, subtotal_cents, discount_cents,
         points_used, points_discount_cents, delivery_fee_cents, total_cents,
         order_items (id, product_slug, product_name, custom_text, size_kind, size_value,
           chain_connection, qty, line_total_cents, materials (key), fonts (key))`,
      )
      .eq("number", Number(number))
      .maybeSingle(),
    db.from("site_settings").select("delivery_days_min, delivery_days_max").eq("id", 1).maybeSingle(),
    getCatalog(),
  ]);

  if (!order || !mine.includes(order.id)) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-24 text-center">
        <PackageSearch className="size-10 text-gold" strokeWidth={1} aria-hidden />
        <h1 className="text-4xl">{t("number", { number })}</h1>
        <p className="text-muted">{t("locked")}</p>
        <Link href={{ pathname: "/track", query: { number } }} className={`${primaryButton} px-7 py-3`}>
          {t("track")}
        </Link>
      </div>
    );
  }

  const [points, tracking] = await Promise.all([
    orderPoints(db, order),
    orderTracking(db, order, locale, { min: settings?.delivery_days_min ?? 2, max: settings?.delivery_days_max ?? 7 }),
  ]);
  const whatsapp = catalog.settings.whatsappNumber;
  const firstName = order.customer_name.split(/\s+/)[0];
  const row = "flex items-center justify-between gap-4";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pt-10 pb-20 lg:px-8 lg:pt-14">
      <div className="mx-auto w-full max-w-xl">
        <CheckoutSteps current="done" />
      </div>
      <TrackOnMount
        event="Purchase"
        once={`purchase-${order.number}`}
        data={{ value: dollars(order.total_cents), eventId: `order-${order.number}`, phone: order.phone }}
      />
      <header className="flex flex-col items-center gap-3 text-center">
        <p className="rounded-full bg-cedar px-4 py-1.5 text-sm font-medium text-white">
          {t("number", { number: order.number })}
        </p>
        <h1 className="text-4xl lg:text-5xl">{t("title", { name: firstName })}</h1>
        <p className="max-w-md text-muted">{t("subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-line p-4">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-gold-dark" strokeWidth={1.5} aria-hidden />
          <p className="text-sm">
            {t("deliveryEstimate", {
              min: settings?.delivery_days_min ?? 2,
              max: settings?.delivery_days_max ?? 7,
            })}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-line p-4 text-sm">
          <p className="font-medium">{t("payment", { method: tCheckout(order.payment_method) })}</p>
          <p className="text-muted">
            {order.payment_method === "whish"
              ? tCheckout("whishHint")
              : t("codNote", { total: formatPrice(dollars(order.total_cents)) })}
          </p>
        </div>
      </div>

      {order.payment_method === "card" && order.status !== "cancelled" && catalog.settings.cardOnline && cardConfigured() && (
        <CardPayment orderNumber={order.number} paid={paidFlag === "1" ? true : paidFlag === "0" ? false : null} />
      )}

      {order.payment_method === "whish" &&
        order.status !== "cancelled" &&
        catalog.settings.whishOnline &&
        whish.isConfigured() && <WhishPayment orderNumber={order.number} total={dollars(order.total_cents)} />}

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">{t("itemsTitle")}</h2>
        <ul className="divide-y divide-line border-y border-line">
          {order.order_items.map((item) => {
            const product = findProduct(catalog, item.product_slug);
            const material = (item.materials?.key ?? "gold") as MaterialKey;
            const font = isFontKey(item.fonts?.key) ? item.fonts.key : undefined;
            const size =
              item.size_value === null
                ? null
                : item.size_kind === "ring"
                  ? tProduct("usSize", { value: Number(item.size_value) })
                  : tProduct("cm", { value: Number(item.size_value) });
            const details = [
              materials[material]?.name[locale],
              font && tCart("font", { font: fonts[font].name[locale] }),
              size && tCart(item.size_kind ?? "chain", { size }),
              item.chain_connection &&
                tCart("connection", { connection: tProduct(`connection.${item.chain_connection}`) }),
            ].filter(Boolean);
            return (
              <li key={item.id} className="flex gap-3 py-4">
                <div className="flex size-20 shrink-0 items-center overflow-hidden rounded-lg bg-surface">
                  {product && (
                    <ProductArt
                      art={product.art}
                      material={material}
                      text={item.custom_text ?? undefined}
                      font={font}
                      connection={item.chain_connection ?? undefined}
                      piece={pieceOf(item.size_kind ?? undefined)}
                      aspect="square"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] leading-snug">{product?.name[locale] ?? item.product_name}</p>
                      {item.custom_text && (
                        <p className="truncate text-sm font-medium" dir="auto">
                          {item.custom_text}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium text-gold-dark">
                      {formatPrice(dollars(item.line_total_cents ?? 0))}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{details.join(" · ")}</p>
                  <p className="text-xs text-muted">{tCart("qtyValue", { qty: item.qty })}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <GiftBoxNote />
        <dl className="flex flex-col gap-2 text-sm">
          <div className={row}>
            <dt className="text-muted">{tCart("subtotal")}</dt>
            <dd>{formatPrice(dollars(order.subtotal_cents))}</dd>
          </div>
          {order.discount_cents > 0 && (
            <div className={row}>
              <dt className="text-muted">{tCart("discount")}</dt>
              <dd className="text-cedar">{"-"}{formatPrice(dollars(order.discount_cents))}</dd>
            </div>
          )}
          {order.points_discount_cents > 0 && (
            <div className={row}>
              <dt className="text-muted">{tCart("pointsDiscount", { points: order.points_used })}</dt>
              <dd className="text-cedar">
                {"-"}
                {formatPrice(dollars(order.points_discount_cents))}
              </dd>
            </div>
          )}
          <div className={row}>
            <dt className="text-muted">{tCart("delivery")}</dt>
            <dd>
              {order.delivery_fee_cents === 0 ? (
                <span className="font-medium text-cedar">{tCart("deliveryFree")}</span>
              ) : (
                formatPrice(dollars(order.delivery_fee_cents))
              )}
            </dd>
          </div>
          <div className={`${row} border-t border-line pt-3 text-base font-medium`}>
            <dt>{tCart("total")}</dt>
            <dd>{formatPrice(dollars(order.total_cents))}</dd>
          </div>
        </dl>
      </section>

      {(points.toEarn > 0 || points.earned > 0) && (
        <p className="flex items-center gap-3 rounded-xl bg-gold/10 px-4 py-3 text-sm">
          <Sparkles className="size-5 shrink-0 text-gold-dark" strokeWidth={1.5} aria-hidden />
          {points.earned > 0
            ? t("pointsEarned", { points: points.earned })
            : t("pointsToEarn", { points: points.toEarn })}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">{t("statusTitle")}</h2>
        <TrackingPanel status={order.status} tracking={tracking} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {whatsapp && (
          <a
            href={whatsappUrl(whatsapp, t("whatsappMessage", { number: order.number }))}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButton} flex-1 bg-cedar hover:bg-cedar/90`}
          >
            <MessageCircle className="size-4.5" strokeWidth={1.5} aria-hidden />
            {t("whatsapp")}
          </a>
        )}
        <Link href={{ pathname: "/track", query: { number: order.number } }} className={`${secondaryButton} flex-1`}>
          {t("track")}
        </Link>
        <Link href="/" className={`${secondaryButton} flex-1 border-line`}>
          {t("continue")}
        </Link>
      </div>
    </div>
  );
}
