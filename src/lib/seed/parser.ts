/**
 * Seed Data Parser
 *
 * Parses the docs/all-base-data.md file and extracts structured data
 * for Categories, SubCategories, Styles, Approaches, and RoomTypes
 */

import * as fs from 'fs'
import * as path from 'path'

export interface RoomTypeData {
  name: { he: string; en: string }
  slug: string
  category: string
  order: number
}

export interface CategoryData {
  name: { he: string; en: string }
  slug: string
  description: { he: string; en: string }
  period?: string
  order: number
}

export interface SubCategoryData {
  name: { he: string; en: string }
  slug: string
  description?: { he: string; en: string }
  period?: string
  order: number
  categorySlug: string // Which category this belongs to
}

export interface ApproachData {
  name: { he: string; en: string }
  slug: string
  description?: { he: string; en: string }
  order: number
}

export interface ParsedData {
  roomTypes: RoomTypeData[]
  categories: CategoryData[]
  subCategories: SubCategoryData[]
  approaches: ApproachData[]
}

/**
 * Create slug from Hebrew/English name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0590-\u05FF\-]/g, '')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Extract bilingual name from line
 * Examples:
 * "1. סלון / Living Room" -> { he: "סלון", en: "Living Room" }
 * "**מצרי עתיק** – ‎3000–30 לפנה״ס" -> { he: "מצרי עתיק", en: "Ancient Egyptian" }
 */
function extractBilingualName(line: string): { he: string; en: string } | null {
  // Pattern 1: "Hebrew / English"
  const pattern1 = /^(?:\d+\.\s+)?([^/]+?)\s*\/\s*([^–\-]+?)(?:\s*(?:–|\-)\s*.*)?$/
  const match1 = line.match(pattern1)
  if (match1) {
    return {
      he: match1[1].trim(),
      en: match1[2].trim(),
    }
  }

  // Pattern 2: "**Hebrew** – period" (only Hebrew name, English needs manual mapping)
  const pattern2 = /^\d+\.\s+\*\*([^\*]+)\*\*\s*(?:–|\-)\s*(.+)$/
  const match2 = line.match(pattern2)
  if (match2) {
    const heName = match2[1].trim()
    return {
      he: heName,
      en: translateStyleName(heName), // Will translate known names
    }
  }

  // Pattern 3: Just Hebrew with parentheses for English
  const pattern3 = /^(?:\d+\.\s+)?([^\(]+?)\s*\(([^\)]+)\)$/
  const match3 = line.match(pattern3)
  if (match3) {
    return {
      he: match3[1].trim(),
      en: match3[2].trim(),
    }
  }

  return null
}

/**
 * Translate known Hebrew style names to English
 */
function translateStyleName(heName: string): string {
  const translations: Record<string, string> = {
    'מצרי עתיק': 'Ancient Egyptian',
    'יווני קלאסי': 'Classical Greek',
    'רומי קלאסי': 'Classical Roman',
    ביזנטי: 'Byzantine',
    רומנסקי: 'Romanesque',
    גותי: 'Gothic',
    'עתיק (כללי)': 'Ancient (General)',
    הרנסנס: 'Renaissance',
    בארוק: 'Baroque',
    רוקוקו: 'Rococo',
    'לואי ה־14': 'Louis XIV',
    'לואי ה־15': 'Louis XV',
    'לואי ה־16': 'Louis XVI',
    'ניאו־קלאסי (Historic)': 'Neoclassical (Historic)',
    ויקטוריאני: 'Victorian',
    'אר־נובו': 'Art Nouveau',
    'אר־דקו': 'Art Deco',
    'ים־תיכוני': 'Mediterranean',
    טוסקני: 'Tuscan',
    פרובנס: 'Provençal',
    קולוניאלי: 'Colonial',
    כפרי: 'Rustic',
    'מזרחי (אסייתי/הודי)': 'Oriental (Asian/Indian)',
    הודי: 'Indian',
    טרופי: 'Tropical',
    'חוף (Coastal)': 'Coastal',
    אוסטרלי: 'Australian',
    'סקנדינבי (נורדי)': 'Scandinavian (Nordic)',
    'יפני (מסורתי)': 'Japanese (Traditional)',
    'ראשית המודרניזם (Early Modern)': 'Early Modern',
    'תעשייתי (Industrial)': 'Industrial',
    'מודרני (Modern)': 'Modern',
    'אמצע המאה (Mid-Century Modern)': 'Mid-Century Modern',
    'מינימליסטי (Minimalist)': 'Minimalist',
    'היפי (Hippie)': 'Hippie',
    'סוואג (Swag / Space-Age)': 'Swag / Space-Age',
    'פאנק (Punk)': 'Punk',
    'שנות ה־80': '80s',
    'פוסט־מודרני (Postmodern)': 'Postmodern',
    'וינטג׳ (Vintage)': 'Vintage',
    'רטרו (Retro)': 'Retro',
    'קיטש׳ (Kitsch)': 'Kitsch',
    'סוריאליסטי (Surrealist)': 'Surrealist',
    'עכשווי (Contemporary)': 'Contemporary',
    'מודרני עכשווי (Modern Contemporary)': 'Modern Contemporary',
    'אירופאי עכשווי (European Contemporary)': 'European Contemporary',
    'קוסמופוליטי (Cosmopolitan)': 'Cosmopolitan',
    'אורבני (Urban)': 'Urban',
    'בוהו שיק (Boho Chic)': 'Boho Chic',
    'קלאסי מודרני (Modern Classic)': 'Modern Classic',
    'ניו־קלאסי (New Classic)': 'New Classic',
    'דקו־חדש (Neo-Deco)': 'Neo-Deco',
    'ג׳פנדי (Japandi)': 'Japandi',
    'יפני עכשווי (Zen)': 'Contemporary Japanese (Zen)',
    'גולמי (Raw)': 'Raw',
    'אקולוגי / בר־קיימא (Eco Design)': 'Eco Design',
    'אקלקטי (Eclectic)': 'Eclectic',
    'פיוז׳ן (Fusion)': 'Fusion',
    'על־זמני (Timeless)': 'Timeless',
    'אלגנטי (Elegant)': 'Elegant',
  }

  return translations[heName] || heName
}

