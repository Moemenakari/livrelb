"use server";

import { authorize, run, type ActionResult } from "./auth";

// "Where does this product go?" The team types the name (and maybe a line of
// description); this suggests the shop categories (the pages the piece shows
// under). Keyword rules always work and cost nothing; when ANTHROPIC_API_KEY
// is set, Claude gives the suggestion (checked against the real categories),
// and the rules answer if it is off or fails.

export type CategorySuggestion = { slugs: string[]; reason: string; ai: boolean };

type Input = { nameEn: string; summaryEn: string; descriptionEn: string; personalization: string };

const MODEL = "claude-haiku-4-5-20251001";
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// [pattern, category slugs it points to]. The first slug of the first match is the main one.
const rules: [RegExp, string[]][] = [
  [/\b(lira|livre|coin|1975|cedar coin)\b|ليرة|ليرات/i, ["lira-collection"]],
  [/\b(500|250)\b/, ["lira-500-250"]],
  [/\b(ring|signet|band|stacking)\b|خاتم|خواتم/i, ["rings"]],
  [/\b(earring|earrings|hoop|hoops|huggie|huggies|stud|studs|pearl)\b|قرط|أقراط|حلق/i, ["earrings"]],
  [/\b(bracelet|bangle|anklet|cuff)\b|سوار|أساور/i, ["bracelets"]],
  [/\b(name|names|initial|letter)\b.*\b(necklace|pendant|chain)\b|\b(necklace|pendant|chain)\b.*\b(name|names|initial|letter)\b|اسم|أسماء/i, ["name-necklaces", "necklaces"]],
  [/\b(necklace|pendant|chain|choker|cedar)\b|قلادة|سلسلة|عقد/i, ["necklaces"]],
  [/\b(men|man|mens|men's|his|him|male|groom)\b|رجال|للرجال/i, ["mens-jewelry"]],
  [/\b(gift|gifts|set|box|birthday|mother|valentine|anniversary)\b|هدية|هدايا/i, ["gifts"]],
];

function byRules(input: Input, allowed: Set<string>): CategorySuggestion {
  // Only the name and the tagline: descriptions mention "gift box", "coin"... on almost every piece.
  const text = `${input.nameEn} ${input.summaryEn}`;
  const slugs: string[] = [];
  for (const [pattern, targets] of rules) {
    if (!pattern.test(text)) continue;
    for (const slug of targets) if (allowed.has(slug) && !slugs.includes(slug)) slugs.push(slug);
  }
  if (slugs.length === 0 && input.personalization === "name" && allowed.has("name-necklaces")) slugs.push("name-necklaces");
  const trimmed = slugs.slice(0, 3);
  return {
    slugs: trimmed,
    reason: trimmed.length ? "From the words in the name." : "No clear match: pick the page by hand.",
    ai: false,
  };
}

export async function suggestCategories(input: Input): Promise<ActionResult<CategorySuggestion>> {
  return run(async () => {
    const { db } = await authorize("products.edit");
    const nameEn = clip(input.nameEn, 120);
    if (!nameEn) return { slugs: [], reason: "Write the product name first.", ai: false };
    const clean: Input = {
      nameEn,
      summaryEn: clip(input.summaryEn, 300),
      descriptionEn: clip(input.descriptionEn, 1500),
      personalization: clip(input.personalization, 12),
    };

    // Only normal categories: Best sellers and New arrivals follow the badges.
    const { data } = await db.from("categories").select("slug, name_en, description_en, rule").is("rule", null).order("sort_order");
    const categories = data ?? [];
    const allowed = new Set(categories.map((c) => c.slug));
    const fallback = byRules(clean, allowed);

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key || categories.length === 0) return fallback;

    const list = categories.map((c) => `- ${c.slug}: ${c.name_en}. ${c.description_en.slice(0, 120)}`).join("\n");
    const prompt = `You file jewelry products of LIVRE, a Lebanese personalized jewelry shop, under shop categories (the pages of the website).
Categories:
${list}

Product:
Name: ${clean.nameEn}
Tagline: ${clean.summaryEn || "-"}
Description: ${clean.descriptionEn || "-"}
Customer personalizes it with: ${clean.personalization || "nothing"}

Pick 1 to 3 category slugs from the list, the best one first (a name necklace goes under "name-necklaces" and "necklaces"; add "gifts" or "mens-jewelry" only when the product is clearly that). Use only slugs from the list.
Answer with JSON only: {"categories":["slug"],"reason":"one short sentence"}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: 200, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return fallback;
      const body = (await res.json()) as { content?: { type: string; text?: string }[] };
      const raw = body.content?.find((c) => c.type === "text")?.text ?? "";
      const json = /\{[\s\S]*\}/.exec(raw)?.[0];
      if (!json) return fallback;
      const parsed = JSON.parse(json) as { categories?: unknown; reason?: unknown };
      const slugs = (Array.isArray(parsed.categories) ? parsed.categories : [])
        .filter((s): s is string => typeof s === "string" && allowed.has(s))
        .filter((s, i, all) => all.indexOf(s) === i)
        .slice(0, 3);
      if (slugs.length === 0) return fallback;
      return { slugs, reason: clip(parsed.reason, 200) || "Suggested by AI.", ai: true };
    } catch {
      return fallback;
    }
  });
}
