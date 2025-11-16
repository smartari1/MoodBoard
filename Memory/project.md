מעולה—נלך “מלמטה למעלה”: תשתיות, הרשאות, נתונים וניהול—ואז “מנוע סגנונות–צבעים–חומרים–חדרים” שניתן להתאמה לכל פרויקט. שמרתי על הסטאק שביקשת, עם התאמות נקודתיות כדי למנוע התנגשויות.

# ארכיטקטורה מוצעת (MVP→סקייל)

* **Frontend**: Next.js (App Router) על Vercel • React + Mantine (RTL מובנה) • Framer Motion לאנימציות • Icons: StreamlineHQ + Phosphor.
* **Brand Colors**: ✅ מיושם - Background #f7f7ed (קרם בהיר) • Logo/Titles #df2538 (אדום MoodB) • Text #000000 (שחור) • Inverse #ffffff (לבן). כולל theme provider עם Mantine, design tokens ב-CSS variables, וכל הכפתורים והאלמנטים מוגדרים עם צבעי המותג.
* **State/Data**: TanStack Query (server-state) + Zustand (UI local) • טפסים: React Hook Form + `@hookform/resolvers/zod` • סכימות: Zod.
* **Backend**: Next.js API Routes (בהמשך ניתן לפצל ל־NestJS מודולרי למיקרו-שירותים).
* **DB**: MongoDB Atlas (Prisma MongoDB adapter או Mongoose—ממליץ Prisma לטיוב סכימות/Types).
* **Auth**: NextAuth.js (Auth.js) עם Google OAuth Provider ✅ מיושם. מערכת אימות עצמאית עם תמיכה מלאה ב-OAuth, sessions, ו-RBAC. כולל יצירת ארגון אוטומטית בהרשמה, middleware לאימות, וניהול sessions עם database strategy.
* **Storage**: Google Cloud Storage (assets, תמונות חומרים/מדיה לקוח) + Public URLs • CDN דרך Google Cloud CDN.
* **Domain/DNS**: Cloudflare.
* **i18n**: `next-intl` ✅ מיושם (עברית כברירת מחדל, RTL/LTR דינמי, מוכנות לריבוי שפות). כולל תמיכה בגופנים עבריים (Heebo, Assistant), תרגומים לדפי אימות, וניווט דינמי לפי locale.
* **חיפוש**: Meilisearch/Typesense (Self-host) או Atlas Search (בשלב שני).
* **תשלומים** (אופציונלי בהמשך): Stripe (מנויים/חיוב פר פרויקט).
* **אנליטיקה**: PostHog (אירועים/פאנלים), Logtail/Sentry (לוגים/שגיאות).
* **אבטחה**: Cloudflare Turnstile, Rate limiting (Upstash Ratelimit/Vercel Edge), RBAC, בדיקות הרשאות בצד שרת.
* **CI/CD**: Vercel + בדיקות Vitest/Playwright.

---

# מודולים ומה כל אחד צריך לכלול

## 1) הרשמה/זהויות/ארגונים (Design Studios)

