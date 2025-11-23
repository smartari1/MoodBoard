/**
 * Update JSON translation files with Room Categories translations
 *
 * Usage: npx tsx scripts/update-json-translations.ts
 */

import fs from 'fs'
import path from 'path'

const messagesDir = path.join(process.cwd(), 'messages')

// Hebrew translations
const heTranslations = {
  admin: {
    navigation: {
      roomCategories: 'קטגוריות חדרים',
    },
    styleSystem: {
      roomCategories: {
        title: 'קטגוריות חדרים',
        description: 'ניהול קטגוריות לסיווג סוגי חדרים (פרטי, ציבורי, מסחרי)',
        actions: 'פעולות',
        loading: 'טוען קטגוריות חדרים...',
        error: 'שגיאה בטעינת קטגוריות חדרים',
        search: 'חיפוש קטגוריות...',
        showInactive: 'הצג לא פעילים',
        create: 'צור קטגוריה חדשה',
        noResults: 'לא נמצאו תוצאות',
        empty: 'אין קטגוריות חדרים',
        tryDifferentSearch: 'נסה חיפוש אחר',
        emptyDescription: 'צור את הקטגוריה הראשונה שלך כדי להתחיל',
        name: 'שם',
        slug: 'מזהה',
        roomTypes: 'סוגי חדרים',
        order: 'סדר',
        status: 'סטטוס',
        rooms: 'חדרים',
        active: 'פעיל',
        inactive: 'לא פעיל',
        deactivate: 'השבת',
        activate: 'הפעל',
        editCategory: 'ערוך קטגוריה',
        createCategory: 'צור קטגוריה',
        deleteConfirmTitle: 'מחק קטגוריה?',
        deleteConfirmMessage: 'האם אתה בטוח שברצונך למחוק קטגוריה זו? פעולה זו לא ניתנת לביטול.',
        form: {
          basicInfo: 'מידע בסיסי',
          nameHe: 'שם בעברית',
          nameHePlaceholder: 'לדוגמה: פרטי, ציבורי, מסחרי',
          nameEn: 'שם באנגלית',
          nameEnPlaceholder: 'לדוגמה: Private, Public, Commercial',
          slug: 'מזהה (Slug)',
          slugPlaceholder: 'לדוגמה: private, public, commercial',
          icon: 'אייקון',
          iconPlaceholder: 'לדוגמה: 🏠, 🏛️, 🏢',
          order: 'סדר תצוגה',
          orderPlaceholder: '0, 1, 2, ...',
          description: 'תיאור',
          descriptionHe: 'תיאור בעברית',
          descriptionHePlaceholder: 'תיאור אופציונלי של הקטגוריה...',
          descriptionEn: 'תיאור באנגלית',
          descriptionEnPlaceholder: 'תיאור אופציונלי של הקטגוריה...',
        },
      },
    },
  },
}

// English translations
const enTranslations = {
  admin: {
    navigation: {
      roomCategories: 'Room Categories',
    },
    styleSystem: {
      roomCategories: {
        title: 'Room Categories',
        description: 'Manage categories for classifying room types (Private, Public, Commercial)',
        actions: 'Actions',
        loading: 'Loading room categories...',
        error: 'Error loading room categories',
        search: 'Search categories...',
        showInactive: 'Show inactive',
        create: 'Create New Category',
        noResults: 'No results found',
        empty: 'No room categories',
        tryDifferentSearch: 'Try a different search',
        emptyDescription: 'Create your first category to get started',
        name: 'Name',
        slug: 'Slug',
        roomTypes: 'Room Types',
        order: 'Order',
        status: 'Status',
        rooms: 'rooms',
        active: 'Active',
        inactive: 'Inactive',
        deactivate: 'Deactivate',
        activate: 'Activate',
        editCategory: 'Edit Category',
        createCategory: 'Create Category',
        deleteConfirmTitle: 'Delete Category?',
        deleteConfirmMessage: 'Are you sure you want to delete this category? This action cannot be undone.',
        form: {
          basicInfo: 'Basic Information',
          nameHe: 'Name (Hebrew)',
          nameHePlaceholder: 'e.g., Private, Public, Commercial',
          nameEn: 'Name (English)',
          nameEnPlaceholder: 'e.g., Private, Public, Commercial',
          slug: 'Slug',
          slugPlaceholder: 'e.g., private, public, commercial',
          icon: 'Icon',
          iconPlaceholder: 'e.g., 🏠, 🏛️, 🏢',
          order: 'Display Order',
          orderPlaceholder: '0, 1, 2, ...',
          description: 'Description',
          descriptionHe: 'Description (Hebrew)',
          descriptionHePlaceholder: 'Optional description of the category...',
          descriptionEn: 'Description (English)',
          descriptionEnPlaceholder: 'Optional description of the category...',
        },
      },
    },
  },
}

function deepMerge(target: any, source: any): any {
  const result = { ...target }

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }

  return result
}

async function main() {
  console.log('📝 Updating JSON translation files...\n')

  try {
    // Update Hebrew translations
    const hePath = path.join(messagesDir, 'he.json')
    console.log('📖 Reading he.json...')
    const heData = JSON.parse(fs.readFileSync(hePath, 'utf8'))
    console.log('✍️  Merging Hebrew translations...')
    const updatedHe = deepMerge(heData, heTranslations)
    fs.writeFileSync(hePath, JSON.stringify(updatedHe, null, 2) + '\n', 'utf8')
    console.log('✅ Updated he.json\n')

    // Update English translations
    const enPath = path.join(messagesDir, 'en.json')
    console.log('📖 Reading en.json...')
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'))
    console.log('✍️  Merging English translations...')
    const updatedEn = deepMerge(enData, enTranslations)
    fs.writeFileSync(enPath, JSON.stringify(updatedEn, null, 2) + '\n', 'utf8')
    console.log('✅ Updated en.json\n')

    console.log('✅ All translation files updated successfully!')
    console.log('\n🔄 Please restart the dev server for changes to take effect.\n')
  } catch (error: any) {
    console.error('❌ Failed to update translations:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
  .then(() => {
    console.log('✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
