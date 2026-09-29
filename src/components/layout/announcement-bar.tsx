import { getLocale, getTranslations } from "next-intl/server";
import { announcements } from "@/config/announcements";

// Thin announcement line above the header (restart brief). The track holds
// two identical copies and slides by exactly one copy, so the loop is
// seamless. It scrolls the other way in RTL, pauses on hover, and turns into
// static wrapped text for reduced motion.
export async function AnnouncementBar() {
  const locale = await getLocale();
  const t = await getTranslations("announcements");
  const items = announcements.map((item) => item[locale]);

  const copy = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className={`flex min-w-screen shrink-0 items-center justify-around motion-reduce:w-full motion-reduce:min-w-0 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-y-1 ${hidden ? "motion-reduce:hidden" : ""}`}
    >
      {items.map((text) => (
        <li key={text} className="flex items-center gap-5 px-5 whitespace-nowrap">
          <span aria-hidden className="text-gold">
            ✦
          </span>
          {text}
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label={t("label")}
      className="relative z-[1] overflow-hidden border-b border-line bg-surface py-1.5 text-[12px] tracking-wide text-foreground/80 rtl:tracking-normal"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] rtl:animate-marquee-rtl motion-reduce:w-full motion-reduce:animate-none">
        {copy(false)}
        {copy(true)}
      </div>
    </section>
  );
}
