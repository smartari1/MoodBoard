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

/**
 * Fetch image from URL and convert to base64 for Gemini API
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error(`Failed to fetch reference image: ${imageUrl}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString('base64')

    // Determine MIME type from response headers or URL extension
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    return {
      data: base64Data,
      mimeType: contentType
    }
  } catch (error) {
    console.error(`Error fetching reference image ${imageUrl}:`, error)
    return null
  }
}

export interface ImageGenerationOptions {
  entityType: 'category' | 'subcategory' | 'approach' | 'roomType' | 'style' | 'style-room' | 'scene' | 'material' | 'texture' | 'composite' | 'anchor'
  entityName: { he: string; en: string }
  description?: { he: string; en: string }
  period?: string
  numberOfImages?: number
  // Phase 2: Price level for materials/textures
  priceLevel?: 'REGULAR' | 'LUXURY'
  // Enhanced detailed content for richer prompts
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
  // Scene-specific options
  sceneContext?: {
    sceneName: string
    complementaryColor?: string
    promptSuffix?: string
  }
  // Image variation type (for generating different angles/perspectives)
  variationType?: 'wide-angle' | 'detail-shot' | 'furniture-arrangement' | 'main' | 'opposite' | 'left' | 'right'
  // NEW: Visual context from sub-category for style and style-room images
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  }
  // NEW: Reference images from sub-category
  referenceImages?: string[]
  // NEW: Aspect Ratio for generation (e.g., "1:1", "3:4", "4:3", "9:16", "16:9")
  aspectRatio?: string
}

/**
 * Generate image prompt for design entities
 */