* **משתמשים/רולים**: `designer_owner`, `designer_member`, `client`, `supplier`, `admin`.
* **Organizations**: אולפנים/סטודיואים; הפרדה רב־דיירית (multi-tenant) ע"פ `orgId`. ניהול ארגונים עצמאי דרך Prisma/MongoDB.
* **Invites & Roles**: הזמנה ללקוח ולחברי צוות, קביעת הרשאות לפרויקט.
* **Onboarding**: פרטי סטודיו, לוגו/צבע מותג (ברירת מחדל: #df2538), שפות, יחידות מידה, מטבע.
* **אבטחה**: 2FA, מדיניות סיסמאות, SSO בהמשך (Google, MS).

## 2) ניהול לקוחות (CRM) ✅ מיושם (2 נובמבר 2025)

* **רשימת לקוחות**: ✅ מיושם מלא - חיפוש לפי שם, סינון לפי תגיות, דפדוף, טבלה עם כל הפרטים
* **דף פרופיל לקוח**: ✅ מיושם מלא - עמוד מפורט עם טאבים:
  - כרטיס מידע בסיסי (פרטי יצירת קשר, תאריך יצירה)
  - כרטיס תגיות
  - טאב פרויקטים (עם ספירה ומצב ריק)
  - טאב הערות (תצוגת timeline)
  - טאב העדפות (צרכים מיוחדים)
  - כפתור עריכה שפותח Drawer (לא ניווט)
  - אישור מחיקה
  - עדכונים בזמן אמת דרך React Query (כל 30 שניות)
* **טופס לקוח**: ✅ מיושם מלא - Drawer קל משקל עם React Hook Form + Zod validation
  - מצב יצירה ומצב עריכה
  - פרטי יצירת קשר מלאים (אימייל, טלפון, כתובת, עיר, מדינה)
  - תגיות היברידיות עם חיפוש ויצירה
  - העדפות (טווח תקציב, צרכים מיוחדים)
  - ולידציה עם הודעות שגיאה
* **תגיות היברידיות**: ✅ מיושם מלא - 9 תגיות מוגדרות מראש + תגיות מותאמות אישית
* **תרגומים**: ✅ מיושם מלא - עברית ואנגלית (60+ מפתחות תרגום)
* **API מלא**: ✅ מיושם מלא - CRUD שלם עם RBAC, multi-tenancy, Zod validation:
  - POST /api/clients - יצירת לקוח
  - GET /api/clients - רשימה עם חיפוש, סינון, דפדוף
  - GET /api/clients/[id] - לקוח בודד עם ספירת פרויקטים
  - PATCH /api/clients/[id] - עדכון לקוח
  - DELETE /api/clients/[id] - מחיקת לקוח
* **React Query**: ✅ מיושם - עדכונים בזמן אמת כל 30 שניות, refetch על חזרה לחלון
* **החלטה ארכיטקטונית**: ✅ תקציב הוא לפי פרויקט, לא לפי לקוח (הוסר מממשק הלקוח)
* **תיעוד תקשורת מורחב**: ⏳ בהמשך - יצירה/עריכת הערות, קבצים, audit trail מלא
* **שאלון העדפות מורחב**: ⏳ בהמשך - סגנונות אהובים, צבעים מועדפים, רגישויות חומרים

## 3) ניהול פרויקטים

* **מבנה פרויקט**: חדרים, סגנון בסיסי (או כמה), סט חומרים/צבעים, טיימליין, סטטוס.
* **תקציב**: מטבע, טווח, חלוקה קטגורית (ריהוט/חיפוי/תאורה/נגרות…), **Budget Lines** (עלות יחידה×כמות, מיסים, עבודה), גרסאות/השוואות.
* **מסמכים/נכסים**: תוכניות קיימות, תמונות, moodboards, הצעות.
* **אישורים**: “שלח לאישור לקוח”, חתימה/תיעוד החלטות, נעילת גרסה.
* **שיתופיות**: פורטל לקוח לצפייה/הערה/אישור, הרשאות חדר-ספציפיות.

## 4) ספריית סגנונות–צבעים–חומרים (Style Engine)

* **טקסונומיה**: `Category` → `SubCategory` → `Style` ←→ `Palette` ←→ `MaterialSet` ←→ `RoomProfile`.
* **מערכת קטגוריות דו-שכבתית**:
  * **קטגוריה ראשית** (Category): לדוגמה "Modern", "Classic", "Scandinavian"
  * **תת-קטגוריה** (SubCategory): לדוגמה "Minimalistic", "Contemporary", "Rustic"
  * כל סגנון שייך לקטגוריה ראשית ותת-קטגוריה
  * ניהול קטגוריות ותת-קטגוריות דרך דף מנהל נפרד
* **שכבות התאמה**:

  * ברירת מחדל של סגנון (גלובלי).
  * התאמות פר־פרויקט.
  * Overrides פר־חדר.
* **ניתוק לוגי**: אפשר להחליף סגנון מבלי לשבור חומרים (מיפוי חכם).
* **גרסאות**: ניהול גרסאות סגנון/פלטה/סט חומרים + Audit.
* **הרחבה עתידית**: קליטה אוטומטית מצילום השראה (extraction) והצעה לפלטה/חומרים.

## 5) ספריית חומרים וריהוט (Catalog)

* **Material**: קטלוג חומרים עם מאפיינים (סוג, מראה/טקסטורה, תת־סוג, תחזוקה, עמידות, מחירון).
* **Product**: פריטי ריהוט/תאורה/כלים סניטריים (מידות, וריאנטים, מחיר).
* **Suppliers**: ספקים הם ארגונים (Organizations) - כל חומר מקושר לארגון דרך `organizationId`.
* **תמונות/טקסטורות**: שמירה ב־GCP Storage, דוגמיות ריאליסטיות (רקע ניטרלי), תיוג צבעים.
* **תמחור**: מחיר עלות/מכירה, יחידות, חישוב פסולת/עודף (tiles, פרקט).

## 6) מנגנון תקציב והצעות מחיר

* **Bill of Materials**: נבנה אוטומטית מהחדרים/חומרים/פריטים.
* **Costing**: סיכום לפי קטגוריות/חדרים/ספקים; סימולציות.
* **אינבואיסים/תשלומים** (בהמשך): אינטגרציה Stripe/חשבונית ירוקה.

## 7) פורטל לקוח

* **צפייה/אישור**: סגנונות מוצעים, פלטות, חומרים, תקציב.
* **תגובות**: הערות לפי חדר/פריט, היסטוריית החלטות.
* **תזכורות**: דדליינים, משימות.

## 8) הרשאות (RBAC) תכל’ס

* `designer_owner`: כל הפעולות בארגון.
* `designer_member`: אין מחיקה גורפת/חיובים.
* `client`: קריאה + אישור/תגובה רק לפרויקטים שלו.
* `supplier`: קריאה/הצעת מחיר לקטלוג משויך (ארגונים שהם ספקים).
* **Enforcement**: על שרת—בדיקת `orgId` + `role` בכל handler.
* **Note**: ספקים הם ארגונים רגילים - אין מודל Supplier נפרד. חומרים מקושרים לארגון דרך `organizationId`.

---

# סכימת נתונים (MongoDB, תמצית)

```ts
// Organization / User (Clerk ids נשמרים כ-ref)
Org { _id, name, settings: { locale, currency, units, brand }, createdAt }
User { _id, clerkUserId, orgId, role, profile, createdAt }

// Client
Client { _id, orgId, name, contact, tags[], preferences, notes[], createdAt }

// Project
Project {
  _id, orgId, clientId, name, status, baseStyleId, currency,
  rooms: RoomRef[], budget: Budget, timeline, assets[], approvals[],
  createdBy, createdAt, updatedAt
}
RoomRef { _id, name, type, styleOverrideId?, paletteOverrideId?, materialSetOverrideId? }

// Category / SubCategory / Style / Palette / MaterialSet
Category { _id, name: LocalizedString, slug, order, createdAt }
SubCategory { _id, categoryId, name: LocalizedString, slug, order, createdAt }
Style { _id, orgId?, categoryId, subCategoryId, slug, name, description, defaultPaletteId, defaultMaterialSetId, tags[], versions[] }
Palette { _id, name, tokens: ColorToken[], neutrals: ColorToken[], accents: ColorToken[] }
MaterialSet { _id, name, materials: MaterialRef[] }
MaterialRef { materialId, usageArea, defaultFinish }

// Material / Product
// Note: Suppliers are Organizations - materials are linked to organizationId
Material { _id, orgId, type, subType, name, colorRef, finishes[], properties, price, assets[] }
Product { _id, orgId?, category, name, variants[], dimensions, price, assets[] }

// Budget
Budget {
  currency, target, lines: BudgetLine[], taxRate, markupPolicy, versions[]
}
BudgetLine { id, scope: {roomId?, category}, itemRef:{materialId?|productId?}, qty, unit, unitPrice, wastePct?, total }

// Approvals / Audit
Approval { _id, projectId, scope, versionRef, approvedBy, approvedAt }
AuditLog { _id, orgId, actorId, action, entity, before?, after?, at }
```

> הערה: `orgId?` בספריות סגנונות/חומרים מאפשר גם ספריה גלובלית (ברירת מחדל) וגם ספריות פרטיות לארגון.

---

# מנוע סגנונות–צבעים–חומרים–חדרים

## סט סגנונות פתיחה (ניתנים להרחבה)

1. **Scandinavian / Nordic**

   * **Neutrals**: #F5F5F2, #E8E6E1, #C9C7C1
   * **Accents**: #2F3437 (Charcoal), #A67744 (Oak), #6B8E8E (Sage Grey)
   * **Materials**: עץ אלון מולבן, טיח מינרלי בהיר, טקסטיל פשתן, מתכת שחורה דקה.
2. **Japandi**

   * Neutrals: #F4F1EC, #DED7C9
   * Accents: #1F1F1F, #7C715E, #6C8C7C
   * Materials: במבוק, מייפל בהיר, אבן בז׳ מט, בדי כותנה טבעית.
3. **Industrial**

   * Neutrals: #E3E3E3, #B5B5B5
   * Accents: #2C2C2C, #C05C3C (חלודה), #3E4A59 (פלדה כחולה)
   * Materials: בטון חשוף, פלדה/ברזל, עץ ממוחזר כהה, לבנה חשופה.
4. **Modern Minimal**

   * Neutrals: #FFFFFF, #F3F3F3, #DADADA
   * Accents: #111111, #6F6F6F
   * Materials: MDF צבוע שלייף-לק, שיש לבן/קווארץ, אלומיניום שחור.
5. **Mediterranean**

   * Neutrals: #FAF3E0, #E9E1CF
   * Accents: #2F4858 (כחול עמוק), #C08C5A (טרה-קוטה), #7A8A4D (זית)
   * Materials: טיח מינרלי, אבן חלילה, עץ זית/אלון טבעי, אריחים מצוירים.
6. **Rustic**

   * Neutrals: #EEE6DA, #D8C7B6
   * Accents: #5A4632, #8B6D4E, #6E7B58
   * Materials: אלון מעושן, אבן טבעית גסה, ברזל מחושל, טקסטיל צמר.
7. **Classic/Transitional**

   * Neutrals: #F7F4F0, #E7DFD6
   * Accents: #1E2A36, #8A6F5A, #A9A1A0
   * Materials: עץ צבוע בגווני קרם, שיש קררה, פרזול פליז.

> לכל סגנון: נבנה **Palette** (ניטרליים/אקסנטים) + **MaterialSet** ברירת מחדל.

## התאמות לפי חדר (Room Profiles)

* **Living, Kitchen, Bedroom, Bath, Entry, Office** (אפשר להרחיב).
* בכל פרופיל: המלצות משקל/אחוז שימוש צבעים, חומרים מומלצים, אילוצי תחזוקה (למשל באמבטיה/מטבח).
* **Overrides**: לכל חדר ניתן להחליף צבע/חומר/פרופורציות, לשמור כ־Preset.

## פורמט JSON להצעת סגנון (דוגמה)

```json
{
  "style": "Japandi",
  "palette": {
    "neutrals": ["#F4F1EC", "#DED7C9"],
    "accents": ["#1F1F1F", "#7C715E", "#6C8C7C"]
  },
  "materials": [
    {"materialId":"bamboo-001","usageArea":"floor","finish":"matte"},
    {"materialId":"stone-beige-014","usageArea":"countertop"},
    {"materialId":"linen-003","usageArea":"textile"}
  ],
  "rooms": [
    {
      "roomId": "living",
      "overrides": {
        "accents": ["#1F1F1F","#6C8C7C"],
        "materials": [{"materialId":"oak-bleached-012","usageArea":"floor"}]
      }
    }
  ]
}
```

---

# זרימות עבודה עיקריות

## יצירת סטודיו/מעצבת ✅ מיושם חלקית (80%)

1. ✅ Sign-up עם Google OAuth דרך NextAuth.js → יצירת Org אוטומטית (מיושם)
2. ✅ תשתית אבטחה מלאה - RBAC עם 5 תפקידים, 20+ הרשאות, middleware
3. ✅ ספריית קומפוננטות UI - 20+ רכיבים עם צבעי מותג MoodB
4. ✅ **ניהול לקוחות מלא** (מיושם במלואו 2 נובמבר 2025):
   - API מלא: יצירה, רשימה, צפייה, עדכון, מחיקה
   - רשימה: חיפוש, סינון תגיות, דפדוף
   - דף פרופיל מלא: טאבים (פרויקטים, הערות, העדפות)
   - טופס Drawer: יצירה/עריכה
   - React Query: עדכונים בזמן אמת (30 שניות)
   - תרגומים מלאים: עברית ואנגלית
   - תגיות היברידיות: 9 מוגדרות + מותאמות
5. ⏳ Onboarding: מטבע/יחידות/שפה/מותג (בהמשך)
6. ⏳ יצירת ספרייה ראשונית (סגנונות ברירת מחדל globally + העתק לארגון להתאמות) (בהמשך)

## לקוח חדש → פרויקט

1. ✅ יצירת לקוח + שאלון העדפות (מיושם במלואו)
2. ⏳ יצירת פרויקט (תקציב יעד, חדרים, סגנון בסיס) - הבא בתור
3. ⏳ המערכת מייצרת **Draft**: Palette + MaterialSet + RoomProfiles
4. ⏳ במידת הצורך—Overrides לכל חדר
5. ⏳ הפקת **Budget v1** (BOM אוטומטי) - תקציב לפי פרויקט
6. ⏳ שליחה לפורטל לקוח לאישור

## ניהול תקציב

* עריכת כמויות/פריטים/יחידות.
* סימולציות (Low/Mid/High).
* גרסאות: v1, v2… + השוואה.
* Status: Draft → Proposed → Approved → Ordered.

---

# API & נתיבי קבצים (Next.js App Router, דוגמא עקרונית)

* `POST /api/org` – הקמת ארגון.
* `GET/POST /api/clients` – לקוחות.
* `GET/POST /api/projects` – יצירה/עדכון פרויקט.
* `GET/POST /api/projects/:id/rooms` – ניהול חדרים.
* `GET/POST /api/styles` – ספריית סגנונות.
* `GET/POST /api/palettes` – פלטות צבע.
* `GET/POST /api/materials` – חומרים.
* `POST /api/projects/:id/budget` – חישוב/עדכון תקציב.
* `POST /api/uploads` – העלאת קבצים (R2 Signed URL).
* `POST /api/approvals` – אישורים.
* `GET /api/search` – חיפוש חומרים/פריטים (Meilisearch/Atlas Search).

> בכל Handler: אימות NextAuth.js, בדיקת RBAC, `orgId` scoping, ולידציה עם Zod.

---

# UI עיקרי (Mantine)

* **צבעי מותג**: רקע #f7f7ed • כותרות/לוגו #df2538 • טקסט #000000 • לבן #ffffff.
* **Sidebar**: לקוחות / פרויקטים / ספריה.
* **Project Canvas**: טאב Rooms / Style / Palette / Materials / Budget / Approvals.
* **Style Lab**: השוואת סגנונות (A/B/C), תצוגה מקדימה של פלטות, קפיצות אנימציה עם Framer Motion.
* **Palette Editor**: גרירת טוקנים, נעילת קונטרסט (WCAG), RTL/LTR Toggle.
* **Material Board**: כרטיסיות חומרים עם Variants, עלויות, זמינות.

---

# איוש טקסטים/תוכן וריבוי שפות

* `next-intl` + קבצי messages (he/en) • תמיכה RTL מלאה (Mantine `direction="rtl"`) • פורמט תאריכים/מטבע.

---

# ביצועים ואיכות

* **Edge Caching** לתוכן ציבורי (עמודי השראה), **ISR** (Vercel) לפרויקטים שמורים.
* **תמונות**: יצירת Thumbnails/AVIF ב־Edge Function, שמירה ב־R2.
* **נגישות**: יחס קונטרסט מינ’ 4.5:1, ניווט מקלדת, ARIA.

---

# שלבי פיתוח (מיילסטונים ממוקדים)

**Phase 0 – תשתית (1–2 שבועות)**

* פרויקט Next.js + Mantine + Clerk + Prisma (Mongo).
* Org/Users/Roles; Layout RTL; Design System בסיסי (Tokens: #f7f7ed, #df2538, #000000, #ffffff).
* Storage R2 + העלאות חתומות; Turnstile + Ratelimit; PostHog/Sentry.

**Phase 1 – CRM ופרויקטים** ✅ מיושם חלקית (50%) (2 נובמבר 2025)

* ✅ **לקוחות (CRUD)** - מיושם במלואו:
  - API מלא: POST, GET (רשימה), GET/PATCH/DELETE (לקוח בודד)
  - רשימה: חיפוש לפי שם, סינון לפי תגיות, דפדוף
  - דף פרופיל: טאבים (פרויקטים, הערות, העדפות)
  - טופס Drawer: יצירה/עריכה עם React Hook Form
  - תגיות: 9 מוגדרות מראש + מותאמות אישית
  - תרגומים: עברית ואנגלית מלאים (60+ מפתחות)
  - אבטחה: multi-tenancy, RBAC, Zod validation
  - React Query: עדכונים בזמן אמת (30 שניות)
  - UX: כפתור עריכה פותח Drawer (לא ניווט)
  - החלטה ארכיטקטונית: תקציב לפי פרויקט, לא לקוח
* ⏳ **פרויקטים (CRUD)** - הבא בתור (יכלול תקציב לפי פרויקט)
* ⏳ **חדרים** - אחרי פרויקטים
* ✅ **שאלון העדפות לקוח** - מיושם חלקית (טווח תקציב, צרכים מיוחדים)

**Phase 2 – Style Engine v1**

* ספריית סגנונות גלובלית + העתקה לארגון.
* Palettes Editor + MaterialSet Editor.
* מיפויי ברירת מחדל לסוגי חדרים.

**Phase 3 – Budgeting v1**

* BOM אוטומטי מתוך Materials/Rooms.
* קווי תקציב, סכימות מס, סימולציות, גרסאות.
* פורטל לקוח: צפייה/אישורים.

**Phase 4 – Catalog & Suppliers**

* ניהול קטלוג חומרים - כל חומר מקושר לארגון (ספק) דרך `organizationId`.
* הצעות מחיר/סטטוסים בסיסיים.
* **Note**: ספקים הם ארגונים רגילים - אין מודל Supplier נפרד.

**Phase 5 – חיפוש/פילוח**

* Meilisearch/Atlas Search, פאסד חיפוש מהיר (חומרים/פריטים/סגנונות).

**Phase 6 – AI Foundations (אופציונלי לשלב הבא)**

* Color extraction מתמונות השראה → Palette Suggest.
* Material suggestions ע"פ סגנון/חדר/תקציב.
* Auto-room presets (Layout/Proportions) – בסיס.

---

# עדכונים אחרונים (ינואר 2025)

## ✅ אזור מנהל עם הגנות מקיפות

**הגנות רב-שכבתיות:**
- Middleware של Next.js להגנה על `/admin/*`
- הגנה ברמת Layout בצד השרת
- הגנה ברמת Component בצד הלקוח (`useAdminGuard`)
- הגנה על API endpoints (`withAdmin` wrapper)
- הגנה על React Query hooks

**דפי מנהל:**
- Dashboard עם סטטיסטיקות
- ניהול סגנונות גלובליים
- ניהול צבעים ✅ חדש (ינואר 2025)
- ניהול קטגוריות ✅ חדש (ינואר 2025)
- ניהול תת-קטגוריות ✅ חדש (ינואר 2025)
- ניהול חומרים ✅ חדש (ינואר 2025)
- ניהול משתמשים ✅ חדש (ינואר 2025)
- אישור סגנונות (approve/reject)
- דפי פרטי סגנון עם טאבים
- דף placeholder (ארגונים)

**כלים:**
- `scripts/set-admin.ts` - הגדרת משתמש כמנהל
- `pnpm admin:set <email>` - פקודת npm
- `docs/ADMIN_ACCESS.md` - תיעוד מלא

## ✅ ניהול צבעים (ינואר 2025)

**מערכת ניהול צבעים מלאה:**
- מודל Color עם קטגוריות: neutral, accent, semantic
- CRUD מלא דרך Admin API ו-UI
- צבעים משולבים עם מודל Style (כל סגנון מפנה ל-colorId)
- React Query hooks לניהול בזמן אמת
- תרגומים מלאים (עברית + אנגלית)
- דפי ניהול: רשימה, יצירה, עריכה, מחיקה

## ✅ ניהול קטגוריות ותת-קטגוריות (ינואר 2025)

**מערכת דו-שכבתית:**
- Category → SubCategory → Style
- כל סגנון שייך לקטגוריה ותת-קטגוריה
- CRUD מלא לשני הרבדים
- דפי ניהול נפרדים לכל רמה
- תרגומים מלאים (עברית + אנגלית)

## ✅ ניהול חומרים (ינואר 2025)

**מערכת ניהול חומרים מלאה:**
- מודל Material עם מאפיינים מלאים, תמחור, זמינות
- CRUD מלא דרך Admin API ו-UI
- MaterialList component לשימוש חוזר
- קטגוריות חומרים וסוגי חומרים (API + ניהול מלא) ✅ הושלם (29 ינואר 2025)
- MaterialCategoriesTab ו-MaterialTypesTab עם CRUD מלא ✅ הושלם
- Material Settings Page עם טאבים לקטגוריות וסוגים ✅ הושלם
- Form Drawers ליצירה/עריכה של קטגוריות וסוגים ✅ הושלם
- React Query hooks לניהול בזמן אמת
- תרגומים מלאים (עברית + אנגלית)
- דפי ניהול: רשימה, יצירה, עריכה, הגדרות

## ✅ ניהול משתמשים (ינואר 2025)

**מערכת ניהול משתמשים:**
- Admin Users API - רשימה עם חיפוש וסינון לפי תפקיד
- דף רשימת משתמשים עם חיפוש וסינון
- דף פרטי משתמש
- React Query hooks לניהול משתמשים

## ✅ ניהול סגנונות (65% הושלם - ינואר 2025)

**APIs:**
- Admin Styles API - CRUD מלא + אישורים ✅
- User Styles API - יצירה, עיון, סינון ✅

**UI:**
- דפי מנהל סגנונות (מלא) ✅
- דף יצירת סגנון (form wizard מלא עם טאבים) ✅ הושלם (29 ינואר 2025)
- דף עריכת סגנון (form מלא עם כל התכונות) ✅ הושלם (29 ינואר 2025)
- דפי מנהל צבעים (מלא) ✅ חדש
- דפי מנהל קטגוריות (מלא) ✅ חדש
- דפי מנהל חומרים (מלא) ✅ חדש
- דפי מנהל משתמשים (מלא) ✅ חדש
- דפי משתמש (ממתין) ⏳

**מסד נתונים:**
- Prisma במקום Mongoose (החלטה ארכיטקטונית)
- אין צורך ב-migrations עם MongoDB
- `db push` בלבד
- מודלים: Style, Color, Category, SubCategory, Material, MaterialCategory, MaterialType (כולם מוגדרים)

---

# מה נקבל בסוף ה־MVP

* מערכת הרשאות מרובת דיירים (סטודיואים).
* ניהול לקוחות/פרויקטים/חדרים.
* מנוע סגנונות–צבעים–חומרים גמיש עם Overrides.
* תקצוב ראשוני עם BOM וגרסאות.
* פורטל לקוח לאישורים—תיעוד היסטוריה.
* בסיס איתן לפריצ'רים גנרטיביים (השראה→פלטה→חומרים→BOM→הדמיה בהמשך).