/**
 * Extract period from line
 */
function extractPeriod(line: string): string | undefined {
  const periodMatch = line.match(/(?:–|\-)\s*(‎?[\d\s\-–לפנהעתיקהיום״ס,א־]+)$/)
  if (periodMatch) {
    return periodMatch[1].trim()
  }
  return undefined
}

/**
 * Parse room types section
 */
function parseRoomTypes(content: string): RoomTypeData[] {
  const roomTypes: RoomTypeData[] = []
  const sections = [
    { category: 'חללים ציבוריים', slug: 'public-spaces' },
    { category: 'חללים פרטיים', slug: 'private-spaces' },
    { category: 'חללים משלימים', slug: 'complementary-spaces' },
    { category: 'חללים יוקרתיים', slug: 'luxury-spaces' },
  ]

  let order = 0
  for (const section of sections) {
    const regex = new RegExp(`#### \\*\\*[^*]+${section.category}`, 'g')
    const sectionMatch = content.match(regex)

    if (sectionMatch) {
      const sectionStart = content.indexOf(sectionMatch[0])
      const nextSection = content.indexOf('####', sectionStart + 1)
      const sectionContent = content.substring(
        sectionStart,
        nextSection > 0 ? nextSection : content.length
      )

      const lines = sectionContent.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (/^\d+\.\s+/.test(trimmed)) {
          const name = extractBilingualName(trimmed)
          if (name) {
            roomTypes.push({
              name,
              slug: createSlug(name.en),
              category: section.slug,
              order: ++order,
            })
          }
        }
      }
    }
  }

  return roomTypes
}

/**
 * Parse categories (without subcategories)
 */
function parseCategories(content: string): CategoryData[] {
  const categories: CategoryData[] = []

  // Define category sections
  const categorySections = [
    {
      name: { he: 'עולם עתיק', en: 'Ancient World' },
      description: {
        he: 'ראשית האדריכלות והעיצוב – מהתרבויות הקדומות ועד ימי הביניים.',
        en: 'The origins of architecture and design – from ancient civilizations to the Middle Ages.',
      },
      period: '‎3000 לפנה"ס – ‎1500 לספירה',
      marker: '## **🏛️ 1\\. עולם עתיק**',
    },
    {
      name: { he: 'הסגנונות הקלאסיים', en: 'Classical Styles' },
      description: {
        he: 'עידני הפאר האירופיים – מהרנסנס ועד הניאו־קלאסיקה והויקטוריאנית.',
        en: 'European eras of grandeur – from Renaissance to Neoclassicism and Victorian.',
      },
      period: '‎1400–1939',
      marker: '## **🏰 2\\. הסגנונות הקלאסיים',
    },
    {
      name: { he: 'סגנונות אזוריים', en: 'Regional Styles' },
      description: {
        he: 'השראות תרבותיות ומקומיות מכל רחבי העולם – עיצוב לפי אקלים, חומרים ומסורת.',
        en: 'Cultural and local inspirations from around the world – design by climate, materials, and tradition.',
      },
      period: '‎1600–היום',
      marker: '## **🏡 3\\. סגנונות אזוריים',
    },
    {
      name: { he: 'ראשית המודרנה', en: 'Early Modern' },
      description: {
        he: 'המעבר מקישוטיות לפונקציונליות – הולדת העיצוב המודרני במאה ה־20 המוקדמת.',
        en: 'The transition from ornamentation to functionality – the birth of modern design in the early 20th century.',
      },
      period: '‎1900–1970',
      marker: '## **⚙️ 4\\. ראשית המודרנה',
    },
    {
      name: { he: 'עיצובי המאה ה־20', en: '20th Century Design' },
      description: {
        he: 'עידן הביטוי האישי – בין פוסט־מודרניזם, רטרו ויצירתיות חופשית.',
        en: 'Era of personal expression – between postmodernism, retro, and free creativity.',
      },
      period: '‎1960–2000',
      marker: '## **🎞️ 5\\. עיצובי המאה ה־20',
    },
    {
      name: { he: 'עיצוב עכשווי', en: 'Contemporary Design' },
      description: {
        he: 'סגנונות ההווה – שילוב חדשנות, הרמוניה וחומריות טבעית בעיצוב בן זמננו.',
        en: 'Present-day styles – combining innovation, harmony, and natural materiality in contemporary design.',
      },
      period: '‎1970–היום',
      marker: '## **🌍 6\\. עיצוב עכשווי',
    },
    {
      name: { he: 'גישות עיצוביות', en: 'Design Approaches' },
      description: {
        he: 'תפיסות חוצות־זמן – אקלקטי, פיוז\'ן, על־זמני ואלגנטי כגישה עיצובית.',
        en: 'Timeless concepts – eclectic, fusion, timeless, and elegant as design approaches.',
      },
      period: '‎1900–היום',
      marker: '## **גישות עיצוביות',
    },
  ]

  let categoryOrder = 0
  for (const catSection of categorySections) {
    categories.push({
      name: catSection.name,
      slug: createSlug(catSection.name.en),
      description: catSection.description,
      period: catSection.period,
      order: ++categoryOrder,
    })
  }

  return categories
}

