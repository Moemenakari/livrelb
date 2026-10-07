// Shapes of the admin's Home page (kept out of the "use server" file, which may only export functions).

/** The homepage sections the owner can edit (keys of home_sections). */
export const homeSectionKeys = ["lira", "shop_by_style", "best_sellers", "steps", "new_arrivals", "try_picture", "create"] as const;
export type HomeSectionKey = (typeof homeSectionKeys)[number];

export type HomeSectionInput = {
  key: HomeSectionKey;
  visible: boolean;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  /** A page of this site for the section's button; empty = its default. */
  ctaHref: string;
};

/** The three "How it works" steps; empty text = the default text. */
export const STEP_COUNT = 3;
export type HomeStepInput = { titleEn: string; titleAr: string; textEn: string; textAr: string };

export type HomeTileInput = { slug: string; show: boolean; imageUrl: string };

export type HomePageInput = {
  sections: HomeSectionInput[];
  /** Lira Collection products picked by hand, in order (slugs). */
  liraSlugs: string[];
  /** All tile categories; the order of the list is the order on the homepage. */
  tiles: HomeTileInput[];
  /** Best sellers, in order (slugs). */
  bestSellers: string[];
  /** The "How it works" steps, in order. */
  steps: HomeStepInput[];
  /** The shop menu in order: category slugs and "charms". Empty = leave it as it is. */
  menu: string[];
};
