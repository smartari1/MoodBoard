/**
 * AI Image Generation Service (AI SDK Integration)
 *
 * Uses Gemini 2.5 Flash Image for image generation with AI SDK infrastructure:
 * - Telemetry and metrics tracking
 * - Retry logic with exponential backoff
 * - Consistent error handling
 * - Cost estimation
 *
 * Note: Vercel AI SDK doesn't have native image generation support,
 * so we use the direct @google/generative-ai SDK for the actual image API calls
 * while leveraging AI SDK infrastructure for everything else.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  globalMetricsCollector,
  generateOperationId,
  type AIOperationMetrics,
} from './telemetry'
import { AI_MODELS } from './ai-sdk-provider'

// Lazy initialization to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

// Gemini Image Generation Model
const IMAGE_MODEL = AI_MODELS.GEMINI_FLASH_IMAGE

// Cost estimation for image generation (approximate)
const IMAGE_GENERATION_COST_PER_IMAGE = 0.002 // $0.002 per image (estimated)

/**
 * Image generation options
 */
export interface ImageGenerationOptions {
  entityType:
    | 'category'
    | 'subcategory'
    | 'approach'
    | 'roomType'
    | 'style'
    | 'style-room'
    | 'scene'
    | 'material'
    | 'texture'
    | 'composite'
    | 'anchor'
  entityName: { he: string; en: string }
  description?: { he: string; en: string }
  period?: string
  numberOfImages?: number
  priceLevel?: 'REGULAR' | 'LUXURY'
  detailedContent?: {
    introduction?: string
    description?: string
    period?: string
    characteristics?: string[]
    visualElements?: string[]
    philosophy?: string
    colorGuidance?: string
    materialGuidance?: string
    applications?: string[]
    historicalContext?: string
    culturalContext?: string
  }
  styleContext?: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  roomContext?: {
    roomTypeName: string
    styleName: string
    colorHex: string
  }
  sceneContext?: {
    sceneName: string
    complementaryColor?: string
    promptSuffix?: string
  }
  variationType?:
    | 'wide-angle'
    | 'detail-shot'
    | 'furniture-arrangement'
    | 'main'
    | 'opposite'
    | 'left'
    | 'right'
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  }
  referenceImages?: string[]
  aspectRatio?: string
}

/**
 * Image generation result with metrics
 */
export interface ImageGenerationResult {
  images: string[]
  metrics?: AIOperationMetrics
}

/**
 * Fetch image from URL and convert to base64 for Gemini API
 */
async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`Failed to fetch reference image: ${imageUrl}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')

    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return {
      data: base64Data,
      mimeType: contentType,
    }
  } catch (error) {
    console.error(`Error fetching reference image ${imageUrl}:`, error)
    return null
  }
}

/**
 * Generate image prompt for design entities
 */
function createImagePrompt(options: ImageGenerationOptions): string {
  const {
    entityType,
    entityName,
    description,
    period,
    detailedContent,
    styleContext,
    roomContext,
    sceneContext,
    variationType,
    visualContext,
    referenceImages,
  } = options

  let prompt = ''

  switch (entityType) {
    case 'scene':
      const { sceneName, complementaryColor, promptSuffix } = sceneContext!
      const { subCategoryName: scName, approachName: appName, colorName: cName, colorHex: cHex } =
        styleContext!

      prompt = `Create a stunning, professional interior design photograph of a ${sceneName} in the "${entityName.en}" style.

      Style Context:
      - Sub-Category: ${scName}
      - Approach: ${appName}
      - Primary Color: ${cName} (${cHex})
      ${complementaryColor ? `- Accent/Complementary Color: ${complementaryColor}` : ''}

      Scene Description: ${promptSuffix}

      The image should:
      - Be a masterpiece of interior photography
      - Perfect lighting and composition
      - Show the interplay between the primary color and the accent color
      - Capture the mood and atmosphere of the style

      CRITICAL CONSTRAINT: DO NOT include any humans. No people.

      Style: Architectural Digest, High-end, Photorealistic.`
      break

    case 'style':
      const { subCategoryName, approachName, colorName, colorHex } = styleContext!

      if (variationType === 'detail-shot') {
        prompt = `Create a stunning, professional interior design DETAIL PHOTOGRAPH showcasing the "${entityName.en}" design style.

This style combines ${subCategoryName} with a ${approachName} approach, prominently featuring ${colorName} (${colorHex}).

The image should:
- CLOSE-UP focus on materials, textures, and decorative details
- Highlight the use of ${colorName} in fabrics, finishes, or accents
- Show intricate craftsmanship and material quality
- Capture surface textures (wood grain, fabric weave, metal finish, etc.)
- Include signature decorative elements of ${subCategoryName} style
- Feature excellent lighting that emphasizes texture and detail
- Be photorealistic and professionally shot
- Suitable for an interior design portfolio or magazine spread

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor.

