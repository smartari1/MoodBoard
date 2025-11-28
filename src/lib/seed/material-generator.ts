/**
 * Phase 2: Material Generator Module
 *
 * Generates Material database entities AND images for styles:
 * 1. Parse required materials from AI content
 * 2. Find or create Material entities with deduplication by name
 * 3. Link materials to textures when possible
 * 4. Generate high-quality material close-up images
 * 5. Create StyleImage records with MATERIAL category
 * 6. Create StyleMaterial links for style-level material associations
 */

import { PrismaClient, ImageCategory } from '@prisma/client'
import {
  generateAndUploadImages,
  smartMatchMaterial,
  MATERIAL_MATCH_CONFIG,
  type AvailableMaterial,
  type AvailableCategory,
  type AvailableType,
  type AvailableTexture,
} from '@/lib/ai'
import crypto from 'crypto'

const prisma = new PrismaClient()

// =============================================================================
// AI Matching Context Cache
// =============================================================================

/**
 * Cached context for AI material matching
 * Loaded once per session to avoid repeated DB queries
 */
let materialMatchContext: {
  materials: AvailableMaterial[]
  categories: AvailableCategory[]
  types: AvailableType[]
  textures: AvailableTexture[]
  loadedAt: number
} | null = null

const CONTEXT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Load or get cached context for AI material matching
 */
async function getMaterialMatchContext(): Promise<{
  availableMaterials: AvailableMaterial[]
  availableCategories: AvailableCategory[]
  availableTypes: AvailableType[]
  availableTextures: AvailableTexture[]
}> {
  // Check if cache is still valid
  if (materialMatchContext && Date.now() - materialMatchContext.loadedAt < CONTEXT_CACHE_TTL) {
    return {
      availableMaterials: materialMatchContext.materials,
      availableCategories: materialMatchContext.categories,
      availableTypes: materialMatchContext.types,
      availableTextures: materialMatchContext.textures,
    }
  }

  console.log('   [Material Matcher] Loading context from database...')

  // Load all materials
  const materials = await prisma.material.findMany({
    include: {
      category: true,
    },
    take: 200, // Limit for prompt size
  })

  const availableMaterials: AvailableMaterial[] = materials.map(m => ({
    id: m.id,
    name: m.name as { he: string; en: string },
    categoryId: m.categoryId,
    categorySlug: m.category?.slug || '',
    categoryName: (m.category?.name as { he: string; en: string }) || { he: '', en: '' },
    typeId: (m.properties as any)?.typeId,
  }))

  // Load all categories
  const categories = await prisma.materialCategory.findMany()
  const availableCategories: AvailableCategory[] = categories.map(c => ({
    id: c.id,
    name: c.name as { he: string; en: string },
    slug: c.slug,
  }))

  // Load all types
  const types = await prisma.materialType.findMany()
  const availableTypes: AvailableType[] = types.map(t => ({
    id: t.id,
    categoryId: t.categoryId,
    name: t.name as { he: string; en: string },
    slug: t.slug,
  }))

  // Load all textures
  const textures = await prisma.texture.findMany({
    take: 100, // Limit for prompt size
  })
  const availableTextures: AvailableTexture[] = textures.map(t => ({
    id: t.id,
    name: t.name as { he: string; en: string },
  }))

  // Cache the context
  materialMatchContext = {
    materials: availableMaterials,
    categories: availableCategories,
    types: availableTypes,
    textures: availableTextures,
    loadedAt: Date.now(),
  }

  console.log(`   [Material Matcher] Loaded: ${availableMaterials.length} materials, ${availableCategories.length} categories, ${availableTypes.length} types, ${availableTextures.length} textures`)

  return {
    availableMaterials,
    availableCategories,
    availableTypes,
    availableTextures,
  }
}

/**
 * Clear the material match context cache
 * Call this after bulk material operations
 */
export function clearMaterialMatchContextCache(): void {
  materialMatchContext = null
  console.log('   [Material Matcher] Context cache cleared')
}

/**
 * English to Hebrew material name translations
 */
