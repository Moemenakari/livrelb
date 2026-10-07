import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/resolve-locale";
import { loadAccount } from "@/lib/checkout/account";
import { AccountTabs, type AccountTab } from "@/components/account/account-tabs";
import { LoginButton } from "@/components/auth/login-dialog";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false } };
}

// My account: three segments to swipe between (Last order, My points, Track my
// orders), for the customer this browser is signed in as. Nobody signed in: Google
// sign-in, or tracking with an order number and phone.
export default async function AccountPage({ params, searchParams }: PageProps<"/[locale]/account">) {
  const locale = await resolveLocale(params);
  const t = await getTranslations("account");
  const { tab, order } = await searchParams;
  const initial: AccountTab = tab === "points" || tab === "track" ? tab : "last";
  const openOrder = typeof order === "string" && /^\d{1,12}$/.test(order) ? Number(order) : null;

  const account = await loadAccount(locale);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 pt-8 pb-20 lg:pt-12">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-4xl lg:text-5xl">{account?.name ? t("hello", { name: account.name.split(/\s+/)[0] }) : t("title")}</h1>
      </header>
      {account ? (
        <AccountTabs account={account} initial={openOrder !== null && !tab ? "track" : initial} openOrder={openOrder} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center">
          <UserRound className="size-8 text-gold-dark" strokeWidth={1.25} aria-hidden />
          <h2 className="text-2xl">{t("signInTitle")}</h2>
          <p className="text-muted">{t("signInText")}</p>
          <LoginButton label={t("signIn")} className={`${primaryButton} w-full py-4`} />
          <Link href="/track" className={`${secondaryButton} w-full`}>
            {t("trackWithPhone")}
          </Link>
        </div>
      )}
    </div>
  );
}