Style: Professional detail photography, macro perspective, dramatic lighting highlighting textures, high-end architectural digest quality.`

        if (visualContext) {
          if (visualContext.characteristics && visualContext.characteristics.length > 0) {
            prompt += `\n\nKey Characteristics to showcase in details:\n${visualContext.characteristics.slice(0, 5).map((c) => `- ${c}`).join('\n')}`
          }
          if (visualContext.materialGuidance) {
            prompt += `\n\nMaterial Focus: ${visualContext.materialGuidance}`
          }
          if (visualContext.colorGuidance) {
            prompt += `\n\nColor Palette Details: ${visualContext.colorGuidance}`
          }
        }

        if (referenceImages && referenceImages.length > 0) {
          prompt += `\n\nIMPORTANT: Draw inspiration from the visual aesthetic, material textures, and decorative details characteristic of this sub-category style.`
        }
      } else if (variationType === 'furniture-arrangement') {
        prompt = `Create a stunning, professional interior design photograph focusing on FURNITURE COMPOSITION in the "${entityName.en}" style.

This style combines ${subCategoryName} with a ${approachName} approach, prominently featuring ${colorName} (${colorHex}).

The image should:
- Focus on furniture arrangement and spatial composition
- Show 3-5 key furniture pieces characteristic of ${subCategoryName}
- Demonstrate the ${approachName} approach in furniture selection and placement
- Feature ${colorName} in upholstery, accents, or background elements
- Show how furniture creates functional zones and visual flow
- Include lighting fixtures and accessories that complete the look
- Be photorealistic and professionally shot
- Capture the balance and proportion typical of this style

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, medium shot, natural lighting, architectural digest quality.`

        if (visualContext) {
          if (visualContext.visualElements && visualContext.visualElements.length > 0) {
            prompt += `\n\nSignature Visual Elements to include:\n${visualContext.visualElements.slice(0, 5).map((v) => `- ${v}`).join('\n')}`
          }
          if (visualContext.characteristics && visualContext.characteristics.length > 0) {
            prompt += `\n\nStyle Characteristics:\n${visualContext.characteristics.slice(0, 5).map((c) => `- ${c}`).join('\n')}`
          }
          if (visualContext.colorGuidance) {
            prompt += `\n\nColor Application: ${visualContext.colorGuidance}`
          }
        }

        if (referenceImages && referenceImages.length > 0) {
          prompt += `\n\nIMPORTANT: Use the overall spatial composition, furniture style, and arrangement patterns characteristic of this sub-category as inspiration.`
        }
      } else {
        // Default: wide-angle
        prompt = `Create a stunning, professional interior design photograph representing the complete "${entityName.en}" design style.

This style combines ${subCategoryName} with a ${approachName} approach, prominently featuring ${colorName} (${colorHex}).

The image should:
- WIDE ANGLE view showing the entire room or major section
- Showcase how ${subCategoryName} style is interpreted through a ${approachName} lens
- Prominently feature ${colorName} (${colorHex}) in walls, furniture, or major design elements
- Include signature architectural details, furniture, and decorative elements
- Demonstrate spatial flow and room layout
- Feature excellent natural lighting and composition
- Be photorealistic and professionally shot
- Capture the overall atmosphere and aesthetic of this unique style combination

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, wide angle, high-end, architectural digest quality.`

        if (visualContext) {
          if (visualContext.characteristics && visualContext.characteristics.length > 0) {
            prompt += `\n\nKey Characteristics to showcase:\n${visualContext.characteristics.slice(0, 6).map((c) => `- ${c}`).join('\n')}`
          }
          if (visualContext.visualElements && visualContext.visualElements.length > 0) {
            prompt += `\n\nSignature Visual Elements to include:\n${visualContext.visualElements.slice(0, 6).map((v) => `- ${v}`).join('\n')}`
          }
          if (visualContext.materialGuidance) {
            prompt += `\n\nMaterials & Finishes: ${visualContext.materialGuidance}`
          }
          if (visualContext.colorGuidance) {
            prompt += `\n\nColor Palette Guidance: ${visualContext.colorGuidance}`
          }
        }

        if (referenceImages && referenceImages.length > 0) {
          prompt += `\n\nIMPORTANT: Use the provided reference images as visual inspiration for the overall aesthetic, spatial layout, architectural details, and design elements.`
        }
      }
      break

    case 'style-room':
      const { roomTypeName, styleName: rStyleName, colorHex: roomColorHex } = roomContext!

      let viewPrompt = ''
      if (variationType === 'main') {
        viewPrompt = 'Main view entering the room, showing the focal point.'
      } else if (variationType === 'opposite') {
        viewPrompt = 'Reverse angle view, looking back towards the entrance or opposite wall.'
      } else if (variationType === 'detail-left') {
        viewPrompt = 'Detail view of left side, focusing on furniture arrangement and accessories.'
      } else if (variationType === 'detail-right') {
        viewPrompt = 'Detail view of right side, focusing on furniture arrangement and accessories.'
      } else if (variationType === 'left') {
        viewPrompt = 'View towards the left wall, showing side details.'
      } else if (variationType === 'right') {
        viewPrompt = 'View towards the right wall, showing side details.'
      }

      // Build complete style context section
      const roomPriceLevel = options.priceLevel || 'REGULAR'
      const roomTierKeywords =
        roomPriceLevel === 'LUXURY'
          ? 'High-end finishes, premium materials, designer furniture, luxurious textiles'
          : 'Quality finishes, practical materials, comfortable furniture, accessible elegance'

      const roomStyleSection = styleContext
        ? `
