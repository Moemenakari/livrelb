"use client";

import type { ComponentProps } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../messages/en.json";
import { NamePreview } from "@/components/preview/name-preview";
import { ProductArt } from "@/components/product/product-art";

// The storefront's live name preview and product drawings, inside the
// English-only admin (they only need the preview's own messages).
const messages = { namePreview: en.namePreview };

export function AdminPreview(props: Omit<ComponentProps<typeof NamePreview>, "aspect">) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <NamePreview aspect="wide" {...props} />
    </NextIntlClientProvider>
  );
}

export function AdminArt(props: ComponentProps<typeof ProductArt>) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ProductArt {...props} />
    </NextIntlClientProvider>
  );
}
