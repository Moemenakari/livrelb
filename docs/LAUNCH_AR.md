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

## 1) حساب Cloudflare + مشروع الـ Worker

1. روح على `dash.cloudflare.com` ← **Sign up** (مجاني) وأكّد الإيميل.
2. من القائمة اليسار: **Workers & Pages** ← **Create** ← **Import a repository (Connect to Git)**.
3. اختار GitHub واسمح لـ Cloudflare يوصل للريبو `livrelb`.
4. إعدادات البناء:
   - **Project name:** `livrelb` (لازم يطابق `name` بـ `wrangler.jsonc`)
   - **Production branch:** `main`
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - **Non-production branch deploy command:** `npx wrangler versions upload` (هيدا اللي بيعطي رابط **preview** لكل فرع)
5. **قبل** أول deploy لازم تنعمل مخازن الكاش (مرة وحدة، من الكمبيوتر):
   ```powershell
   npx wrangler login
   npx wrangler r2 bucket create livrelb-opennext-cache
   npx wrangler d1 create livrelb-tag-cache
   ```
   انسخ `database_id` اللي بيطلع وحطه بـ `wrangler.jsonc` مكان `REPLACE_WITH_D1_DATABASE_ID`، وسوّي commit. (قلّي وأنا بعملها.)

## 2) R2 لصور المنتجات

1. Cloudflare ← **R2 Object Storage** ← **Create bucket** ← الاسم `livrelb-images`.
2. داخل الـ bucket ← **Settings** ← **Public access** ← **Custom Domains** ← **Connect domain** ← اكتب `images.livrelb.com` (بعد ما ينضاف الدومين لـ Cloudflare، الخطوة 5). قبلها فيك تفعّل **R2.dev subdomain** مؤقتاً للتجربة.
3. نفس الصفحة ← **CORS Policy** ← **Add** وحط:
   ```json
   [{"AllowedOrigins":["https://livrelb.com","http://localhost:3000"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type"]}]
   ```
4. **R2 → Manage API Tokens → Create API token** ← الصلاحية **Object Read & Write** على `livrelb-images` ← انسخ: Account ID، Access Key ID، Secret Access Key.

## 3) متغيّرات البيئة (Environment variables)

Cloudflare ← **Workers & Pages** ← `livrelb` ← **Settings** ← **Variables and Secrets** ← **Add**. للأسرار اختار النوع **Secret**.
(وبنفس الأسماء لازم تنحط كمان تحت **Build → Variables** لأن `NEXT_PUBLIC_*` بتنقرا وقت البناء.)

| الاسم | القيمة | النوع |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase ← Project Settings ← Data API | Text (+Build) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase ← API Keys (`sb_publishable_…`) | Text (+Build) |
| `SUPABASE_SECRET_KEY` | Supabase ← API Keys (`sb_secret_…`) | **Secret** |
| `CUSTOMER_COOKIE_SECRET` | نص عشوائي طويل | **Secret** |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | من الخطوة 2.4 | **Secret** |
| `R2_BUCKET` | `livrelb-images` | Text |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://images.livrelb.com` (بلا `/` بالآخر) | Text (+Build) |
| `ANTHROPIC_API_KEY` | `console.anthropic.com` ← API keys (للرسالة الذكية؛ اختياري) | **Secret** |
| `CARD_GATEWAY_URL`, `CARD_GATEWAY_MERCHANT_ID`, `CARD_GATEWAY_API_PASSWORD` | من البنك لما يفتح حساب التاجر | **Secret** |
| `WHISH_API_URL`, `WHISH_MERCHANT_ID`, `WHISH_API_KEY` | من Whish | **Secret** |
| `META_CAPI_TOKEN` | Meta Events Manager ← Conversions API | **Secret** |

أي ميزة مفاتيحها ناقصة بتبقى مخفية، ما في شي بيخرب.

## 4) نشر **Preview** أولاً

1. ادفع الفرع `feat/launch` على GitHub (أنا بعمل الـ push بعد موافقتك).
2. Cloudflare ← `livrelb` ← **Deployments** ← بيطلع deploy للفرع مع رابط `…workers.dev` — هيدا الـ **preview**.
3. افتح الرابط من موبايلك وجرّب: الرئيسية، منتج، السلة، طلب تجريبي، `/en/track`.
4. **الإنتاج (production) ما بنعمله إلا لما تقولي «موافق».**

## 5) الدومين livrelb.com

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