Style Context:
- Style Name: ${rStyleName}
- Design Category: ${styleContext.subCategoryName}
- Design Approach: ${styleContext.approachName}
- Primary Color: ${styleContext.colorName} (${roomColorHex})
- Quality Tier: ${roomPriceLevel}
- Keywords: ${roomTierKeywords}
`
        : `
Style: ${rStyleName}
Primary Color: ${roomColorHex}
Quality Tier: ${roomPriceLevel}
`

      prompt = `Create a stunning, professional interior design photograph of a ${roomTypeName} designed in the "${rStyleName}" style.
${roomStyleSection}
Perspective: ${viewPrompt}

The image should:
- Show a complete, functional ${roomTypeName} space
- Apply the ${rStyleName} aesthetic to all room elements
${styleContext ? `- Embody the ${styleContext.subCategoryName} design category with ${styleContext.approachName} approach` : ''}
- Prominently feature ${styleContext?.colorName || 'the primary color'} (${roomColorHex}) in walls, furniture, or accents
- Include ${roomPriceLevel.toLowerCase()}-tier furniture and fixtures appropriate for a ${roomTypeName}
- Demonstrate how this specific style combination works in a ${roomTypeName}
- Feature excellent lighting appropriate to the room function
- Be photorealistic and professionally shot
- Show both aesthetics and functionality

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, architectural digest quality, natural lighting.`

      if (visualContext) {
        if (visualContext.characteristics && visualContext.characteristics.length > 0) {
          prompt += `\n\nKey Style Characteristics to apply to this ${roomTypeName}:\n${visualContext.characteristics.slice(0, 5).map((c) => `- ${c}`).join('\n')}`
        }
        if (visualContext.visualElements && visualContext.visualElements.length > 0) {
          prompt += `\n\nSignature Elements for this ${roomTypeName}:\n${visualContext.visualElements.slice(0, 5).map((v) => `- ${v}`).join('\n')}`
        }
        if (visualContext.materialGuidance) {
          prompt += `\n\nMaterials to use in ${roomTypeName}: ${visualContext.materialGuidance}`
        }
        if (visualContext.colorGuidance) {
          prompt += `\n\nColor Application in ${roomTypeName}: ${visualContext.colorGuidance}`
        }
      }

      if (referenceImages && referenceImages.length > 0) {
        prompt += `\n\nIMPORTANT: Apply the visual aesthetic and design language from the reference images specifically to this ${roomTypeName} space.`
      }
      break

    case 'material':
      const materialTier = options.priceLevel || 'REGULAR'
      const materialKeywords =
        materialTier === 'LUXURY'
          ? 'Exclusive, Premium, High-end, Artisanal, Precious, Hand-crafted, Designer-grade'
          : 'Quality, Functional, Accessible, Standard, Practical, Cost-effective, Versatile'

      // Include style context if available (for Phase 2 style-specific materials)
      const materialStyleSection = styleContext
        ? `
Style Context (this material is for the "${styleContext.subCategoryName}" style):
- Design Style: ${styleContext.subCategoryName}
- Approach: ${styleContext.approachName}
- Color Scheme: ${styleContext.colorName} (${styleContext.colorHex})

The material should:
- Complement the ${styleContext.subCategoryName} design aesthetic
- Work well with the ${styleContext.approachName} approach
- Harmonize with ${styleContext.colorName} color palette
`
        : ''

      prompt = `Create a stunning, professional CLOSE-UP photograph of ${entityName.en} material.

Price Tier: ${materialTier}
Keywords: ${materialKeywords}
${materialStyleSection}
The image should:
- EXTREME CLOSE-UP showing surface texture, grain, and finish in detail
- Capture the tactile quality and visual character of the material
- Show authentic ${materialTier.toLowerCase()}-tier material quality
- Perfect lighting that highlights texture and surface properties
- Showcase natural variations, patterns, or grain (if applicable)
- Demonstrate the material's finish (matte, glossy, textured, etc.)
- Be photorealistic and professionally shot (macro photography quality)
- Suitable for material library or specification catalog
- Show rich detail that helps designers understand the material

${description?.en ? `Material Description: ${description.en}` : ''}

CRITICAL CONSTRAINT: NO humans, NO furniture, NO room context - ONLY the material surface in extreme close-up detail.