function createImagePrompt(options: ImageGenerationOptions): string {
  const { entityType, entityName, description, period, detailedContent, styleContext, roomContext, sceneContext, variationType, visualContext, referenceImages } = options

  let prompt = ''

  switch (entityType) {
    case 'scene':
      // Act 3: Golden Scenes
      const { sceneName, complementaryColor, promptSuffix } = sceneContext!
      const { subCategoryName: scName, approachName: appName, colorName: cName, colorHex: cHex } = styleContext!

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
      
      🚫 CRITICAL CONSTRAINT: DO NOT include any humans. No people.
      
      Style: Architectural Digest, High-end, Photorealistic.`
      break;

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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

Style: Professional detail photography, macro perspective, dramatic lighting highlighting textures, high-end architectural digest quality.`

        // Add visual context from sub-category
        if (visualContext) {
          if (visualContext.characteristics && visualContext.characteristics.length > 0) {
            prompt += `\n\nKey Characteristics to showcase in details:
${visualContext.characteristics.slice(0, 5).map(c => `- ${c}`).join('\n')}`
          }

          if (visualContext.materialGuidance) {
            prompt += `\n\nMaterial Focus: ${visualContext.materialGuidance}`
          }

          if (visualContext.colorGuidance) {
            prompt += `\n\nColor Palette Details: ${visualContext.colorGuidance}`
          }
        }

        // Add reference images instruction
        if (referenceImages && referenceImages.length > 0) {
          prompt += `\n\nIMPORTANT: Draw inspiration from the visual aesthetic, material textures, and decorative details characteristic of this sub-category style. Focus on authentic materials and finishes that define this design approach.`
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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

Style: Professional interior photography, medium shot, natural lighting, architectural digest quality, emphasizing furniture design and spatial relationships.`

        // Add visual context from sub-category
        if (visualContext) {
          if (visualContext.visualElements && visualContext.visualElements.length > 0) {
            prompt += `\n\nSignature Visual Elements to include:
${visualContext.visualElements.slice(0, 5).map(v => `- ${v}`).join('\n')}`
          }

          if (visualContext.characteristics && visualContext.characteristics.length > 0) {
            prompt += `\n\nStyle Characteristics:
${visualContext.characteristics.slice(0, 5).map(c => `- ${c}`).join('\n')}`
          }

          if (visualContext.colorGuidance) {
            prompt += `\n\nColor Application: ${visualContext.colorGuidance}`
          }
        }

        // Add reference images instruction
        if (referenceImages && referenceImages.length > 0) {
          prompt += `\n\nIMPORTANT: Use the overall spatial composition, furniture style, and arrangement patterns characteristic of this sub-category as inspiration for the furniture composition and layout.`
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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

Style: Professional interior photography, wide angle, high-end, architectural digest quality, natural lighting, showing full room context.`

        // Add visual context from sub-category
        if (visualContext) {
          if (visualContext.characteristics && visualContext.characteristics.length > 0) {
            prompt += `\n\nKey Characteristics to showcase:
${visualContext.characteristics.slice(0, 6).map(c => `- ${c}`).join('\n')}`
          }

          if (visualContext.visualElements && visualContext.visualElements.length > 0) {
            prompt += `\n\nSignature Visual Elements to include:
${visualContext.visualElements.slice(0, 6).map(v => `- ${v}`).join('\n')}`
          }

          if (visualContext.materialGuidance) {
            prompt += `\n\nMaterials & Finishes: ${visualContext.materialGuidance}`
          }

          if (visualContext.colorGuidance) {
            prompt += `\n\nColor Palette Guidance: ${visualContext.colorGuidance}`
          }
        }

        // Add reference images instruction
        if (referenceImages && referenceImages.length > 0) {
          prompt += `\n\nIMPORTANT: Use the provided reference images as visual inspiration for the overall aesthetic, spatial layout, architectural details, and design elements characteristic of this style. Match the atmosphere and design language.`
        }
      }
      break

    case 'style-room':
      // Generate room-specific images for a style (Spatial Walkthrough)
      const { roomTypeName, styleName: rStyleName, colorHex: roomColorHex } = roomContext!
      
      let viewPrompt = ''
      if (variationType === 'main') {
        viewPrompt = 'Main view entering the room, showing the focal point.'
      } else if (variationType === 'opposite') {
        viewPrompt = 'Reverse angle view, looking back towards the entrance or opposite wall.'
      } else if (variationType === 'left') {
        viewPrompt = 'View towards the left wall, showing side details.'
      } else if (variationType === 'right') {
        viewPrompt = 'View towards the right wall, showing side details.'
      }

      prompt = `Create a stunning, professional interior design photograph of a ${roomTypeName} designed in the "${rStyleName}" style.
      
      Perspective: ${viewPrompt}

      The image should:
      - Show a complete, functional ${roomTypeName} space
      - Apply the ${rStyleName} aesthetic to all room elements
      - Prominently feature the primary color (${roomColorHex}) in appropriate surfaces
      - Include all essential furniture and fixtures for a ${roomTypeName}
      - Demonstrate how the style works specifically in this room type
      - Feature excellent lighting appropriate to the room function
      - Be photorealistic and professionally shot
      - Show both aesthetics and functionality
      
      🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.
      
      Style: Professional interior photography, architectural digest quality, natural lighting, full room view with focus on ${roomTypeName}-specific design elements and the ${rStyleName} aesthetic.`

      // Add visual context from sub-category
      if (visualContext) {
        if (visualContext.characteristics && visualContext.characteristics.length > 0) {
          prompt += `\n\nKey Style Characteristics to apply to this ${roomTypeName}:
${visualContext.characteristics.slice(0, 5).map(c => `- ${c}`).join('\n')}`
        }

        if (visualContext.visualElements && visualContext.visualElements.length > 0) {
          prompt += `\n\nSignature Elements for this ${roomTypeName}:
${visualContext.visualElements.slice(0, 5).map(v => `- ${v}`).join('\n')}`
        }

        if (visualContext.materialGuidance) {
          prompt += `\n\nMaterials to use in ${roomTypeName}: ${visualContext.materialGuidance}`
        }
      }

      // Add reference images instruction
      if (referenceImages && referenceImages.length > 0) {
        prompt += `\n\nIMPORTANT: Apply the visual aesthetic and design language from the reference images specifically to this ${roomTypeName} space, ensuring consistency with the overall style.`
      }
      break

    case 'material':
      // Phase 2: Generate close-up material images
      const materialTier = options.priceLevel || 'REGULAR'
      const materialKeywords = materialTier === 'LUXURY'
        ? 'Exclusive, Premium, High-end, Artisanal, Precious, Hand-crafted, Designer-grade'
        : 'Quality, Functional, Accessible, Standard, Practical, Cost-effective, Versatile'

      prompt = `Create a stunning, professional CLOSE-UP photograph of ${entityName.en} material.

Price Tier: ${materialTier}
Keywords: ${materialKeywords}

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

🚫 CRITICAL CONSTRAINT: NO humans, NO furniture, NO room context - ONLY the material surface in extreme close-up detail.

Style: Professional macro photography, studio lighting, high resolution, material swatch documentation, architectural detail quality.`
      break

    case 'texture':
      // Phase 2: Generate texture close-up images
      const textureTier = options.priceLevel || 'REGULAR'
      const textureFinish = (options as any).finish || 'natural'
      const textureKeywords = textureTier === 'LUXURY'
        ? 'Sophisticated, Refined, Premium finish, Artisanal, High-quality'
        : 'Practical, Quality, Accessible, Standard finish, Functional'

      prompt = `Create a stunning, professional CLOSE-UP photograph showcasing "${entityName.en}" texture with ${textureFinish} finish.

Price Tier: ${textureTier}
Finish: ${textureFinish}
Keywords: ${textureKeywords}

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

🚫 CRITICAL CONSTRAINT: NO humans, NO furniture, NO room context - ONLY the texture surface in detailed close-up.

Style: Professional texture photography, controlled lighting, high detail, material specification quality, surface documentation.`
      break

    case 'composite':
      // Phase 2: Generate composite images showing style essence
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

${styleContext ? `
Style Context:
- Sub-Category: ${styleContext.subCategoryName}
- Approach: ${styleContext.approachName}
- Primary Color: ${styleContext.colorName} (${styleContext.colorHex})
` : ''}

${description?.en ? `Style Description: ${description.en}` : ''}

🚫 CRITICAL CONSTRAINT: NO humans, NO full room views - Focus on artistic composition of materials, textures, objects, and decorative elements.

Style: Editorial photography, styled flat-lay, artistic composition, mood board aesthetic, magazine cover quality, dramatic lighting.`
      break

    case 'anchor':
      // Phase 2: Generate anchor images (hero/signature shots)
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

${styleContext ? `
Style Context:
- Sub-Category: ${styleContext.subCategoryName}
- Approach: ${styleContext.approachName}
- Primary Color: ${styleContext.colorName} (${styleContext.colorHex})
` : ''}

${description?.en ? `Style Description: ${description.en}` : ''}

The image should be:
- Magazine cover worthy
- Professionally styled and lit to perfection
- The single best representation of this style
- Emotionally resonant and aspirational
- Technically flawless

🚫 CRITICAL CONSTRAINT: NO humans - Focus on creating the most stunning, iconic interior space photograph possible.

Style: Hero photography, architectural masterpiece, editorial excellence, portfolio showcase, award-winning composition, perfect lighting and styling.`
      break

    case 'category':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design category.`

      // Add period information
      if (detailedContent?.period || period) {
        prompt += ` This category spans the period: ${detailedContent?.period || period}.`
      }

      // Add introduction/description
      if (detailedContent?.introduction) {
        prompt += ` ${detailedContent.introduction}`
      } else if (detailedContent?.description) {
        prompt += ` ${detailedContent.description}`
      } else if (description) {
        prompt += ` ${description.en}`
      }

      // Add historical context
      if (detailedContent?.historicalContext) {
        prompt += ` Historical Background: ${detailedContent.historicalContext}`
      }

      // Add characteristics
      if (detailedContent?.characteristics && detailedContent.characteristics.length > 0) {
        prompt += `\n\nKey Characteristics to showcase:
${detailedContent.characteristics.map(c => `- ${c}`).join('\n')}`
      }

      // Add visual elements
      if (detailedContent?.visualElements && detailedContent.visualElements.length > 0) {
        prompt += `\n\nVisual Elements to include:
${detailedContent.visualElements.map(v => `- ${v}`).join('\n')}`
      }

      // Add material guidance
      if (detailedContent?.materialGuidance) {
        prompt += `\n\nMaterials & Finishes: ${detailedContent.materialGuidance}`
      }

      // Add color guidance
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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

Style: Professional interior photography, high-end, architectural digest quality, museum-quality documentation, natural lighting appropriate to the era, wide angle shot showing full room context and spatial relationships.`
      break

    case 'subcategory':
      prompt = `Create a stunning, professional interior design photograph that represents the "${entityName.en}" design style.`

      // Add period information
      if (detailedContent?.period || period) {
        prompt += ` This style is from the period: ${detailedContent?.period || period}.`
      }

      // Add introduction/description
      if (detailedContent?.introduction) {
        prompt += ` ${detailedContent.introduction}`
      } else if (detailedContent?.description) {
        prompt += ` ${detailedContent.description}`
      } else if (description) {
        prompt += ` ${description.en}`
      }

      // Add historical context
      if (detailedContent?.historicalContext) {
        prompt += ` Historical Background: ${detailedContent.historicalContext}`
      }

      // Add cultural context (important for regional styles)
      if (detailedContent?.culturalContext) {
        prompt += ` Cultural Influences: ${detailedContent.culturalContext}`
      }

      // Add characteristics
      if (detailedContent?.characteristics && detailedContent.characteristics.length > 0) {
        prompt += `\n\nKey Characteristics to showcase:
${detailedContent.characteristics.map(c => `- ${c}`).join('\n')}`
      }

      // Add visual elements
      if (detailedContent?.visualElements && detailedContent.visualElements.length > 0) {
        prompt += `\n\nSignature Visual Elements to include:
${detailedContent.visualElements.map(v => `- ${v}`).join('\n')}`
      }

      // Add material guidance
      if (detailedContent?.materialGuidance) {
        prompt += `\n\nMaterials & Finishes: ${detailedContent.materialGuidance}`
      }

      // Add color guidance
      if (detailedContent?.colorGuidance) {
        prompt += `\n\nColor Palette: ${detailedContent.colorGuidance}`
      }

      // Add philosophy (important for design approaches)
      if (detailedContent?.philosophy) {
        prompt += `\n\nDesign Philosophy: ${detailedContent.philosophy}`
      }

      // Add applications
      if (detailedContent?.applications && detailedContent.applications.length > 0) {
        prompt += `\n\nTypical Applications:
${detailedContent.applications.map(a => `- ${a}`).join('\n')}`
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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

Style: Professional interior photography, high-end, architectural digest quality, design magazine editorial, natural lighting that complements the style, wide angle showing full room with all characteristic ${entityName.en} elements clearly visible.`
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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

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

🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.

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

    // Phase 2: Fetch reference images if provided (for multi-image context)
    const referenceImageParts: any[] = []
    if (options.referenceImages && options.referenceImages.length > 0) {
      console.log(`   📸 Fetching ${options.referenceImages.length} reference images...`)
      for (const refUrl of options.referenceImages) {
        const imageData = await fetchImageAsBase64(refUrl)
        if (imageData) {
          referenceImageParts.push({
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data
            }
          })
          console.log(`   ✅ Reference image loaded: ${refUrl.substring(0, 60)}...`)
        }
      }
      console.log(`   ✅ Loaded ${referenceImageParts.length} reference images`)
    }

    // Generate images one by one (Gemini generates one image per request)
    for (let i = 0; i < numberOfImages; i++) {
      console.log(`   🖼️  Generating image ${i + 1}/${numberOfImages}...`)

      try {
        // Build parts array: reference images first, then text prompt
        const contentParts: any[] = [
          ...referenceImageParts,
          { text: prompt }
        ]

        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: contentParts
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: options.aspectRatio || '4:3',
            }
          } as any,
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

          // Handle style-room type by converting to style + roomType option
          const storageEntityType = options.entityType === 'style-room' ? 'style' : options.entityType
          const uploadOptions: any = {}

          // If this is a style-room image, pass the roomType to organize files
          if (options.entityType === 'style-room' && options.roomContext) {
            uploadOptions.roomType = options.roomContext.roomTypeName
          }

          const gcpUrl = await uploadImageToGCP(
            buffer,
            mimeType,
            storageEntityType as any,
            'seed-generated', // temp ID for seed-generated images
            filename,
            uploadOptions
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
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  },
  referenceImages?: string[],
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
        visualContext,
        referenceImages,
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
        aspectRatio: '4:3', // STRICT aspect ratio for room spatial consistency
      })

      if (urls.length > 0) {
        results.push({ url: urls[0], orientation })
      } else {
        // Fallback placeholder
        const encodedName = encodeURIComponent(`${styleName.en} ${roomTypeName} ${orientation}`)
        results.push({ 
          url: `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}`,
          orientation 
        })
      }

      // Add delay between requests
      if (i < orientations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`Failed to generate room image ${orientation} for ${roomTypeName} in ${styleName.en}:`, error)
      // Add placeholder
      const encodedName = encodeURIComponent(`${styleName.en} ${roomTypeName} ${orientation}`)
      results.push({ 
        url: `https://via.placeholder.com/1200x800/f7f7ed/333333?text=${encodedName}`,
        orientation 
      })
    }
  }

  return results
}

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
  const results: Array<{ sceneName: string; url: string; complement?: string }> = []
  
  // Available aspect ratios for variety
  const aspectRatios = ['16:9', '4:3', '1:1', '3:4', '9:16']

  let totalGenerated = 0
  const totalToGenerate = scenes.length * imagesPerScene

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    
    for (let j = 0; j < imagesPerScene; j++) {
      totalGenerated++
      onProgress?.(totalGenerated, totalToGenerate, `${scene.name} (${j + 1}/${imagesPerScene})`)
      
      // Cycle aspect ratios for maximum variety across the gallery
      const aspectRatio = aspectRatios[(i * imagesPerScene + j) % aspectRatios.length]

      // Determine shot type based on index
      // 0-1: General/Wide shots
      // 2-4: Detail/Close-up shots
      let shotType = 'general'
      let shotPrompt = scene.promptSuffix
      
      if (j >= 2) {
        shotType = 'detail'
        shotPrompt = `Close-up detail shot of ${scene.name}, focusing on textures, materials, and intricate design elements. ${scene.promptSuffix}`
      }

      try {
        const urls = await generateAndUploadImages({
          entityType: 'scene',
          entityName: styleName,
          numberOfImages: 1, // Generate one at a time to vary aspect ratio
          styleContext,
          aspectRatio, 
          sceneContext: {
            sceneName: scene.name,
            promptSuffix: shotPrompt,
            complementaryColor: scene.complement
          },
          // Pass variation type to influence prompt construction if needed
          variationType: shotType === 'detail' ? 'detail-shot' : 'wide-angle'
        })

        if (urls.length > 0) {
          results.push({ sceneName: scene.name, url: urls[0], complement: scene.complement })
        }

        // Small delay between generations
        if (totalGenerated < totalToGenerate) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      } catch (error) {
        console.error(`Failed to generate golden scene ${scene.name} image ${j + 1}:`, error)
      }
    }
  }

  return results
}
