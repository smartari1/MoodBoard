/**
 * AI Image Generation Service
 * Uses Gemini 2.0 Flash Image to generate images for design entities
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Gemini Image Generation Model
const IMAGE_MODEL = 'gemini-2.5-flash-image'

export interface ImageGenerationOptions {
  entityType: 'category' | 'subcategory' | 'approach' | 'roomType' | 'style' | 'style-room'
  entityName: { he: string; en: string }
  description?: { he: string; en: string }
  period?: string
  numberOfImages?: number
  // Style-specific options
  styleContext?: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  // Room-specific options
  roomContext?: {
    roomTypeName: string
    styleName: string
    colorHex: string
  }
  // Image variation type (for generating different angles/perspectives)
  variationType?: 'wide-angle' | 'detail-shot' | 'furniture-arrangement'
}

/**
 * Generate image prompt for design entities
 */
function createImagePrompt(options: ImageGenerationOptions): string {
  const { entityType, entityName, description, period, styleContext, roomContext, variationType } = options

  let prompt = ''

  switch (entityType) {
    case 'style':
      // Generate style images with variation
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

Style: Professional detail photography, macro perspective, dramatic lighting highlighting textures, high-end architectural digest quality.`
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

Style: Professional interior photography, medium shot, natural lighting, architectural digest quality, emphasizing furniture design and spatial relationships.`
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

Style: Professional interior photography, wide angle, high-end, architectural digest quality, natural lighting, showing full room context.`
      }
      break

    case 'style-room':
      // Generate room-specific images for a style
      const { roomTypeName, styleName, colorHex: roomColorHex } = roomContext!

      prompt = `Create a stunning, professional interior design photograph of a ${roomTypeName} designed in the "${styleName}" style.

The image should:
- Show a complete, functional ${roomTypeName} space
- Apply the ${styleName} aesthetic to all room elements
- Prominently feature the primary color (${roomColorHex}) in appropriate surfaces
- Include all essential furniture and fixtures for a ${roomTypeName}
- For kitchens: show cabinets, countertops, appliances, island/dining area
- For bedrooms: show bed, nightstands, wardrobe, seating area
- For living rooms: show seating arrangement, coffee table, entertainment area, storage
- For bathrooms: show vanity, mirror, shower/tub, storage, lighting
- Demonstrate how the style works specifically in this room type
- Feature excellent lighting appropriate to the room function
- Be photorealistic and professionally shot
- Show both aesthetics and functionality

Style: Professional interior photography, architectural digest quality, natural lighting, full room view with focus on ${roomTypeName}-specific design elements and the ${styleName} aesthetic.`
      break

    case 'category':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design category.`
      if (period) {
        prompt += ` This category spans the period ${period}.`
      }
      if (description) {
        prompt += ` ${description.en}`
      }
      prompt += `

The image should:
- Showcase a beautifully designed interior space that embodies this design era/category
- Include rich architectural details, furniture, decor, and materials characteristic of this period
- Feature excellent lighting and composition
- Be photorealistic and professionally shot
- Show a complete, well-styled room or space
- Capture the essence and atmosphere of ${entityName.en} design
- Be suitable for an interior design portfolio or magazine

Style: Professional interior photography, high-end, architectural digest quality, natural lighting, wide angle shot showing full room context.`
      break

    case 'subcategory':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design style.`
      if (period) {
        prompt += ` This style is from ${period}.`
      }
      if (description) {
        prompt += ` ${description.en}`
      }
      prompt += `

The image should:
- Showcase a beautifully designed interior space in the ${entityName.en} style
- Include signature furniture, materials, colors, and decorative elements of this specific style
- Feature excellent lighting and composition
- Be photorealistic and professionally shot
- Show a complete, well-styled room highlighting the style's characteristics
- Capture the unique aesthetic and atmosphere of ${entityName.en}
- Be suitable for an interior design portfolio or magazine

Style: Professional interior photography, high-end, architectural digest quality, natural lighting, showing full room with characteristic ${entityName.en} elements.`
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

Style: Professional interior photography, high-end, architectural digest quality, natural lighting, emphasizing the ${entityName.en} design philosophy.`
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

Style: Professional interior photography, high-end, architectural digest quality, natural lighting, showing full room layout and design.`
      break
  }

  return prompt
}

/**
 * Generate images using Gemini 2.5 Flash Image
 */
export async function generateImages(options: ImageGenerationOptions): Promise<string[]> {
  const numberOfImages = options.numberOfImages || 3
  const prompt = createImagePrompt(options)

  console.log(`\n🎨 Image Generation Request:`)
  console.log(`   Entity: ${options.entityName.he} / ${options.entityName.en}`)
  console.log(`   Type: ${options.entityType}`)
  console.log(`   Images: ${numberOfImages}`)
  console.log(`   Model: ${IMAGE_MODEL}`)
  console.log(`   Prompt: ${prompt.substring(0, 150)}...`)

  const imageDataUrls: string[] = []

  try {
    const model = genAI.getGenerativeModel({ model: IMAGE_MODEL })

    // Generate images one by one (Gemini generates one image per request)
    for (let i = 0; i < numberOfImages; i++) {
      console.log(`   🖼️  Generating image ${i + 1}/${numberOfImages}...`)

      try {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
          },
        })

        const response = result.response

        // Check if the response contains image data
        if (response.candidates && response.candidates[0]) {
          const candidate = response.candidates[0]

          // Look for image parts in the response
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              // Check if part contains inline data (image)
              if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                // Convert base64 image data to data URL
                const imageData = part.inlineData.data
                const mimeType = part.inlineData.mimeType
                const dataUrl = `data:${mimeType};base64,${imageData}`
                imageDataUrls.push(dataUrl)
                console.log(`   ✅ Generated image ${i + 1}/${numberOfImages} (${mimeType})`)
                break
              }
            }
          }
        }

        // Add a small delay between requests to avoid rate limiting
        if (i < numberOfImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`   ❌ Failed to generate image ${i + 1}:`, error instanceof Error ? error.message : String(error))
        // Continue with next image even if one fails
      }
    }

    if (imageDataUrls.length === 0) {
      console.log(`   ⚠️  No images generated with AI, falling back to placeholders`)
      // Fallback to placeholders if generation failed
      for (let i = 0; i < numberOfImages; i++) {
        const encodedName = encodeURIComponent(options.entityName.en)
        const seed = Math.floor(Math.random() * 10000)
        imageDataUrls.push(
          `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${i + 1}&seed=${seed}`
        )
      }
    }

    console.log(`   ✅ Total images generated: ${imageDataUrls.length}`)
    return imageDataUrls

  } catch (error) {
    console.error(`   ❌ Image generation failed:`, error instanceof Error ? error.message : String(error))

    // Return placeholders on error
    const placeholderUrls: string[] = []
    for (let i = 0; i < numberOfImages; i++) {
      const encodedName = encodeURIComponent(options.entityName.en)
      const seed = Math.floor(Math.random() * 10000)
      placeholderUrls.push(
        `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${i + 1}&seed=${seed}`
      )
    }

    console.log(`   ⚠️  Returning ${placeholderUrls.length} placeholder URLs`)
    return placeholderUrls
  }
}

/**
 * Generate images and upload to GCP Storage
 * This function will:
 * 1. Generate images using Gemini AI
 * 2. Upload them to GCP Storage
 * 3. Return the GCP URLs
 */
export async function generateAndUploadImages(
  options: ImageGenerationOptions
): Promise<string[]> {
  try {
    // Generate images (returns data URLs or placeholders)
    const imageDataUrls = await generateImages(options)

    const uploadedUrls: string[] = []

    // Only upload if we got real data URLs from Gemini (not placeholders)
    for (let i = 0; i < imageDataUrls.length; i++) {
      const dataUrl = imageDataUrls[i]

      // Check if it's a placeholder URL (skip upload)
      if (dataUrl.startsWith('https://via.placeholder.com')) {
        console.log(`   ⏭️  Skipping placeholder upload ${i + 1}`)
        uploadedUrls.push(dataUrl)
        continue
      }

      // Check if it's a data URL from Gemini
      if (dataUrl.startsWith('data:image/')) {
        try {
          console.log(`   ☁️  Uploading image ${i + 1} to GCP Storage...`)

          // Extract base64 data and mime type
          const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
          if (!matches) {
            console.error(`   ❌ Invalid data URL format for image ${i + 1}`)
            uploadedUrls.push(dataUrl) // Keep data URL as fallback
            continue
          }

          const mimeType = matches[1]
          const base64Data = matches[2]

          // Convert base64 to buffer
          const buffer = Buffer.from(base64Data, 'base64')

          // Dynamically import GCP upload function (to avoid circular dependencies)
          const { uploadImageToGCP } = await import('@/lib/storage/gcp-storage')

          // Generate a filename
          const extension = mimeType.split('/')[1]
          const filename = `${options.entityName.en.toLowerCase().replace(/\s+/g, '-')}-${i + 1}.${extension}`

          // Upload to GCP Storage
          // Note: Since this is seeding, we don't have an entity ID yet
          // We'll use 'seed' as the entityId to create a temp path
          const gcpUrl = await uploadImageToGCP(
            buffer,
            mimeType,
            options.entityType as any,
            'seed-generated', // temp ID for seed-generated images
            filename
          )

          console.log(`   ✅ Uploaded image ${i + 1}: ${gcpUrl}`)
          uploadedUrls.push(gcpUrl)
        } catch (uploadError) {
          console.error(`   ❌ Failed to upload image ${i + 1}:`, uploadError instanceof Error ? uploadError.message : String(uploadError))
          // Keep data URL as fallback
          uploadedUrls.push(dataUrl)
        }
      } else {
        // Unknown format, keep as is
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
 * Batch generate images for multiple entities
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

      // Add delay between requests to avoid rate limiting
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
 * - Image 1: Wide angle room view
 * - Image 2: Detail shot of materials/textures
 * - Image 3: Furniture arrangement
 */
export async function generateStyleImages(
  styleName: { he: string; en: string },
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  },
  onProgress?: (current: number, total: number, type: string) => void
): Promise<string[]> {
  const variations: Array<{ type: 'wide-angle' | 'detail-shot' | 'furniture-arrangement'; name: string }> = [
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
        variationType: variation.type,
      })

      imageUrls.push(...urls)

      // Add delay between requests
      if (i < variations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`Failed to generate ${variation.name} for ${styleName.en}:`, error)
      // Add placeholder
      const encodedName = encodeURIComponent(styleName.en)
      imageUrls.push(`https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${variation.name}`)
    }
  }

  return imageUrls
}

/**
 * Generate 3 room-specific images for a style in a specific room type
 */
export async function generateStyleRoomImages(
  styleName: { he: string; en: string },
  roomTypeName: string,
  colorHex: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const imageUrls: string[] = []

  for (let i = 0; i < 3; i++) {
    onProgress?.(i + 1, 3)

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
      })

      imageUrls.push(...urls)

      // Add delay between requests
      if (i < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`Failed to generate room image ${i + 1} for ${roomTypeName} in ${styleName.en}:`, error)
      // Add placeholder
      const encodedName = encodeURIComponent(`${styleName.en} ${roomTypeName}`)
      imageUrls.push(`https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}+${i + 1}`)
    }
  }

  return imageUrls
}