Style: Professional macro photography, studio lighting, high resolution, material swatch documentation.`
      break

    case 'texture':
      const textureTier = options.priceLevel || 'REGULAR'
      const textureFinish = (options as any).finish || 'natural'
      const textureKeywords =
        textureTier === 'LUXURY'
          ? 'Sophisticated, Refined, Premium finish, Artisanal, High-quality'
          : 'Practical, Quality, Accessible, Standard finish, Functional'

      // Include style context if available (for Phase 2 style-specific textures)
      const textureStyleSection = styleContext
        ? `
Style Context (this texture is for the "${styleContext.subCategoryName}" style):
- Design Style: ${styleContext.subCategoryName}
- Approach: ${styleContext.approachName}
- Color Scheme: ${styleContext.colorName} (${styleContext.colorHex})

The texture should:
- Be characteristic of ${styleContext.subCategoryName} design aesthetic
- Complement the ${styleContext.approachName} approach
- Work harmoniously with ${styleContext.colorName} color palette
`
        : ''

      prompt = `Create a stunning, professional CLOSE-UP photograph showcasing "${entityName.en}" texture with ${textureFinish} finish.

Price Tier: ${textureTier}
Finish: ${textureFinish}
Keywords: ${textureKeywords}
${textureStyleSection}
The image should:
- MACRO CLOSE-UP showing the texture's surface pattern and finish
- Capture the visual and tactile character of the ${textureFinish} finish
- Show ${textureTier.toLowerCase()}-tier texture quality and craftsmanship
- Perfect lighting that emphasizes the texture pattern and sheen
- Demonstrate how light interacts with the ${textureFinish} finish
- Show repeating patterns or natural variations (if applicable)
- Be photorealistic and professionally shot (texture documentation quality)
- Suitable for texture library or material specification
- Help designers understand surface feel and visual impact

${description?.en ? `Texture Description: ${description.en}` : ''}

CRITICAL CONSTRAINT: NO humans, NO furniture, NO room context - ONLY the texture surface in detailed close-up.

Style: Professional texture photography, controlled lighting, high detail, material specification quality.`
      break

    case 'composite':
      prompt = `Create a stunning, artistic COMPOSITE photograph that captures the essence of "${entityName.en}" design style.

This is a creative, evocative image that should:
- Combine multiple design elements into an artistic composition
- Show key materials, textures, colors, and objects that define the style
- Create an atmospheric mood board or styled flat-lay aesthetic
- Feature signature materials and decorative objects characteristic of this style
- Use dramatic lighting and artistic composition
- Be visually striking and inspirational
- Work as a hero image or style identity card
- Capture the "feel" and personality of the style in one image
- Mix textures, fabrics, materials, small decor items artistically

${
  styleContext
    ? `
Style Context:
- Sub-Category: ${styleContext.subCategoryName}
- Approach: ${styleContext.approachName}
- Primary Color: ${styleContext.colorName} (${styleContext.colorHex})
`
    : ''
}

${description?.en ? `Style Description: ${description.en}` : ''}

CRITICAL CONSTRAINT: NO humans, NO full room views - Focus on artistic composition of materials, textures, objects, and decorative elements.

Style: Editorial photography, styled flat-lay, artistic composition, mood board aesthetic, magazine cover quality.`
      break

    case 'anchor':
      prompt = `Create a STUNNING, ICONIC photograph that serves as the definitive visual representation of "${entityName.en}" design style.

This is the HERO/ANCHOR image - the single most powerful photograph that embodies this style:
- The ultimate showcase of what makes this style unique and special
- Perfect composition, lighting, and styling
- Shows the style at its absolute best
- Captures the aspirational quality and emotional appeal
- Could be used as the cover image or primary marketing visual
- Makes viewers immediately understand and desire the style
- Features the most photogenic and characteristic space for this style
- Demonstrates the full impact and atmosphere of the style

${
  styleContext
    ? `
Style Context:
- Sub-Category: ${styleContext.subCategoryName}
- Approach: ${styleContext.approachName}
- Primary Color: ${styleContext.colorName} (${styleContext.colorHex})
`
    : ''
}

${description?.en ? `Style Description: ${description.en}` : ''}

The image should be:
- Magazine cover worthy
- Professionally styled and lit to perfection
- The single best representation of this style
- Emotionally resonant and aspirational
- Technically flawless

CRITICAL CONSTRAINT: NO humans - Focus on creating the most stunning, iconic interior space photograph possible.

