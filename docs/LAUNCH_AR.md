# دليل الإطلاق (بالعربي)

> هذا الملف للمعلّم Moemen وNour. الموقع بالإنكليزية والعربية، أما هذا الدليل فبالعربية فقط.

## 0) قبل أي شي: أسرار GitHub للـ backup (دقيقتين)

الـ workflow موجود: `.github/workflows/db-backup.yml`. بدّو سرّين:

1. افتح الريبو على GitHub: `github.com/Moemenakari/livrelb`
2. **Settings** (فوق، آخر تاب) ← بالقائمة اليسار **Secrets and variables** ← **Actions**
3. اضغط **New repository secret** وحط:
   - **Name:** `SUPABASE_DB_URL` — **Secret:** رابط الاتصال من Supabase: **Project → Connect → Connection string → Session pooler** (انسخه وبدّل `[YOUR-PASSWORD]` بكلمة سر الداتابيز).
   - **Name:** `BACKUP_PASSPHRASE` — **Secret:** جملة سرّ طويلة عشوائية (احتفظ بنسخة منها بمكان آمن، بدونها ما فينا نفك الـ backup).
4. اختبره: تاب **Actions** ← **Database backup** ← **Run workflow**. لازم يطلع أخضر.

## 1) Cloudflare: الـ Worker `shop` (الرابط https://shop.livrelb.workers.dev)

**انعمل:** تسجيل الدخول بـ wrangler، قاعدة D1 `livrelb-tag-cache` (والـ id بـ `wrangler.jsonc`)، وbuckets الـ R2 (الكاش والصور).

باقي (من الداشبورد):
1. `dash.cloudflare.com` ← **Workers & Pages** ← **Create application** ← **Import a repository** (Connect to Git).
2. اختار GitHub ← الريبو `Moemenakari/livrelb`.
3. الإعدادات:
   - **Project name:** `shop` (لازم يطابق `name` بـ `wrangler.jsonc`)
   - **Production branch:** `main`
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - **Non-production branch deploy command:** `npx wrangler versions upload` (بيعطي رابط **preview** لكل فرع)
4. الصق المتغيّرات (الخطوة 3) ثم **Save and Deploy**.

## 2) R2 لصور المنتجات

- **انعمل:** bucket `livrelb-media` بوصول عام عبر `https://pub-28576af5ed90403fa07d14555723f2f1.r2.dev` مع CORS لـ `https://shop.livrelb.workers.dev` و`http://localhost:3000`. وbucket الكاش `livrelb-opennext-cache`.
- **مفاتيح الـ API (مرة وحدة، بإيدك):**
  1. Cloudflare ← **R2 Object Storage** ← **Manage API Tokens** (أو **API** ← **Manage R2 API Tokens**) ← **Create API token**.
  2. **Token name:** `livrelb-media`. **Permissions:** **Object Read & Write**. **Specify bucket(s):** `livrelb-media` فقط.
  3. **Create API Token**. بيظهرلك مرة وحدة: **Access Key ID** و**Secret Access Key** (انسخهم فوراً، ما بيرجعوا يظهروا). الـ Account ID: `10f8bfb65cf4d77929e514a34093c1f5`.

## 3) متغيّرات البيئة (Environment variables)

Cloudflare ← **Workers & Pages** ← `shop` ← **Settings** ← **Variables and Secrets** ← **Add**. للأسرار اختار النوع **Secret**.
المتغيّرات اللي اسمها `NEXT_PUBLIC_*` لازم تنحط كمان تحت **Settings ← Build ← Variables and secrets** لأنها بتنقرا وقت البناء.

| الاسم | القيمة | النوع |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://shop.livrelb.workers.dev` | Text (+Build) |
| `NEXT_PUBLIC_SUPABASE_URL` | من `.env.local` | Text (+Build) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | من `.env.local` | Text (+Build) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://pub-28576af5ed90403fa07d14555723f2f1.r2.dev` (بلا `/` بالآخر) | Text (+Build) |
| `SUPABASE_SECRET_KEY` | من `.env.local` | **Secret** |
| `CUSTOMER_COOKIE_SECRET` | من `.env.local` | **Secret** |
| `R2_ACCOUNT_ID` | `10f8bfb65cf4d77929e514a34093c1f5` | Text |
| `R2_ACCESS_KEY_ID` | من الخطوة 2 | **Secret** |
| `R2_SECRET_ACCESS_KEY` | من الخطوة 2 | **Secret** |
| `R2_BUCKET` | `livrelb-media` | Text |
| `ANTHROPIC_API_KEY` | اختياري (الرسالة الذكية) | **Secret** |
| `CARD_GATEWAY_URL`, `CARD_GATEWAY_MERCHANT_ID`, `CARD_GATEWAY_API_PASSWORD` | من البنك لاحقاً | **Secret** |
| `WHISH_API_URL`, `WHISH_MERCHANT_ID`, `WHISH_API_KEY` | من Whish لاحقاً | **Secret** |
| `META_CAPI_TOKEN` | لاحقاً | **Secret** |

وبنفس القيم لازم تنحط بـ `.env.local` عندك (`R2_ACCOUNT_ID` و`R2_ACCESS_KEY_ID` و`R2_SECRET_ACCESS_KEY` و`R2_BUCKET` و`NEXT_PUBLIC_R2_PUBLIC_URL`) ليشتغل رفع الصور محلياً.

## 4) نشر **Preview** أولاً

