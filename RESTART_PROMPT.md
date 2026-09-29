We are restarting LIVRE from scratch in a clean project. Forget the previous design (the dark theme and the redesign attempt). Read `CLAUDE.md` again: section 2 (light theme) is the source of truth.

**Repo:** https://github.com/Moemenakari/livrelb (empty). Create the new project in a new folder named `livrelb`, then add this repo as `origin` and push `main`. After that, work on branches. You may look at the old `kittynecklace` project only to reuse the working i18n (en/ar + RTL), Supabase helpers, and the message-check script. Don't copy its styles.

## The goal of this phase
Build the storefront look and the two signature features before anything else. The site must look like a real high-end jewelry boutique that makes people want to buy. The reference for layout, spacing, and feel is **onecklace.com**. Study its homepage, the Name Necklaces category page, and a product page (e.g. /cursive-name-necklace/). Match the **quality, structure, and UX**, but use our own brand, colors, text, and placeholder images. Never copy their logo, photos, or copy text.

## Look & feel
- **White and ivory backgrounds.** Cedar green (#2F5D3A) for the promo bar, badges, and the logo cedar. Gold (#B08D57) for prices, selected states, and small details. Black only for small badges (SALE / BEST SELLER), primary buttons, and the footer.
- **Fonts:** Cormorant Garamond for headings, Jost for body text. For Arabic, Noto Naskh Arabic for headings and IBM Plex Sans Arabic for body.
- **Header:** thin announcement line ("Design Your Name Necklace") above the header. White header: logo on the left, small spaced uppercase menu (NAME NECKLACES, NECKLACES, BRACELETS, MEN'S JEWELRY, RINGS, EARRINGS, LIRA COLLECTION, GIFTS, BESTSELLERS, NEW), search / account / cart icons on the right.
- **Promo bar** under the header, in cedar green: "Your Story, Your Jewelry ✨ 15% OFF · Code: STORY15". Text comes from config.
- Clean product cards:
  - SALE / BEST SELLER badges.
  - An image carousel with dots.
  - Material color dots.
  - The name.
  - The old price crossed out next to the new price.
  - "✓ Free shipping".
- Floating WhatsApp button at the bottom right.
- Large, ready-to-swap image placeholders everywhere. The photos will be the hero of the site.

## Pages to build now (with static sample data)
1. **Homepage** (follow brief 8.1):
   - Big promo hero.
   - **3D Lira coin** section.
   - Shop by Style image mosaic.
   - Best Sellers grid.
   - 01 / 02 / 03 steps.
   - Loved by Customers reviews.
   - A short founder quote.
   - "Why LIVRE" with 4 cards.
   - A "Create something personal" call to action with the payment methods (Cash on Delivery, Whish).
   - Footer with newsletter/WhatsApp.
2. **Category page: Name Necklaces**:
   - Trust strip: Free Shipping · Handcrafted to Order · Secure Payment · Delivery 2–7 days.
   - Breadcrumbs.
   - Centered title and description.
   - A row of round style thumbnails.
   - Product grid with the cards described above.
3. **Product page: Cursive Name Necklace**, the most important page:
   - Image gallery on the left.
   - On the right: title, rating stars, old and new price with a "-26% OFF" pill.
   - **Choose Material**: cards with a colored circle, name, and price. Options: Sterling Silver, 18K Gold Plating, Rose Gold Plating, 14K Gold, 14K White Gold.
   - **Please write name / word** input.
   - **Choose chain length** cards: 35 / 40 / 45 / 50 / 55 cm, with a size guide link.
   - Pendant ring option: one ring in the center, or two rings on the sides.
   - Add Gift Box & Bag (+$5).
   - Add to cart.
   - WhatsApp question link.
   - Tabs: Product Description / Size & Materials / Shipping Information.
   - You May Also Like.
   - Recently Viewed.
   - Reviews.

## Signature feature 1: live name preview (like Onecklace, but better)
- When the customer types in "Please write name / word", the name appears instantly as a necklace preview:
  - Next to the input as a small preview.
  - Big on the main product image area: an overlay on the first gallery slide.
- Render it as SVG. The name is written in the product's script font with a **metallic gradient fill** that follows the chosen material:
  - Gold: warm gold gradient.
  - Silver / white gold: cool silver gradient.
  - Rose gold: pink gold gradient.
- Add a soft shadow and a light shine so it looks like real metal, not flat text.
- Draw a thin chain coming from the jump rings. The rings follow the "one ring center / two rings sides" choice.
- Empty input shows a placeholder name ("Yourname" in English, "اسمك" in Arabic). Limit the name to 10 characters and support Arabic names.
- Changing the material or the ring option updates the preview immediately. It must be smooth on phones.
- Build it as one reusable component (`<NamePreview text material font rings />`). We will reuse it in the homepage hero mini-preview and on category cards.

## Signature feature 2: real 3D Lira coin (NOT an image)
- Build it with React Three Fiber + drei. The coin is a real 3D object (a thin cylinder with a beaded rim).
- For the faces, use `assets/lira-coin-1975.jpg`: the cedar side on the front, the "1 LIVRE" wreath side on the back. Add a bump/normal map made from the photo so the relief catches the light.
- Silver metallic material with an environment map, so it shines.
- **Intro:** on page load, the coin spins fast for about 2 seconds with a light sweep, then slows down.
- **On scroll:** the coin stays in the background of the homepage, drifting left and right and rotating slowly.
- It must stay light:
  - Lazy-load it.
  - Pause it when it's off screen.
  - Show a static image fallback only when reduced motion is on or WebGL is unavailable.

## Rules
- Mobile first. Check every page at 375px, in English and Arabic (RTL).
- All text goes through the en/ar message files.
- Use small commits and push to GitHub.
- When done, stop. Send me screenshots of the homepage, category page, and product page (mobile + desktop), plus a short screen recording of typing a name and of the coin animation.