Style: Hero photography, architectural masterpiece, editorial excellence, portfolio showcase.`
      break

    case 'category':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design category.`

      if (detailedContent?.period || period) {
        prompt += ` This category spans the period: ${detailedContent?.period || period}.`
      }

      if (detailedContent?.introduction) {
        prompt += ` ${detailedContent.introduction}`
      } else if (detailedContent?.description) {
        prompt += ` ${detailedContent.description}`
      } else if (description) {
        prompt += ` ${description.en}`
      }

      if (detailedContent?.historicalContext) {
        prompt += ` Historical Background: ${detailedContent.historicalContext}`
      }

      if (detailedContent?.characteristics && detailedContent.characteristics.length > 0) {
        prompt += `\n\nKey Characteristics to showcase:\n${detailedContent.characteristics.map((c) => `- ${c}`).join('\n')}`
      }

      if (detailedContent?.visualElements && detailedContent.visualElements.length > 0) {
        prompt += `\n\nVisual Elements to include:\n${detailedContent.visualElements.map((v) => `- ${v}`).join('\n')}`
      }

      if (detailedContent?.materialGuidance) {
        prompt += `\n\nMaterials & Finishes: ${detailedContent.materialGuidance}`
      }

      if (detailedContent?.colorGuidance) {
        prompt += `\n\nColor Palette: ${detailedContent.colorGuidance}`
      }

      prompt += `

The image should:
- Showcase a beautifully designed interior space that authentically embodies the ${entityName.en} design category
- Include rich architectural details, furniture, decor, and materials characteristic of this period
- Feature all the key characteristics and visual elements mentioned above
- Use appropriate color palette and materials for this era
- Feature excellent lighting and composition that enhances the period aesthetic
- Be photorealistic and professionally shot (architectural photography quality)
- Show a complete, well-styled room or space with proper context
- Capture the authentic essence, atmosphere, and spirit of ${entityName.en} design
- Be suitable for an interior design portfolio, museum catalog, or architectural digest magazine
- Avoid modern elements that would be anachronistic to this period

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, high-end, architectural digest quality, museum-quality documentation.`
      break

    case 'subcategory':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design style.`

      if (detailedContent?.period || period) {
        prompt += ` This style is from the period: ${detailedContent?.period || period}.`
      }

      if (detailedContent?.introduction) {
        prompt += ` ${detailedContent.introduction}`
      } else if (detailedContent?.description) {
        prompt += ` ${detailedContent.description}`
      } else if (description) {
        prompt += ` ${description.en}`
      }

      if (detailedContent?.historicalContext) {
        prompt += ` Historical Background: ${detailedContent.historicalContext}`
      }

      if (detailedContent?.culturalContext) {
        prompt += ` Cultural Influences: ${detailedContent.culturalContext}`
      }

      if (detailedContent?.characteristics && detailedContent.characteristics.length > 0) {
        prompt += `\n\nKey Characteristics to showcase:\n${detailedContent.characteristics.map((c) => `- ${c}`).join('\n')}`
      }

      if (detailedContent?.visualElements && detailedContent.visualElements.length > 0) {
        prompt += `\n\nSignature Visual Elements to include:\n${detailedContent.visualElements.map((v) => `- ${v}`).join('\n')}`
      }

      if (detailedContent?.materialGuidance) {
        prompt += `\n\nMaterials & Finishes: ${detailedContent.materialGuidance}`
      }

      if (detailedContent?.colorGuidance) {
        prompt += `\n\nColor Palette: ${detailedContent.colorGuidance}`
      }

      if (detailedContent?.philosophy) {
        prompt += `\n\nDesign Philosophy: ${detailedContent.philosophy}`
      }

      if (detailedContent?.applications && detailedContent.applications.length > 0) {
        prompt += `\n\nTypical Applications:\n${detailedContent.applications.map((a) => `- ${a}`).join('\n')}`
      }

      prompt += `