1. ادفع الفرع `feat/launch` على GitHub (أنا بعمل الـ push بعد موافقتك).
2. Cloudflare ← `livrelb` ← **Deployments** ← بيطلع deploy للفرع مع رابط `…workers.dev` — هيدا الـ **preview**.
3. افتح الرابط من موبايلك وجرّب: الرئيسية، منتج، السلة، طلب تجريبي، `/en/track`.
4. **الإنتاج (production) ما بنعمله إلا لما تقولي «موافق».**

## 5) الدومين (لاحقاً livrelb.com)

1. اشتري `livrelb.com` (من Cloudflare Registrar أو أي مسجّل).
2. إذا اشتريته من غير Cloudflare: Cloudflare ← **Add a domain** ← `livrelb.com` ← الخطة **Free** ← غيّر **Nameservers** عند المسجّل لنفس اللي بيعطيك ياها Cloudflare.
3. `livrelb` Worker ← **Settings** ← **Domains & Routes** ← **Add** ← **Custom domain** ← `livrelb.com` ثم `www.livrelb.com`.
4. **SSL/TLS** ← الوضع **Full (strict)**، وفعّل **Always Use HTTPS** و**Automatic HTTPS Rewrites**. الشهادة بتنعمل لحالها.

## 6) إعدادات Supabase Auth

Supabase ← مشروع `livrelb` ← **Authentication**:

1. **URL Configuration**:
   - **Site URL:** `https://livrelb.com`
   - **Redirect URLs** (Add URL): `https://livrelb.com/**` و`https://www.livrelb.com/**` (و`http://localhost:3000/**` للتطوير).
2. **Sign In / Providers** ← **Email** ← أطفي **Allow new users to sign up** (الموظفين بينعملوا من الأدمن؛ الزبائن بيشتروا بدون حساب). إذا فعّلنا Google للزبائن بتبقى مفعّلة الـ Google فقط.
3. **Attack Protection** ← فعّل **Leaked password protection** (بتطلع كتحذير بالـ advisor).
4. **Sessions** (إذا متاحة بخطتك): حدّد **Time-box** مثلاً 12 ساعة. الموقع أصلاً بيطلّع الموظف بعد ساعتين خمول.

## 7) تسجيل الدخول بـ Google (خطوة خطوة)

1. `console.cloud.google.com` ← **New Project** ← الاسم `LIVRE`.
2. **APIs & Services** ← **OAuth consent screen** ← **External** ← اسم التطبيق `LIVRE`، إيميل الدعم، الدومين `livrelb.com`، **Save**. (Scopes الافتراضية كفاية.) ثم **Publish app**.
3. **Credentials** ← **Create credentials** ← **OAuth client ID** ← النوع **Web application**:
   - **Authorized JavaScript origins:** `https://livrelb.com`
   - **Authorized redirect URIs:** `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (بتلاقي الرابط بـ Supabase ← Authentication ← Providers ← Google).
4. انسخ **Client ID** و**Client secret**.
5. Supabase ← **Authentication** ← **Providers** ← **Google** ← فعّله والصق الـ Client ID والـ Secret ← **Save**.
6. زر Google بالموقع **بيظهر لحاله** بس يتفعّل الـ provider (وقبلها مخفي).

---

# قائمة الإطلاق (للمعلّم وNour)

قبل ما نفتح للزبائن:

- [ ] **صور وأسعار ووصف حقيقي** لكل منتج (من الأدمن ← Products).
- [ ] **رقم واتساب** ورابط **إنستغرام** (الأدمن ← Settings). لحد ما ينحطوا الأزرار مخفية.
- [ ] **حسابات الموظفين الـ 5** + كودهم الشخصي (الأدمن ← Staff) ورابط كل واحد `livrelb.com/r/اسم`.
- [ ] **تقييمات حقيقية** (الأدمن ← Reviews). الـ sample ما بتظهر بالإنتاج.
- [ ] **مراجعة السياسات** (الشحن، الإرجاع، الخصوصية، الشروط) وصفحة «قصتنا» — Nour بيقرأها وبيعدّل الكلام بملف `src/content/pages.ts` ثم بنطفّي `showDraftNotice`.
- [ ] **Meta Pixel ID و GA4 ID** (الأدمن ← Settings ← Analytics) + `META_CAPI_TOKEN` على Cloudflare.
- [ ] **حساب تاجر Whish** (ثم مفاتيح `WHISH_*`) و**حساب تاجر Visa/Mastercard من البنك** (ثم مفاتيح `CARD_GATEWAY_*`)، وتفعيلهم من Settings.
- [ ] **طلب تجريبي من رابط كل موظف** والتأكد إن الطلب بينسب للموظف الصح.
- [ ] تجربة **تتبّع الطلب** وموافقة النقاط: طلب تجريبي ← Delivered ← **Approve points** ← الرسالة والكوبون.
- [ ] **Backup**: سرّا GitHub (الخطوة 0) + تشغيل يدوي ناجح.
- [ ] **Google login** (الخطوة 7) إذا بدنا ياه.
- [ ] مفتاح **ANTHROPIC_API_KEY** إذا بدنا الرسالة الذكية.
- [ ] **التشارمز التركية**: الأدمن ← Turkish charms ← Add photos (صورة + اسم عربي/إنكليزي لكل قطعة)، وسعر التشارم (الافتراضي 13$) من Settings ← Charms page.
- [ ] **رسائل التشارمز**: صفحة Charms ← طلب تجريبي ← بيظهر بالأدمن ← Charm designs.
- [ ] رفع **صور/فيديو الهيرو** (الأدمن ← Promotions ← Homepage slides). بدونهم بيظهر الـ 3D coin.
- [ ] Lighthouse بعد النشر على الدومين الحقيقي.
