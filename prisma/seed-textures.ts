/**
 * Phase 2: Seed Texture Categories and Types
 *
 * Creates the base texture categories and types that will be used
 * for texture entity creation during AI generation.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TextureCategoryData {
  name: { he: string; en: string }
  description?: { he: string; en: string }
  slug: string
  order: number
  icon?: string
  types: {
    name: { he: string; en: string }
    description?: { he: string; en: string }
    slug: string
    order: number
  }[]
}

const textureCategories: TextureCategoryData[] = [
  {
    name: { he: 'גימורי קיר', en: 'Wall Finishes' },
    description: {
      he: 'גימורים וטקסטורות לקירות ומשטחים אנכיים',
      en: 'Finishes and textures for walls and vertical surfaces'
    },
    slug: 'wall-finishes',
    order: 1,
    icon: 'wall',
    types: [
      {
        name: { he: 'מט', en: 'Matte' },
        description: { he: 'גימור מט ללא ברק', en: 'Flat matte finish without sheen' },
        slug: 'matte',
        order: 1
      },
      {
        name: { he: 'מבריק', en: 'Glossy' },
        description: { he: 'גימור מבריק עם השתקפות', en: 'Shiny finish with reflection' },
        slug: 'glossy',
        order: 2
      },
      {
        name: { he: 'סאטן', en: 'Satin' },
        description: { he: 'גימור חצי מבריק עם מגע משי', en: 'Semi-gloss finish with silky touch' },
        slug: 'satin',
        order: 3
      },
      {
        name: { he: 'טקסטורה', en: 'Textured' },
        description: { he: 'גימור מחוספס או מובלט', en: 'Rough or embossed finish' },
        slug: 'textured',
        order: 4
      },
      {
        name: { he: 'חלק', en: 'Smooth' },
        description: { he: 'גימור חלק לחלוטין', en: 'Completely smooth finish' },
        slug: 'smooth',
        order: 5
      },
    ]
  },
  {
    name: { he: 'גימורי עץ', en: 'Wood Finishes' },
    description: {
      he: 'גימורים ופוליש למשטחי עץ',
      en: 'Finishes and polish for wood surfaces'
    },
    slug: 'wood-finishes',
    order: 2,
    icon: 'wood',
    types: [
      {
        name: { he: 'טבעי', en: 'Natural' },
        description: { he: 'עץ בגוון טבעי ללא עיבוד', en: 'Natural wood tone without processing' },
        slug: 'natural',
        order: 1
      },
      {
        name: { he: 'לכה', en: 'Lacquered' },
        description: { he: 'גימור לכה מבריק', en: 'High-gloss lacquer finish' },
        slug: 'lacquered',
        order: 2
      },
      {
        name: { he: 'מוברש', en: 'Brushed' },
        description: { he: 'גימור מוברש עם מרקם', en: 'Brushed finish with texture' },
        slug: 'brushed',
        order: 3
      },
      {
        name: { he: 'שמן', en: 'Oiled' },
        description: { he: 'גימור שמן טבעי', en: 'Natural oil finish' },
        slug: 'oiled',
        order: 4
      },
      {
        name: { he: 'מצופה', en: 'Veneered' },
        description: { he: 'ציפוי עץ דק', en: 'Thin wood veneer' },
        slug: 'veneered',
        order: 5
      },
    ]
  },
  {
    name: { he: 'גימורי מתכת', en: 'Metal Finishes' },
    description: {
      he: 'גימורים למשטחי מתכת ואלמנטים מתכתיים',
      en: 'Finishes for metal surfaces and metallic elements'
    },
    slug: 'metal-finishes',
    order: 3,
    icon: 'metal',
    types: [
      {
        name: { he: 'מבריק', en: 'Polished' },
        description: { he: 'מתכת מלוטשת עד ברק', en: 'Metal polished to a shine' },
        slug: 'polished',
        order: 1
      },
      {
        name: { he: 'מוברש', en: 'Brushed' },
        description: { he: 'מתכת עם קווים מוברשים', en: 'Metal with brushed lines' },
        slug: 'brushed',
        order: 2
      },
      {
        name: { he: 'שחור מט', en: 'Matte Black' },
        description: { he: 'גימור שחור מט', en: 'Flat black finish' },
        slug: 'matte-black',
        order: 3
      },
      {
        name: { he: 'ניקל מבריק', en: 'Polished Nickel' },
        description: { he: 'ניקל מלוטש', en: 'Polished nickel' },
        slug: 'polished-nickel',
        order: 4
      },
      {
        name: { he: 'פליז', en: 'Brass' },
        description: { he: 'גימור פליז זהוב', en: 'Golden brass finish' },
        slug: 'brass',
        order: 5
      },
      {
        name: { he: 'נחושת', en: 'Copper' },
        description: { he: 'גימור נחושת', en: 'Copper finish' },
        slug: 'copper',
        order: 6
      },
    ]
  },
  {
    name: { he: 'טקסטורות בד', en: 'Fabric Textures' },
    description: {
      he: 'טקסטורות ומרקמים של בדים וריפוד',
      en: 'Textures and patterns of fabrics and upholstery'
    },
    slug: 'fabric-textures',
    order: 4,
    icon: 'fabric',
    types: [
      {
        name: { he: 'חלק', en: 'Smooth' },
        description: { he: 'בד חלק ללא מרקם', en: 'Smooth fabric without texture' },
        slug: 'smooth',
        order: 1
      },
      {
        name: { he: 'אריגה', en: 'Woven' },
        description: { he: 'בד ארוג עם מרקם בולט', en: 'Woven fabric with prominent texture' },
        slug: 'woven',
        order: 2
      },
      {
        name: { he: 'קטיפה', en: 'Velvet' },
        description: { he: 'קטיפה רכה ומפנקת', en: 'Soft luxurious velvet' },
        slug: 'velvet',
        order: 3
      },
      {
        name: { he: 'פשתן', en: 'Linen' },
        description: { he: 'פשתן טבעי', en: 'Natural linen' },
        slug: 'linen',
        order: 4
      },
      {
        name: { he: 'עור', en: 'Leather' },
        description: { he: 'עור טבעי או סינטטי', en: 'Natural or synthetic leather' },
        slug: 'leather',
        order: 5
      },
      {
        name: { he: 'סואיד', en: 'Suede' },
        description: { he: 'עור זמש', en: 'Suede leather' },
        slug: 'suede',
        order: 6
      },
    ]
  },
  {
    name: { he: 'גימורי אבן', en: 'Stone Finishes' },
    description: {
      he: 'גימורים למשטחי אבן ושיש',
      en: 'Finishes for stone and marble surfaces'
    },
    slug: 'stone-finishes',
    order: 5,
    icon: 'stone',
    types: [
      {
        name: { he: 'מלוטש', en: 'Polished' },
        description: { he: 'אבן מלוטשת עד ברק', en: 'Stone polished to a shine' },
        slug: 'polished',
        order: 1
      },
      {
        name: { he: 'מחוספס', en: 'Honed' },
        description: { he: 'אבן מוחלקת אך לא מבריקה', en: 'Stone smoothed but not glossy' },
        slug: 'honed',
        order: 2
      },
      {
        name: { he: 'טבעי', en: 'Natural' },
        description: { he: 'אבן בגימור טבעי', en: 'Stone in natural finish' },
        slug: 'natural',
        order: 3
      },
      {
        name: { he: 'מחוספס מאוד', en: 'Rough' },
        description: { he: 'אבן גסה ומחוספסת', en: 'Coarse and rough stone' },
        slug: 'rough',
        order: 4
      },
      {
        name: { he: 'בטון', en: 'Concrete' },
        description: { he: 'גימור בטון', en: 'Concrete finish' },
        slug: 'concrete',
        order: 5
      },
    ]
  },
]

async function seedTextureCategories() {
  console.log('🌱 Seeding texture categories and types...')

  let categoriesCreated = 0
  let typesCreated = 0

  for (const catData of textureCategories) {
    console.log(`\n📁 Creating category: ${catData.name.en}...`)

    // Check if category already exists
    const existingCategory = await prisma.textureCategory.findUnique({
      where: { slug: catData.slug }
    })

    let category

    if (existingCategory) {
      console.log(`   ⚠️  Category "${catData.name.en}" already exists, skipping...`)
      category = existingCategory
    } else {
      category = await prisma.textureCategory.create({
        data: {
          name: catData.name,
          description: catData.description,
          slug: catData.slug,
          order: catData.order,
          icon: catData.icon,
        }
      })
      categoriesCreated++
      console.log(`   ✅ Created category: ${catData.name.en}`)
    }

    // Create types for this category
    for (const typeData of catData.types) {
      // Check if type already exists
      const existingType = await prisma.textureType.findFirst({
        where: {
          categoryId: category.id,
          slug: typeData.slug
        }
      })

      if (existingType) {
        console.log(`      ⚠️  Type "${typeData.name.en}" already exists, skipping...`)
      } else {
        await prisma.textureType.create({
          data: {
            name: typeData.name,
            description: typeData.description,
            slug: typeData.slug,
            order: typeData.order,
            categoryId: category.id,
          }
        })
        typesCreated++
        console.log(`      ✅ Created type: ${typeData.name.en}`)
      }
    }
  }

  console.log(`\n🎉 Seeding complete!`)
  console.log(`   Categories created: ${categoriesCreated}`)
  console.log(`   Types created: ${typesCreated}`)
}

// Run the seed function
async function main() {
  try {
    await seedTextureCategories()
  } catch (error) {
    console.error('❌ Error seeding texture categories:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