The image should:
- Showcase a beautifully designed interior space that authentically represents the ${entityName.en} style
- Include all signature furniture, materials, colors, and decorative elements of this specific style
- Feature all the key characteristics and visual elements mentioned above
- Use the appropriate color palette and materials for this style
- Demonstrate the design philosophy and approach characteristic of ${entityName.en}
- Feature excellent lighting and composition that enhances the style's aesthetic
- Be photorealistic and professionally shot (architectural photography quality)
- Show a complete, well-styled room highlighting all the style's defining characteristics
- Capture the unique aesthetic, atmosphere, and authentic spirit of ${entityName.en}
- Be suitable for an interior design portfolio, style guide, or architectural digest magazine
- Maintain period accuracy and authenticity

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, high-end, architectural digest quality, design magazine editorial.`
      break

    case 'approach':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design approach/philosophy.`
      if (description) {
        prompt += ` ${description.en}`
      }
      prompt += `

The image should:
- Showcase an interior space designed with the ${entityName.en} approach
- Demonstrate the design principles and philosophy of this approach
- Feature a harmonious blend of elements that exemplify ${entityName.en} design thinking
- Be photorealistic and professionally shot
- Show a complete, well-styled room that embodies this design philosophy
- Capture the essence of the ${entityName.en} approach to interior design
- Be suitable for an interior design portfolio or magazine

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, high-end, architectural digest quality, emphasizing the ${entityName.en} design philosophy.`
      break

    case 'roomType':
      prompt = `Create a stunning, professional interior design photograph of a ${entityName.en}.`
      if (description) {
        prompt += ` ${description.en}`
      }
      prompt += `

The image should:
- Showcase a beautifully designed ${entityName.en}
- Include appropriate furniture, fixtures, and decor for this room type
- Feature excellent lighting and composition
- Be photorealistic and professionally shot
- Show the room's functionality and aesthetic appeal
- Be suitable for an interior design portfolio or magazine

CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image.

Style: Professional interior photography, high-end, architectural digest quality, showing full room layout and design.`
      break
  }

  return prompt
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`   Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Generate images using Gemini 2.5 Flash Image with AI SDK telemetry
 */
export async function generateImages(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const numberOfImages = options.numberOfImages || 3
  const prompt = createImagePrompt(options)
  const operationId = generateOperationId()
  const functionId = `image-generation-${options.entityType}`

  console.log(`\n[AI-SDK] Image Generation Request:`)
  console.log(`   Entity: ${options.entityName.he} / ${options.entityName.en}`)
  console.log(`   Type: ${options.entityType}`)
  console.log(`   Images: ${numberOfImages}`)
  console.log(`   Model: ${IMAGE_MODEL}`)
  console.log(`   Operation ID: ${operationId}`)

  // Start metrics tracking
  globalMetricsCollector.startOperation(operationId, functionId, IMAGE_MODEL)

  const imageDataUrls: string[] = []

  try {
    const model = getGenAI().getGenerativeModel({ model: IMAGE_MODEL })

    // Fetch reference images if provided
    const referenceImageParts: any[] = []
    if (options.referenceImages && options.referenceImages.length > 0) {
      console.log(`   Fetching ${options.referenceImages.length} reference images...`)
      for (const refUrl of options.referenceImages) {
        const imageData = await fetchImageAsBase64(refUrl)
        if (imageData) {
          referenceImageParts.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          })
        }
      }
      console.log(`   Loaded ${referenceImageParts.length} reference images`)
    }

    // Generate images one by one with retry logic
    for (let i = 0; i < numberOfImages; i++) {
      console.log(`   Generating image ${i + 1}/${numberOfImages}...`)

      try {
        const imageUrl = await withRetry(async () => {
          const contentParts: any[] = [...referenceImageParts, { text: prompt }]

          const result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: contentParts,
              },
            ],
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              responseModalities: ['IMAGE'],
              imageConfig: {
                aspectRatio: options.aspectRatio || '4:3',
              },
            } as any,
          })

          const response = result.response

          if (response.candidates && response.candidates[0]) {
            const candidate = response.candidates[0]

            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                  const imageData = part.inlineData.data
                  const mimeType = part.inlineData.mimeType
                  return `data:${mimeType};base64,${imageData}`
                }
              }
            }
          }

          throw new Error('No image data in response')
        })

        imageDataUrls.push(imageUrl)
        console.log(`   Generated image ${i + 1}/${numberOfImages}`)

        // Add delay between requests to avoid rate limiting
        if (i < numberOfImages - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(
          `   Failed to generate image ${i + 1}:`,
          error instanceof Error ? error.message : String(error)
        )
        // Continue with next image even if one fails
      }
    }

    // Complete metrics tracking
    const estimatedCost = imageDataUrls.length * IMAGE_GENERATION_COST_PER_IMAGE
    const metrics = globalMetricsCollector.completeOperation(
      operationId,
      {
        promptTokens: 0, // Image generation doesn't report tokens
        completionTokens: 0,
        totalTokens: 0,
      },
      'stop'
    )

    // Override estimated cost for images
    if (metrics) {
      metrics.estimatedCostUsd = estimatedCost
    }

    if (imageDataUrls.length === 0) {
      console.log(`   No images generated with AI, falling back to placeholders`)
      // Fallback to placeholders if generation failed
      for (let i = 0; i < numberOfImages; i++) {
        const encodedName = encodeURIComponent(options.entityName.en)
        const seed = Math.floor(Math.random() * 10000)
        imageDataUrls.push(
          `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${i + 1}&seed=${seed}`
        )
      }
    }

    console.log(`   Total images generated: ${imageDataUrls.length}`)
    console.log(`   Estimated cost: $${estimatedCost.toFixed(4)}`)

    return {
      images: imageDataUrls,
      metrics,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    globalMetricsCollector.failOperation(operationId, errorMessage)

    console.error(`   Image generation failed:`, errorMessage)

    // Return placeholders on error
    const placeholderUrls: string[] = []
    for (let i = 0; i < numberOfImages; i++) {
      const encodedName = encodeURIComponent(options.entityName.en)
      const seed = Math.floor(Math.random() * 10000)
      placeholderUrls.push(
        `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${i + 1}&seed=${seed}`
      )
    }

    return {
      images: placeholderUrls,
      metrics: undefined,
    }
  }
}

/**
 * Generate images and upload to GCP Storage
 */
export async function generateAndUploadImages(
  options: ImageGenerationOptions
): Promise<string[]> {
  try {
    const result = await generateImages(options)
    const imageDataUrls = result.images

    const uploadedUrls: string[] = []

    for (let i = 0; i < imageDataUrls.length; i++) {
      const dataUrl = imageDataUrls[i]

      // Check if it's a placeholder URL (skip upload)
      if (dataUrl.startsWith('https://via.placeholder.com')) {
        console.log(`   Skipping placeholder upload ${i + 1}`)
        uploadedUrls.push(dataUrl)
        continue
      }

      // Check if it's a data URL from Gemini
      if (dataUrl.startsWith('data:image/')) {
        try {
          console.log(`   Uploading image ${i + 1} to GCP Storage...`)

          const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
          if (!matches) {
            console.error(`   Invalid data URL format for image ${i + 1}`)
            // Don't store base64 - use placeholder instead (MongoDB 16MB limit)
            const encodedName = encodeURIComponent(options.entityName.en)
            const seed = Math.floor(Math.random() * 10000)
            uploadedUrls.push(
              `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${i + 1}&seed=${seed}`
            )
            continue
          }

          const mimeType = matches[1]
          const base64Data = matches[2]
          const buffer = Buffer.from(base64Data, 'base64')

          const { uploadImageToGCP } = await import('@/lib/storage/gcp-storage')

          const extension = mimeType.split('/')[1]
          const filename = `${options.entityName.en.toLowerCase().replace(/\s+/g, '-')}-${i + 1}.${extension}`

          const storageEntityType = options.entityType === 'style-room' ? 'style' : options.entityType
          const uploadOptions: any = {}

          if (options.entityType === 'style-room' && options.roomContext) {
            uploadOptions.roomType = options.roomContext.roomTypeName
          }

          const gcpUrl = await uploadImageToGCP(
            buffer,
            mimeType,
            storageEntityType as any,
            'seed-generated',
            filename,
            uploadOptions
          )

          console.log(`   Uploaded image ${i + 1}: ${gcpUrl}`)
          uploadedUrls.push(gcpUrl)
        } catch (uploadError) {
          console.error(
            `   Failed to upload image ${i + 1}:`,
            uploadError instanceof Error ? uploadError.message : String(uploadError)
          )
          // CRITICAL: Don't store base64 data in MongoDB (16MB limit)
          // Use placeholder URL instead - image can be regenerated later
          const encodedName = encodeURIComponent(options.entityName.en)
          const seed = Math.floor(Math.random() * 10000)
          uploadedUrls.push(
            `https://via.placeholder.com/1200x800/f7f7ed/333333?text=Upload+Failed+${i + 1}&seed=${seed}`
          )
          console.warn(`   ⚠️  Using placeholder for image ${i + 1} - base64 NOT stored (MongoDB limit)`)
        }
      } else {
        uploadedUrls.push(dataUrl)
      }
    }

    return uploadedUrls
  } catch (error) {
    console.error('Error generating and uploading images:', error)
    throw error
  }
}

