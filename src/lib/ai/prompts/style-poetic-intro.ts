/**
 * Poetic Introduction Prompt Template
 *
 * Inspired by docs/text-style-example.md
 * Generates artistic, philosophical content about harmony, nature, color, and form
 */

export interface PoeticIntroContext {
  styleName: { he: string; en: string }
  subCategoryName: { he: string; en: string }
  approachName: { he: string; en: string }
  colorName: { he: string; en: string }
  colorHex: string
  subCategoryDescription?: { he?: string; en?: string }
  approachPhilosophy?: { he?: string; en?: string }
  colorDescription?: { he?: string; en?: string }
}

export function buildPoeticIntroPrompt(context: PoeticIntroContext): string {
  const {
    styleName,
    subCategoryName,
    approachName,
    colorName,
    colorHex,
    subCategoryDescription,
    approachPhilosophy,
    colorDescription,
  } = context

  return `You are a poetic interior design writer creating an ARTISTIC, PHILOSOPHICAL introduction for a design style.

**STYLE**: ${styleName.he} / ${styleName.en}
**SUB-CATEGORY**: ${subCategoryName.he} / ${subCategoryName.en}
**APPROACH**: ${approachName.he} / ${approachName.en}
**PRIMARY COLOR**: ${colorName.he} / ${colorName.en} (${colorHex})

**CONTEXT**:
Sub-Category: ${subCategoryDescription?.he || 'N/A'}
Approach Philosophy: ${approachPhilosophy?.he || 'N/A'}
Color Essence: ${colorDescription?.he || 'N/A'}

---

**INSPIRATION** (Reference style from docs/text-style-example.md):

The example emphasizes:
1. **Harmony between nature, color, and form** - הרמוניה שבין טבע, צבע וצורניות
2. **Unity in design** - עיצוב מלא באחדות
3. **Deep connection** - creating synergy between all elements
4. **Natural colors** - marble, wood, sky, deep blue, clay, gold
5. **Form that supports community** - צורניות שתומכת בקהילתיות
6. **Embracing and connecting** - עיצוב שמחבק ומחבר
7. **Every detail contributes** - כל פרט ואלמנט פועל בסינרגיה

---

**YOUR TASK**:

Write a poetic, philosophical introduction for this style in BOTH Hebrew and English.

**HEBREW SECTION** (3-4 paragraphs, ~400-500 words):
1. **Opening** - Begin with a poetic title/headline about harmony and unity in this style
2. **Color & Nature** - Describe how the primary color (${colorName.he}) connects to nature, creates feelings, and relates to the design concept. Use poetic language about materials, textures, and natural elements.
3. **Form & Philosophy** - Explain how the design approach (${approachName.he}) and the style's forms create connection, community, and embrace. Discuss how every element works in synergy.
4. **Integration** - Describe how color, materials, and form combine to create wholeness, elegance, and deep connection to soul and place.

**ENGLISH SECTION** (3-4 paragraphs, ~400-500 words):
- Mirror the Hebrew content with the same poetic, philosophical tone
- Maintain the same structure and flow

**STYLE GUIDELINES**:
- Use flowing, artistic Hebrew/English (not technical)
- Focus on FEELINGS, CONNECTIONS, HARMONY
- Emphasize: nature, light, materials, textures, spatial flow
- Reference: royalty, elegance, nobility, serenity, peace
- Avoid: technical terms, measurements, price points
- Include: metaphors, sensory descriptions, emotional impact

**EXAMPLE PHRASES TO EMULATE**:
Hebrew:
- "הקונספט העיצובי שלנו נבנה מתוך מחשבה עמוקה על יצירת סביבה..."
- "המרכיבים השונים הצבעוניות ומגוון הטקסורות שבחרנו מבוססת על גוונים טבעיים..."
- "השילוב הזה לא רק מדגיש את היופי שבטבע, אלא גם יוצר תחושת..."
- "כל פרט כל קו וכל חיבור בין אלמנט לאלמנט, יוצר את התחושה..."
- "הצורניות בעיצוב באה להדגיש את הרגעים הקטנים..."

English:
- "Our design concept is built from deep thought about creating an environment..."
- "The various colorful components and range of textures we chose are based on natural tones..."
- "This combination not only emphasizes the beauty in nature, but also creates a feeling of..."
- "Every detail, every line, and every connection between element and element, creates the sensation..."
- "The form in design comes to emphasize the small moments..."

**RETURN FORMAT** (JSON):
{
  "poeticIntro": {
    "he": {
      "title": "כותרת פואטית בעברית (5-10 מילים)",
      "subtitle": "כותרת משנה (5-10 מילים)",
      "paragraph1": "פסקה ראשונה על הרמוניה ואחדות...",
      "paragraph2": "פסקה שנייה על צבע וטבע...",
      "paragraph3": "פסקה שלישית על צורניות ופילוסופיה...",
      "paragraph4": "פסקה רביעית על שילוב ושלמות..."
    },
    "en": {
      "title": "Poetic title in English (5-10 words)",
      "subtitle": "Subtitle (5-10 words)",
      "paragraph1": "First paragraph about harmony and unity...",
      "paragraph2": "Second paragraph about color and nature...",
      "paragraph3": "Third paragraph about form and philosophy...",
      "paragraph4": "Fourth paragraph about integration and wholeness..."
    }
  }
}

**CRITICAL**:
- Return ONLY valid JSON
- NO markdown, NO code blocks, NO explanations
- Use rich, poetic language in both languages
- Each paragraph should be 100-150 words
- Focus on FEELING and PHILOSOPHY, not facts`
}