const MATERIAL_TRANSLATIONS: Record<string, string> = {
  // Woods
  'wood': 'עץ',
  'oak': 'אלון',
  'oak wood': 'עץ אלון',
  'walnut': 'אגוז',
  'walnut wood': 'עץ אגוז',
  'maple': 'מייפל',
  'teak': 'טיק',
  'pine': 'אורן',
  'mahogany': 'מהגוני',
  'cherry': 'דובדבן',
  'veneer': 'פורניר',

  // Metals
  'metal': 'מתכת',
  'steel': 'פלדה',
  'iron': 'ברזל',
  'wrought iron': 'ברזל יצוק',
  'brass': 'פליז',
  'brass fixtures': 'אביזרי פליז',
  'copper': 'נחושת',
  'bronze': 'ארד',
  'aluminum': 'אלומיניום',
  'nickel': 'ניקל',
  'chrome': 'כרום',
  'gold': 'זהב',
  'gold leaf': 'עלי זהב',
  'silver': 'כסף',
  'silver leaf': 'עלי כסף',

  // Stones
  'stone': 'אבן',
  'marble': 'שיש',
  'carrara marble': 'שיש קררה',
  'marble countertops': 'משטחי שיש',
  'granite': 'גרניט',
  'limestone': 'אבן גיר',
  'limestone flooring': 'ריצוף אבן גיר',
  'travertine': 'טרוורטין',
  'concrete': 'בטון',
  'terrazzo': 'טראצו',

  // Fabrics
  'fabric': 'בד',
  'cotton': 'כותנה',
  'cotton fabric': 'בד כותנה',
  'linen': 'פשתן',
  'linen fabric': 'בד פשתן',
  'silk': 'משי',
  'silk fabric': 'בד משי',
  'velvet': 'קטיפה',
  'velvet fabric': 'בד קטיפה',
  'leather': 'עור',
  'suede': 'זמש',
  'wool': 'צמר',
  'wool rug': 'שטיח צמר',
  'upholstery fabrics': 'בדי ריפוד',
  'lace': 'תחרה',

  // Wall finishes
  'paint': 'צבע',
  'water-based paint': 'צבע מים',
  'plaster': 'טיח',
  'venetian plaster': 'טיח ונציאני',
  'wallpaper': 'טפט',
  'stucco': 'סטוקו',
  'gypsum': 'גבס',

  // Ceramics & tiles
  'ceramic': 'קרמיקה',
  'ceramics': 'קרמיקה',
  'porcelain': 'פורצלן',
  'porcelain tiles': 'אריחי פורצלן',
  'terracotta': 'טרקוטה',
  'tile': 'אריח',
  'tiles': 'אריחים',

  // Glass & mirrors
  'glass': 'זכוכית',
  'mirror': 'מראה',
  'mirrors': 'מראות',
  'crystal': 'קריסטל',
  'crystal chandelier': 'נברשת קריסטל',
}

/**
 * Get Hebrew translation for material name
 */
export function getMaterialNameHebrew(englishName: string): string {
  const nameLower = englishName.toLowerCase().trim()

  // Direct match
  if (MATERIAL_TRANSLATIONS[nameLower]) {
    return MATERIAL_TRANSLATIONS[nameLower]
  }

  // Try partial match
  for (const [en, he] of Object.entries(MATERIAL_TRANSLATIONS)) {
    if (nameLower.includes(en) || en.includes(nameLower)) {
      return he
    }
  }

  // Return English name as fallback
  return englishName
}

/**
 * Material keyword to category mapping (same as texture-generator)
 */
const MATERIAL_TO_CATEGORY: Record<string, string> = {
  // Wall finishes
  'paint': 'wall-finishes',
  'plaster': 'wall-finishes',
  'wallpaper': 'wall-finishes',
  'stucco': 'wall-finishes',

  // Wood
  'wood': 'wood-finishes',
  'oak': 'wood-finishes',
  'walnut': 'wood-finishes',
  'maple': 'wood-finishes',
  'teak': 'wood-finishes',
  'pine': 'wood-finishes',
  'mahogany': 'wood-finishes',
  'cherry': 'wood-finishes',
  'veneer': 'wood-finishes',

  // Metal
  'metal': 'metal-finishes',
  'steel': 'metal-finishes',
  'iron': 'metal-finishes',
  'brass': 'metal-finishes',
  'copper': 'metal-finishes',
  'bronze': 'metal-finishes',
  'aluminum': 'metal-finishes',
  'nickel': 'metal-finishes',
  'chrome': 'metal-finishes',

  // Fabric
  'fabric': 'fabric-textures',
  'cotton': 'fabric-textures',
  'linen': 'fabric-textures',
  'silk': 'fabric-textures',
  'velvet': 'fabric-textures',
  'leather': 'fabric-textures',
  'suede': 'fabric-textures',
  'wool': 'fabric-textures',

  // Stone
  'stone': 'stone-finishes',
  'marble': 'stone-finishes',
  'granite': 'stone-finishes',
  'limestone': 'stone-finishes',
  'travertine': 'stone-finishes',
  'concrete': 'stone-finishes',
  'terrazzo': 'stone-finishes',
}