/**
 * Batch generate images for multiple entities with telemetry
 */
export async function batchGenerateImages<T extends { name: { he: string; en: string } }>(
  items: T[],
  getOptions: (item: T) => Omit<ImageGenerationOptions, 'entityName'>,
  options: {
    delayMs?: number
    onProgress?: (current: number, total: number, item: T) => void
  } = {}
): Promise<Map<string, string[]>> {
  const { delayMs = 1000, onProgress } = options
  const results = new Map<string, string[]>()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemOptions = getOptions(item)

    onProgress?.(i + 1, items.length, item)

    try {
      const imageUrls = await generateAndUploadImages({
        ...itemOptions,
        entityName: item.name,
      })

      results.set(item.name.en, imageUrls)

      if (i < items.length - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.error(`Failed to generate images for ${item.name.en}:`, error)
      results.set(item.name.en, [])
    }
  }

  return results
}

/**
 * Generate 3 general style images with automatic variation
 */
export async function generateStyleImages(
  styleName: { he: string; en: string },
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  },
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  },
  referenceImages?: string[],
  onProgress?: (current: number, total: number, type: string) => void
): Promise<string[]> {
  const variations: Array<{
    type: 'wide-angle' | 'detail-shot' | 'furniture-arrangement'
    name: string
  }> = [
    { type: 'wide-angle', name: 'Wide Angle View' },
    { type: 'detail-shot', name: 'Detail Shot' },
    { type: 'furniture-arrangement', name: 'Furniture Arrangement' },
  ]

  const imageUrls: string[] = []

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i]

    onProgress?.(i + 1, 3, variation.name)

    try {
      const urls = await generateAndUploadImages({
        entityType: 'style',
        entityName: styleName,
        numberOfImages: 1,
        styleContext,
        visualContext,
        referenceImages,
        variationType: variation.type,
      })

      imageUrls.push(...urls)

      if (i < variations.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`Failed to generate ${variation.name} for ${styleName.en}:`, error)
      const encodedName = encodeURIComponent(styleName.en)
      imageUrls.push(
        `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${variation.name}`
      )
    }
  }

  return imageUrls
}