/**
 * Parse sub-categories (all 60+ items from all categories)
 */
function parseSubCategories(content: string): SubCategoryData[] {
  const subCategories: SubCategoryData[] = []

  // Define category sections to extract subcategories from
  const categorySections = [
    { slug: 'ancient-world', marker: '## **🏛️ 1\\. עולם עתיק**' },
    { slug: 'classical-styles', marker: '## **🏰 2\\. הסגנונות הקלאסיים' },
    { slug: 'regional-styles', marker: '## **🏡 3\\. סגנונות אזוריים' },
    { slug: 'early-modern', marker: '## **⚙️ 4\\. ראשית המודרנה' },
    { slug: '20th-century-design', marker: '## **🎞️ 5\\. עיצובי המאה ה־20' },
    { slug: 'contemporary-design', marker: '## **🌍 6\\. עיצוב עכשווי' },
    { slug: 'design-approaches', marker: '## **גישות עיצוביות' },
  ]

  let globalOrder = 0

  for (const catSection of categorySections) {
    // Find the section in content
    const sectionStart = content.indexOf(catSection.marker)
    if (sectionStart === -1) continue

    const nextSectionStart = content.indexOf('\n## ', sectionStart + 1)
    const sectionContent = content.substring(
      sectionStart,
      nextSectionStart > 0 ? nextSectionStart : content.length
    )

    const lines = sectionContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      // Match numbered items like "1. **מצרי עתיק** – ‎3000–30 לפנה״ס"
      if (/^\d+\.\s+\*\*/.test(trimmed)) {
        const name = extractBilingualName(trimmed)
        const period = extractPeriod(trimmed)

        if (name) {
          subCategories.push({
            name,
            slug: createSlug(name.en),
            period,
            order: ++globalOrder,
            categorySlug: catSection.slug,
          })
        }
      }
    }
  }

  return subCategories
}

/**
 * Parse approaches (design approaches)
 */
function parseApproaches(content: string): ApproachData[] {
  const approaches: ApproachData[] = []

  const approachList = [
    { name: { he: 'אקלקטי', en: 'Eclectic' } },
    { name: { he: 'פיוז׳ן', en: 'Fusion' } },
    { name: { he: 'על־זמני', en: 'Timeless' } },
    { name: { he: 'אלגנטי', en: 'Elegant' } },
  ]

  let order = 0
  for (const approach of approachList) {
    approaches.push({
      name: approach.name,
      slug: createSlug(approach.name.en),
      order: ++order,
    })
  }

  return approaches
}

/**
 * Main parser function
 */
export function parseAllBaseData(filePath?: string): ParsedData {
  const defaultPath = path.join(process.cwd(), 'docs', 'all-base-data.md')
  const actualPath = filePath || defaultPath

  if (!fs.existsSync(actualPath)) {
    throw new Error(`File not found: ${actualPath}`)
  }

  const content = fs.readFileSync(actualPath, 'utf-8')

  return {
    roomTypes: parseRoomTypes(content),
    categories: parseCategories(content),
    subCategories: parseSubCategories(content),
    approaches: parseApproaches(content),
  }
}