/**
 * Infer category slug from material name
 */
export function inferMaterialCategory(materialName: string): string {
  const nameLower = materialName.toLowerCase()

  for (const [keyword, category] of Object.entries(MATERIAL_TO_CATEGORY)) {
    if (nameLower.includes(keyword)) {
      return category
    }
  }

  return 'wall-finishes' // Default fallback
}

export interface MaterialSpec {
  name: string
  nameHe?: string
  categorySlug?: string
  priceLevel?: 'REGULAR' | 'LUXURY'
  styleContext?: string // Optional context for AI matching
}

export interface FindOrCreateMaterialOptions {
  generateImage?: boolean
  styleId?: string // If provided, will also create StyleMaterial link
  useAIMatching?: boolean // Use AI for semantic matching (default: true)
}

/**
 * Find or create a Material entity
 * Uses AI-powered semantic matching when exact match fails
 * Deduplication: By NAME (localized) with AI fallback for semantic matching
 */
export async function findOrCreateMaterial(
  spec: MaterialSpec,
  options: FindOrCreateMaterialOptions = {}
): Promise<string> {
  const { name, nameHe, priceLevel = 'REGULAR', styleContext } = spec
  const { useAIMatching = true } = options

  try {
    // =========================================================================
    // Step 1: Try exact match (fast, no AI)
    // =========================================================================
    const existing = await prisma.material.findFirst({
      where: {
        OR: [
          { name: { is: { en: name } } },
          { name: { is: { he: nameHe || name } } },
          // Case-insensitive exact match
          { name: { is: { en: { equals: name, mode: 'insensitive' } } } },
        ]
      }
    })

    if (existing) {
      console.log(`   ♻️  Exact match: ${name} (ID: ${existing.id})`)
      await linkMaterialToStyle(existing.id, options.styleId)
      return existing.id
    }

    // =========================================================================
    // Step 2: Use AI-powered semantic matching
    // =========================================================================
    if (useAIMatching) {
      const context = await getMaterialMatchContext()

      // Use the smart matcher (heuristic first, then AI)
      const match = await smartMatchMaterial(name, context, {
        // Add style context for better matching
      })

      // Handle LINK action
      if (match.action === 'link' && match.matchedMaterialId) {
        const linkedMaterial = await prisma.material.findUnique({
          where: { id: match.matchedMaterialId }
        })

        if (linkedMaterial) {
          console.log(`   🤖 AI matched: "${name}" → "${(linkedMaterial.name as any).en}" (${(match.confidence * 100).toFixed(0)}%)`)
          console.log(`      Reason: ${match.reasoning}`)
          await linkMaterialToStyle(linkedMaterial.id, options.styleId)
          return linkedMaterial.id
        }
      }

      // Handle CREATE action - use AI-inferred properties
      if (match.action === 'create' && match.newMaterial) {
        console.log(`   🤖 AI suggests creating: "${name}"`)
        console.log(`      Reason: ${match.reasoning}`)

        // Generate image if requested
        let imageUrl: string | undefined
        if (options.generateImage) {
          imageUrl = await generateMaterialImage(
            match.newMaterial.name,
            priceLevel
          )
        }

        // Create with AI-inferred properties
        const material = await prisma.material.create({
          data: {
            sku: `AI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            name: match.newMaterial.name,
            categoryId: match.newMaterial.categoryId,
            textureId: match.newMaterial.textureId || null,
            isAbstract: true,
            generationStatus: 'COMPLETED',
            aiDescription: `AI-generated material: ${name}. ${match.reasoning}`,
            properties: {
              typeId: match.newMaterial.typeId, // Properly set by AI!
              subType: match.newMaterial.subType,
              finish: match.newMaterial.finish,
              texture: 'AI-generated',
              technical: { durability: 5, maintenance: 5, sustainability: 5 }
            },
            assets: {
              thumbnail: imageUrl || '',
              images: imageUrl ? [imageUrl] : []
            }
            // No suppliers - materials created with 0 organizations
          }
        })

        console.log(`   ✅ Created material: ${material.id}`)
        console.log(`      Category: ${match.newMaterial.categoryId}, Type: ${match.newMaterial.typeId}`)

        await linkMaterialToStyle(material.id, options.styleId)

        // Clear cache since we added a new material
        clearMaterialMatchContextCache()

        return material.id
      }
    }

    // =========================================================================
    // Step 3: Fallback - create with keyword-based inference (legacy)
    // =========================================================================
    console.log(`   ⚠️  Fallback creation for: ${name}`)

    const categorySlug = spec.categorySlug || inferMaterialCategory(name)
    const materialCategory = await prisma.materialCategory.findFirst({
      where: { slug: categorySlug }
    })
    const defaultCategory = materialCategory || await prisma.materialCategory.findFirst()

    if (!defaultCategory) {
      console.error(`❌ No material categories exist in database`)
      throw new Error(`No material categories exist in database`)
    }

    // Find a type in this category
    const defaultType = await prisma.materialType.findFirst({
      where: { categoryId: defaultCategory.id }
    })

    // Try to find a matching texture by name
    const matchingTexture = await prisma.texture.findFirst({
      where: {
        OR: [
          { name: { is: { en: { contains: name, mode: 'insensitive' } } } },
          { name: { is: { he: { contains: nameHe || name, mode: 'insensitive' } } } },
        ]
      }
    })

    // Generate image if requested
    let imageUrl: string | undefined
    if (options.generateImage) {
      imageUrl = await generateMaterialImage(
        { he: nameHe || name, en: name },
        priceLevel
      )
    }

    // Create new Material entity
    const material = await prisma.material.create({
      data: {
        sku: `AI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        name: { he: nameHe || getMaterialNameHebrew(name), en: name },
        categoryId: defaultCategory.id,
        textureId: matchingTexture?.id || null,
        isAbstract: true,
        generationStatus: 'COMPLETED',
        aiDescription: `AI-generated material (fallback): ${name}`,
        properties: {
          typeId: defaultType?.id || '', // May still be empty if no types exist
          subType: name,
          finish: [],
          texture: 'Generated',
          technical: { durability: 5, maintenance: 5, sustainability: 5 }
        },
        assets: {
          thumbnail: imageUrl || '',
          images: imageUrl ? [imageUrl] : []
        }
      }
    })

    console.log(`   ✅ Created material (fallback): ${material.id}`)

    await linkMaterialToStyle(material.id, options.styleId)

    // Clear cache
    clearMaterialMatchContextCache()

    return material.id

  } catch (error) {
    console.error(`❌ Error creating material "${name}":`, error)
    throw error
  }
}

/**
 * Helper: Link material to style if styleId provided
 */
async function linkMaterialToStyle(materialId: string, styleId?: string): Promise<void> {
  if (!styleId) return

  const existingLink = await prisma.styleMaterial.findUnique({
    where: {
      styleId_materialId: {
        styleId,
        materialId
      }
    }
  })

  if (!existingLink) {
    await prisma.styleMaterial.create({
      data: {
        styleId,
        materialId,
      }
    })
    console.log(`   🔗 Linked material to style`)
  }
}

/**
 * Helper: Generate material image
 */
async function generateMaterialImage(
  name: { he: string; en: string },
  priceLevel: 'REGULAR' | 'LUXURY'
): Promise<string | undefined> {
  try {
    console.log(`   🎨 Generating material image...`)
    const images = await generateAndUploadImages({
      entityType: 'material',
      entityName: name,
      priceLevel,
      numberOfImages: 1,
      aspectRatio: '1:1',
    })

    if (images.length > 0) {
      console.log(`   ✅ Material image generated: ${images[0]}`)
      return images[0]
    }
  } catch (error) {
    console.error(`   ⚠️  Failed to generate material image:`, error)
  }
  return undefined
}

/**
 * Find or create multiple materials for a style
 * Uses AI-powered semantic matching for accurate material linking
 */
export async function findOrCreateMaterialsForStyle(
  styleId: string,
  materialNames: string[],
  options: {
    generateImages?: boolean
    priceLevel?: 'REGULAR' | 'LUXURY'
    maxMaterials?: number
    useAIMatching?: boolean // Use AI for semantic matching (default: true)
    styleContext?: string   // Optional context like "Mediterranean Rustic style"
  } = {}
): Promise<string[]> {
  const { maxMaterials = 10, priceLevel = 'REGULAR', useAIMatching = true, styleContext } = options
  const materialIds: string[] = []

  console.log(`\n🧱 Creating materials for style ${styleId}...`)
  console.log(`   Materials to process: ${materialNames.length}`)
  console.log(`   AI Matching: ${useAIMatching ? 'enabled' : 'disabled'}`)

  // Pre-load AI matching context once for efficiency
  if (useAIMatching) {
    await getMaterialMatchContext()
  }

  // Limit to maxMaterials
  const materialsToCreate = materialNames.slice(0, maxMaterials)

  for (const materialName of materialsToCreate) {
    try {
      // Get Hebrew translation for material name (fallback only)
      const nameHe = getMaterialNameHebrew(materialName)

      const materialId = await findOrCreateMaterial(
        { name: materialName, nameHe, priceLevel, styleContext },
        {
          generateImage: options.generateImages,
          styleId,
          useAIMatching,
        }
      )
      materialIds.push(materialId)

      // Add delay to avoid rate limiting (less delay with heuristic matching)
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`   ⚠️  Failed to create/link material "${materialName}":`, error)
      // Continue with next material
    }
  }

  console.log(`   ✅ Created/linked ${materialIds.length} materials`)
  return materialIds
}

/**
 * Get linked materials for a style
 */
export async function getStyleMaterials(styleId: string) {
  return await prisma.styleMaterial.findMany({
    where: { styleId },
    include: {
      material: {
        include: {
          category: true,
          texture: true,
        }
      }
    }
  })
}

export interface MaterialImageOptions {
  styleId: string
  styleName: { he: string; en: string }
  requiredMaterials: string[] // From AI factual details
  priceLevel: 'REGULAR' | 'LUXURY'
  maxImages?: number
  tags?: string[]
}

/**
 * Generate material close-up images for a style
 */
export async function generateMaterialImages(
  options: MaterialImageOptions
): Promise<string[]> {
  const {
    styleId,
    styleName,
    requiredMaterials,
    priceLevel,
    maxImages = 5,
    tags = [],
  } = options

  console.log(`\n🔬 Generating MATERIAL images for style: ${styleName.en}`)
  console.log(`   Required Materials: ${requiredMaterials.length}`)
  console.log(`   Price Level: ${priceLevel}`)
  console.log(`   Max Images: ${maxImages}`)

  const createdImageUrls: string[] = []

  // Select most important materials (up to maxImages)
  const materialsToGenerate = requiredMaterials.slice(0, maxImages)

  for (let i = 0; i < materialsToGenerate.length; i++) {
    const material = materialsToGenerate[i]

    try {
      console.log(`\n   📸 Generating material ${i + 1}/${materialsToGenerate.length}: ${material}`)

      // Generate material close-up image
      const imageUrls = await generateAndUploadImages({
        entityType: 'material',
        entityName: {
          he: material, // TODO: Add Hebrew translation
          en: material
        },
        description: {
          he: `חומר: ${material}`,
          en: `Material: ${material}`
        },
        priceLevel,
        numberOfImages: 1,
        aspectRatio: '1:1', // Square for material library
      })

      if (imageUrls.length > 0) {
        const imageUrl = imageUrls[0]

        // Create StyleImage record
        const styleImage = await prisma.styleImage.create({
          data: {
            styleId,
            url: imageUrl,
            imageCategory: 'MATERIAL' as ImageCategory,
            displayOrder: i,
            description: `${material} material close-up`,
            tags: [priceLevel, material.toLowerCase(), ...tags],
          }
        })

        createdImageUrls.push(imageUrl)
        console.log(`   ✅ Material image created: ${styleImage.id}`)
      }

      // Add delay to avoid rate limiting
      if (i < materialsToGenerate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } catch (error) {
      console.error(`   ❌ Failed to generate material image for "${material}":`, error)
      // Continue with next material
    }
  }

  console.log(`   ✅ Generated ${createdImageUrls.length} material images`)
  return createdImageUrls
}

/**
 * Get material images for a style
 */
export async function getStyleMaterialImages(styleId: string) {
  return await prisma.styleImage.findMany({
    where: {
      styleId,
      imageCategory: 'MATERIAL'
    },
    orderBy: {
      displayOrder: 'asc'
    }
  })
}

/**
 * Delete material image
 */
export async function deleteMaterialImage(imageId: string) {
  await prisma.styleImage.delete({
    where: { id: imageId }
  })
}

/**
 * Update material image metadata
 */
export async function updateMaterialImage(
  imageId: string,
  updates: {
    description?: string
    tags?: string[]
    displayOrder?: number
  }
) {
  return await prisma.styleImage.update({
    where: { id: imageId },
    data: updates
  })
}