/**
 * Generate 4 room-specific images for a style in a specific room type (spatial walkthrough)
 */
export async function generateStyleRoomImages(
  styleName: { he: string; en: string },
  roomTypeName: string,
  colorHex: string,
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  },
  referenceImages?: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ url: string; orientation: 'main' | 'opposite' | 'left' | 'right' }>> {
  const orientations = ['main', 'opposite', 'left', 'right'] as const
  const results: Array<{ url: string; orientation: 'main' | 'opposite' | 'left' | 'right' }> = []

  for (let i = 0; i < orientations.length; i++) {
    const orientation = orientations[i]
    onProgress?.(i + 1, 4)

    try {
      const urls = await generateAndUploadImages({
        entityType: 'style-room',
        entityName: styleName,
        numberOfImages: 1,
        roomContext: {
          roomTypeName,
          styleName: styleName.en,
          colorHex,
        },
        visualContext,
        referenceImages,
        variationType: orientation,
        aspectRatio: '4:3',
      })

      if (urls.length > 0) {
        results.push({ url: urls[0], orientation })
      } else {
        const encodedName = encodeURIComponent(`${styleName.en} ${roomTypeName} ${orientation}`)
        results.push({
          url: `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}`,
          orientation,
        })
      }

      if (i < orientations.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(
        `Failed to generate room image ${orientation} for ${roomTypeName} in ${styleName.en}:`,
        error
      )
      const encodedName = encodeURIComponent(`${styleName.en} ${roomTypeName} ${orientation}`)
      results.push({
        url: `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}`,
        orientation,
      })
    }
  }

  return results
}

/**
 * Generate golden scenes with varied aspect ratios and shot types
 * PARALLEL: Uses p-limit for concurrent generation (20 parallel requests)
 */
export async function generateGoldenScenes(
  styleName: { he: string; en: string },
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  },
  scenes: Array<{ name: string; promptSuffix: string; complement?: string }>,
  onProgress?: (current: number, total: number, sceneName: string) => void,
  imagesPerScene: number = 5
): Promise<Array<{ sceneName: string; url: string; complement?: string }>> {
  const pLimit = (await import('p-limit')).default
  const limit = pLimit(20) // 20 concurrent requests

  const aspectRatios = ['16:9', '4:3', '1:1', '3:4', '9:16']
  const totalToGenerate = scenes.length * imagesPerScene

  console.log(`\n🚀 PARALLEL Golden Scenes: ${scenes.length} scenes × ${imagesPerScene} images = ${totalToGenerate} total`)
  onProgress?.(0, totalToGenerate, 'Starting parallel generation...')

  // Build all generation tasks
  interface SceneTask {
    scene: { name: string; promptSuffix: string; complement?: string }
    imageIndex: number
    aspectRatio: string
    shotType: string
    shotPrompt: string
  }

  const tasks: SceneTask[] = []
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    for (let j = 0; j < imagesPerScene; j++) {
      const aspectRatio = aspectRatios[(i * imagesPerScene + j) % aspectRatios.length]
      const shotType = j >= 2 ? 'detail' : 'general'
      const shotPrompt = j >= 2
        ? `Close-up detail shot of ${scene.name}, focusing on textures, materials, and intricate design elements. ${scene.promptSuffix}`
        : scene.promptSuffix

      tasks.push({ scene, imageIndex: j, aspectRatio, shotType, shotPrompt })
    }
  }

  // Execute all tasks in parallel with limit
  let completed = 0
  const promises = tasks.map((task) =>
    limit(async () => {
      try {
        const urls = await generateAndUploadImages({
          entityType: 'scene',
          entityName: styleName,
          numberOfImages: 1,
          styleContext,
          aspectRatio: task.aspectRatio,
          sceneContext: {
            sceneName: task.scene.name,
            promptSuffix: task.shotPrompt,
            complementaryColor: task.scene.complement,
          },
          variationType: task.shotType === 'detail' ? 'detail-shot' : 'wide-angle',
        })

        completed++
        onProgress?.(completed, totalToGenerate, `${task.scene.name} (${task.imageIndex + 1})`)

        if (urls.length > 0) {
          console.log(`  ✓ ${task.scene.name} #${task.imageIndex + 1}`)
          return { sceneName: task.scene.name, url: urls[0], complement: task.scene.complement }
        }
        return null
      } catch (error) {
        completed++
        console.error(`  ✗ ${task.scene.name} #${task.imageIndex + 1}:`, error instanceof Error ? error.message : 'Unknown')
        return null
      }
    })
  )

  const results = await Promise.allSettled(promises)

  // Filter successful results
  const successfulResults: Array<{ sceneName: string; url: string; complement?: string }> = []
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      successfulResults.push(result.value)
    }
  }

  console.log(`\n✅ Golden Scenes complete: ${successfulResults.length}/${totalToGenerate} images`)
  return successfulResults
}
