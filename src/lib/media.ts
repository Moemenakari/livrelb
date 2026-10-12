// Product photos are uploaded in TWO sizes by the admin (src/components/admin/media-manager.tsx), both WebP and
// made in the browser before the upload: the product-page size at <folder>/<id>.webp (what product_media.url
// stores) and the card size, much smaller, at <folder>/<id>-card.webp. Both are served straight from R2: the
// shop never asks the Worker or /_next/image (next.config.ts images.unoptimized) for a photo.

/** Longest side, in pixels, of the two sizes. */
export const PRODUCT_PX = 1200;
export const CARD_PX = 600;

const CARD_SUFFIX = "-card";

/** The card-size address of a product photo (the same address when it is not a WebP made by the admin). */
export function cardUrl(url: string): string {
  return /\.webp$/i.test(url) && !new RegExp(`${CARD_SUFFIX}\\.webp$`, "i").test(url) ? url.replace(/\.webp$/i, `${CARD_SUFFIX}.webp`) : url;
}

/** The key (file name) of the card size, for the one that `createUploadUrl` makes. */
export const cardKey = (key: string) => key.replace(/\.webp$/i, `${CARD_SUFFIX}.webp`);
