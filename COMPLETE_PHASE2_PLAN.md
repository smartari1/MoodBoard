# Phase 2: Complete Style System with Categories & Rich Image Generation

## Overview

Combining two key improvements:

1. **Simple Category System**: Room father categories + Style room category + Luxury/Regular pricing
2. **Rich Image Generation**: Generate 100+ categorized images per style (room overview, materials, textures, composite, anchor)

**Total Images Generated Per Style**: ~105 images
- Room Overview: 60 images (covering different room types)
- Materials: 25 images (wood, tiles, stone, metal, fabric, etc.)
- Textures/Colors: 15 images (matte, glossy, rough, smooth finishes)
- Room Details: 3-5 per room type (drill-down views)
- Composite Mood Board: 1 AI-generated collage
- Anchor Image: 1 fruit/color palette image

---

## Part 1: Database Schema

### 1.1 Add Enums

```prisma
// Price level affects ALL image generation
enum PriceLevel {
  REGULAR   // עממי - Accessible, functional, standard materials
  LUXURY    // יוקרתי - Exclusive, high-end, premium materials
}

// Image categorization for organization
enum ImageCategory {
  ROOM_OVERVIEW     // ~60 images covering different room types
  ROOM_DETAIL       // 3-5 detailed images per specific room
  MATERIAL          // 25 material images (physical elements)
  TEXTURE           // 15 texture/color images (surface finishes)
  COMPOSITE         // 1 AI-generated mood board collage
  ANCHOR            // 1 color palette anchor image
}
```

### 1.2 Update Room Model

```prisma
model Room {
  id              String    @id @default(cuid())
  // ... existing fields ...

  // NEW: Flexible parent category (user-defined)
  parentCategory  String?   // e.g., "Private", "Public", "Commercial", etc.

  @@index([parentCategory])
}
```

### 1.3 Update Style Model

```prisma
model Style {
  id                String        @id @default(cuid())
  // ... existing fields ...

  // NEW: Which room category this style applies to
  roomCategory      String?       // e.g., "Private", "Public", "Commercial"

  // NEW: Price level (affects ALL image generation)
  priceLevel        PriceLevel    @default(REGULAR)

  // NEW: Composite and anchor images
  compositeImageUrl String?       // AI-generated mood board
  anchorImageUrl    String?       // AI-generated color anchor

  @@index([roomCategory])
  @@index([priceLevel])
}
```

### 1.4 Update StyleImage Model

```prisma
model StyleImage {
  id              String          @id @default(cuid())
  url             String
  styleId         String
  style           Style           @relation(fields: [styleId], references: [id], onDelete: Cascade)

  // NEW: Categorization
  imageCategory   ImageCategory   @default(ROOM_OVERVIEW)
  displayOrder    Int             @default(0)

  // NEW: Metadata
  description     String?         // For materials/textures
  tags            String[]        @default([])
  roomType        String?         // Which room type this represents

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([styleId, imageCategory, displayOrder])
  @@index([imageCategory])
}
```

---

## Part 2: AI Generation Strategy

### 2.1 Generation Flow

When seeding a style, generate images in this order:

```
1. Generate Text Content (with luxury/regular keywords)
   ↓
2. Generate Room Overview Images (60 images)
   - Different room types based on roomCategory
   - Luxury/Regular affects quality, materials shown
   ↓
3. Generate Material Images (25 images)
   - Wood, tiles, stone, metal, fabric, etc.
   - Luxury: Marble, custom wood, designer tiles
   - Regular: Laminate, standard tiles, practical materials
   ↓
4. Generate Texture/Color Images (15 images)
   - Matte, glossy, rough, smooth finishes
   - Color swatches in context (not plain squares)
   ↓
5. Generate Room Detail Images (3-5 per room type)
   - Detailed views of specific rooms
   ↓
6. Generate Composite Mood Board (1 image)
   - Pinterest-style collage of all above
   ↓
7. Generate Anchor Image (1 image)
   - Fruit on color palette
```

### 2.2 Price Level Impact on Prompts

**Base Prompt Template**:
```typescript
function buildImagePrompt(params: {
  styleDescriptor: string
  priceLevel: PriceLevel
  imageCategory: ImageCategory
  specificElement?: string // e.g., "oak flooring" or "living room"
}): string {
  const priceLevelModifiers = getPriceLevelModifiers(params.priceLevel)

  let prompt = `Generate a high-quality interior design photograph.
Style: ${params.styleDescriptor}
${priceLevelModifiers}
`

  // Category-specific additions
  switch (params.imageCategory) {
    case 'ROOM_OVERVIEW':
      prompt += `
Room Type: ${params.specificElement}
Show: Full room view, furniture layout, lighting, overall aesthetic
${params.priceLevel === 'LUXURY'
  ? 'Include: Custom furniture, designer pieces, premium finishes, sophisticated details'
  : 'Include: Functional furniture, smart layouts, practical solutions, accessible design'
}
`
      break

    case 'MATERIAL':
      prompt += `
Material: ${params.specificElement}
Show: Close-up texture, realistic material shot, mood board style
${params.priceLevel === 'LUXURY'
  ? 'Focus on: Premium materials (marble, custom wood, designer tiles), high-end finishes'
  : 'Focus on: Standard materials (laminate, ceramic, engineered wood), practical finishes'
}
Do NOT show plain color squares. Show material in realistic, atmospheric context.
`
      break

    case 'TEXTURE':
      prompt += `
Texture/Color: ${params.specificElement}
Show: Surface finish in realistic context (fabric draping, wall texture, etc.)
${params.priceLevel === 'LUXURY'
  ? 'Emphasize: Rich textures, sophisticated colors, premium finishes'
  : 'Emphasize: Practical finishes, versatile colors, durable textures'
}
Do NOT show plain color squares. Show in atmospheric, realistic setting.
`
      break

    case 'ROOM_DETAIL':
      prompt += `
Detailed view of: ${params.specificElement}
Show: Specific area or feature of the room, close-up details
${priceLevelModifiers}
`
      break

    case 'COMPOSITE':
      prompt += `
Create a Pinterest-style mood board collage combining multiple images.
Layout: Artistic arrangement with varied sizes, subtle overlaps
Include: Room views, materials, textures in cohesive composition
${priceLevelModifiers}
`
      break

    case 'ANCHOR':
      prompt += `
Create an artistic still-life with fresh fruit on surfaces featuring the color palette.
Style: Photography-realistic, luxurious, design-oriented
Colors: [extracted from style]
`
      break
  }

  return prompt
}

function getPriceLevelModifiers(priceLevel: PriceLevel): string {
  if (priceLevel === 'LUXURY') {
    return `
Price Level: LUXURY (יוקרתי)
Keywords: Exclusive, High-end, Custom-made, Sophisticated, Premium materials, Designer pieces, Bespoke elements
Materials: Marble, solid wood, designer tiles, premium fabrics, custom joinery
Furniture: Designer pieces, custom-made, high-end brands
Lighting: Statement fixtures, designer lamps, premium finishes
Details: Sophisticated, refined, luxurious touches
`
  }

  return `
Price Level: REGULAR (עממי)
Keywords: Accessible, Functional, Smart solutions, Standard materials, Cost-effective, Practical, Value-focused
Materials: Laminate, ceramic tiles, engineered wood, practical fabrics
Furniture: Ready-made, functional, accessible brands
Lighting: Standard fixtures, practical solutions
Details: Comfortable, practical, smart design choices
`
}
```

### 2.3 Material & Texture Lists

**Materials to Generate (25 images)**: Based on price level

**LUXURY Materials**:
- Marble (various types: Calacatta, Carrara, etc.)
- Solid wood (walnut, oak, exotic woods)
- Designer tiles (large format, unique patterns)
- Premium fabrics (velvet, silk, high-end upholstery)
- Custom metalwork (brass, bronze accents)
- Natural stone (travertine, limestone)
- Designer wallcoverings
- Premium glass (textured, colored)
- Custom joinery details
- High-end hardware (handles, fixtures)

**REGULAR Materials**:
- Laminate flooring (wood-look)
- Ceramic tiles (standard formats)
- Engineered wood
- Practical fabrics (linen, cotton, durable synthetics)
- Standard metal fixtures (chrome, brushed nickel)
- Painted walls
- Standard wallpapers
- Standard glass
- Ready-made cabinetry
- Standard hardware

**Textures to Generate (15 images)**: Surface finishes

- Matte paint finish
- Glossy finish
- Brushed metal
- Smooth plaster
- Textured wall finish
- Wood grain close-up
- Fabric weave (in draping context)
- Stone texture
- Concrete finish
- Leather texture
- Soft textile (cushion, curtain)
- Rough natural texture
- Polished surface
- Patterned surface
- Color gradient (in realistic setting)

**Important**: All materials and textures shown as **mood board images** (realistic, atmospheric), NOT plain squares.

---

## Part 3: Implementation - Seed Service

### 3.1 Enhanced Seed Flow

**File**: `src/lib/seed/seed-service.ts`

```typescript
export async function seedStyles(params: SeedStylesParams) {
  const {
    styleNames,
    roomCategory,
    priceLevel = 'REGULAR',
    locale = 'he',
    organizationId,
    generateAllImages = true, // NEW: Toggle full image generation
  } = params

  for (const styleName of styleNames) {
    console.log(`\n🎨 Generating style: ${styleName} (${priceLevel})`)

    // 1. Generate text content
    console.log('  📝 Generating text content...')
    const detailedContent = await generateDetailedContent({
      styleName,
      roomCategory,
      priceLevel,
      locale,
    })

    // 2. Create style record
    const style = await prisma.style.create({
      data: {
        name: styleName,
        nameEn: detailedContent.nameEn,
        roomCategory,
        priceLevel,
        description: detailedContent.description,
        factualDetails: detailedContent.factualDetails,
        websiteInfo: detailedContent.websiteInfo,
        executiveSummary: detailedContent.executiveSummary,
        organizationId,
      }
    })

    console.log(`  ✅ Style created: ${style.id}`)

    if (generateAllImages) {
      // 3. Generate Room Overview Images (60)
      console.log('  🏠 Generating room overview images (0/60)...')
      await generateRoomOverviewImages({
        style,
        priceLevel,
        roomCategory,
        count: 60,
        onProgress: (current) => {
          console.log(`  🏠 Generating room overview images (${current}/60)...`)
        }
      })

      // 4. Generate Material Images (25)
      console.log('  🪨 Generating material images (0/25)...')
      await generateMaterialImages({
        style,
        priceLevel,
        count: 25,
        onProgress: (current) => {
          console.log(`  🪨 Generating material images (${current}/25)...`)
        }
      })

      // 5. Generate Texture Images (15)
      console.log('  🎨 Generating texture images (0/15)...')
      await generateTextureImages({
        style,
        priceLevel,
        count: 15,
        onProgress: (current) => {
          console.log(`  🎨 Generating texture images (${current}/15)...`)
        }
      })

      // 6. Generate Composite Mood Board (1)
      console.log('  📋 Generating composite mood board...')
      const compositeUrl = await generateCompositeMoodBoard({
        style,
        images: await getStyleImages(style.id), // All generated images
      })
      await prisma.style.update({
        where: { id: style.id },
        data: { compositeImageUrl: compositeUrl }
      })

      // 7. Generate Anchor Image (1)
      console.log('  🍎 Generating anchor image...')
      const anchorUrl = await generateAnchorImage({
        style,
        colorPalette: await extractColorPalette(style.id),
      })
      await prisma.style.update({
        where: { id: style.id },
        data: { anchorImageUrl: anchorUrl }
      })

      console.log(`  ✅ All images generated for ${styleName}`)
      console.log(`     Total: ${60 + 25 + 15 + 1 + 1} = 102 images`)
    }
  }

  console.log('\n✅ Style seeding complete!')
}
```

### 3.2 Room Overview Generation

```typescript
async function generateRoomOverviewImages(params: {
  style: Style
  priceLevel: PriceLevel
  roomCategory: string | null
  count: number
  onProgress?: (current: number) => void
}): Promise<void> {
  // Define room types based on room category
  const roomTypes = getRoomTypesByCategory(params.roomCategory)

  // Distribute 60 images across room types
  // e.g., Living: 10, Kitchen: 8, Bedroom: 10, Bathroom: 8, etc.
  const distribution = distributeImagesAcrossRooms(roomTypes, params.count)

  let currentCount = 0

  for (const [roomType, imageCount] of Object.entries(distribution)) {
    for (let i = 0; i < imageCount; i++) {
      const prompt = buildImagePrompt({
        styleDescriptor: params.style.factualDetails || params.style.description,
        priceLevel: params.priceLevel,
        imageCategory: 'ROOM_OVERVIEW',
        specificElement: roomType,
      })

      // Generate image
      const imageUrl = await generateImage({
        prompt,
        aspectRatio: getRandomAspectRatio(), // Varied aspect ratios
      })

      // Save to database
      await prisma.styleImage.create({
        data: {
          url: imageUrl,
          styleId: params.style.id,
          imageCategory: 'ROOM_OVERVIEW',
          displayOrder: currentCount,
          roomType: roomType,
          tags: [roomType, params.priceLevel.toLowerCase()],
        }
      })

      currentCount++
      params.onProgress?.(currentCount)

      // Small delay to avoid rate limits
      await delay(500)
    }
  }
}

function getRoomTypesByCategory(roomCategory: string | null): string[] {
  // Default room types for any category
  const baseRoomTypes = [
    'living-room',
    'kitchen',
    'dining-room',
    'bedroom',
    'master-bedroom',
    'bathroom',
    'guest-bathroom',
    'hallway',
    'entrance',
    'balcony',
  ]

  // Add category-specific rooms
  if (roomCategory === 'Public' || roomCategory === 'Commercial') {
    return [
      ...baseRoomTypes,
      'office-space',
      'meeting-room',
      'reception',
      'waiting-area',
      'cafe-area',
    ]
  }

  return baseRoomTypes
}

function distributeImagesAcrossRooms(
  roomTypes: string[],
  totalImages: number
): Record<string, number> {
  // Prioritize main rooms
  const priorityRooms = ['living-room', 'kitchen', 'bedroom', 'bathroom']

  const distribution: Record<string, number> = {}

  // Give priority rooms more images
  const imagesPerPriorityRoom = Math.floor(totalImages * 0.6 / priorityRooms.length)
  priorityRooms.forEach(room => {
    distribution[room] = imagesPerPriorityRoom
  })

  // Distribute remaining to other rooms
  const remainingImages = totalImages - (imagesPerPriorityRoom * priorityRooms.length)
  const otherRooms = roomTypes.filter(r => !priorityRooms.includes(r))
  const imagesPerOtherRoom = Math.floor(remainingImages / otherRooms.length)

  otherRooms.forEach(room => {
    distribution[room] = imagesPerOtherRoom
  })

  return distribution
}

function getRandomAspectRatio(): string {
  const ratios = ['16:9', '4:3', '1:1', '3:4', '9:16']
  return ratios[Math.floor(Math.random() * ratios.length)]
}
```

### 3.3 Material Generation

```typescript
async function generateMaterialImages(params: {
  style: Style
  priceLevel: PriceLevel
  count: number
  onProgress?: (current: number) => void
}): Promise<void> {
  const materials = getMaterialsByPriceLevel(params.priceLevel)

  for (let i = 0; i < params.count; i++) {
    const material = materials[i % materials.length]

    const prompt = buildImagePrompt({
      styleDescriptor: params.style.factualDetails || params.style.description,
      priceLevel: params.priceLevel,
      imageCategory: 'MATERIAL',
      specificElement: material.name,
    })

    const imageUrl = await generateImage({
      prompt,
      aspectRatio: '4:3', // Standard for materials
    })

    await prisma.styleImage.create({
      data: {
        url: imageUrl,
        styleId: params.style.id,
        imageCategory: 'MATERIAL',
        displayOrder: i,
        description: material.description,
        tags: ['material', material.type, params.priceLevel.toLowerCase()],
      }
    })

    params.onProgress?.(i + 1)
    await delay(500)
  }
}

function getMaterialsByPriceLevel(priceLevel: PriceLevel) {
  if (priceLevel === 'LUXURY') {
    return [
      { name: 'Calacatta marble', description: 'Premium white marble with grey veining', type: 'stone' },
      { name: 'Solid walnut wood', description: 'Rich dark hardwood', type: 'wood' },
      { name: 'Brass fixtures', description: 'Polished brass hardware', type: 'metal' },
      { name: 'Velvet upholstery', description: 'Luxurious velvet fabric', type: 'fabric' },
      { name: 'Large format porcelain', description: 'Designer oversized tiles', type: 'tile' },
      // ... 20 more luxury materials
    ]
  }

  return [
    { name: 'Ceramic tile', description: 'Standard white ceramic', type: 'tile' },
    { name: 'Laminate flooring', description: 'Wood-look laminate', type: 'flooring' },
    { name: 'Painted drywall', description: 'Matte wall finish', type: 'wall' },
    { name: 'Chrome fixtures', description: 'Standard chrome hardware', type: 'metal' },
    { name: 'Linen fabric', description: 'Natural linen upholstery', type: 'fabric' },
    // ... 20 more regular materials
  ]
}
```

### 3.4 Texture Generation

```typescript
async function generateTextureImages(params: {
  style: Style
  priceLevel: PriceLevel
  count: number
  onProgress?: (current: number) => void
}): Promise<void> {
  const textures = getTexturesByPriceLevel(params.priceLevel)

  for (let i = 0; i < params.count; i++) {
    const texture = textures[i % textures.length]

    const prompt = buildImagePrompt({
      styleDescriptor: params.style.factualDetails || params.style.description,
      priceLevel: params.priceLevel,
      imageCategory: 'TEXTURE',
      specificElement: texture.name,
    })

    const imageUrl = await generateImage({
      prompt,
      aspectRatio: '1:1', // Square for textures
    })

    await prisma.styleImage.create({
      data: {
        url: imageUrl,
        styleId: params.style.id,
        imageCategory: 'TEXTURE',
        displayOrder: i,
        description: texture.description,
        tags: ['texture', texture.type, params.priceLevel.toLowerCase()],
      }
    })

    params.onProgress?.(i + 1)
    await delay(500)
  }
}

function getTexturesByPriceLevel(priceLevel: PriceLevel) {
  // Textures are similar but shown differently based on price level
  return [
    { name: 'Matte white finish', description: 'Smooth matte paint', type: 'surface' },
    { name: 'Glossy surface', description: 'High-gloss finish', type: 'surface' },
    { name: 'Brushed metal', description: 'Linear metal texture', type: 'metal' },
    { name: 'Wood grain', description: 'Natural wood texture', type: 'wood' },
    { name: 'Fabric weave', description: 'Textile close-up', type: 'fabric' },
    { name: 'Stone texture', description: 'Natural stone surface', type: 'stone' },
    { name: 'Plaster finish', description: 'Smooth plaster wall', type: 'wall' },
    { name: 'Concrete', description: 'Raw concrete texture', type: 'industrial' },
    { name: 'Leather', description: 'Leather upholstery detail', type: 'fabric' },
    { name: 'Soft textile', description: 'Cushion or curtain fabric', type: 'fabric' },
    { name: 'Rough natural', description: 'Rough stone or bark', type: 'natural' },
    { name: 'Polished surface', description: 'Glossy polished material', type: 'surface' },
    { name: 'Patterned', description: 'Geometric or organic pattern', type: 'decorative' },
    { name: 'Color gradient', description: 'Subtle color transition', type: 'color' },
    { name: 'Metallic sheen', description: 'Reflective metallic surface', type: 'metal' },
  ]
}
```

### 3.5 Composite & Anchor Generation

```typescript
async function generateCompositeMoodBoard(params: {
  style: Style
  images: StyleImage[]
}): Promise<string> {
  // Get sample images from each category
  const sampleImages = {
    rooms: params.images.filter(i => i.imageCategory === 'ROOM_OVERVIEW').slice(0, 12),
    materials: params.images.filter(i => i.imageCategory === 'MATERIAL').slice(0, 8),
    textures: params.images.filter(i => i.imageCategory === 'TEXTURE').slice(0, 5),
  }

  const imageUrls = [
    ...sampleImages.rooms.map(i => i.url),
    ...sampleImages.materials.map(i => i.url),
    ...sampleImages.textures.map(i => i.url),
  ]

  const prompt = `
Create a Pinterest-style interior design mood board collage.
Style: ${params.style.name}

Combine these ${imageUrls.length} images into a cohesive, artistic composition:
- Use varied image sizes and arrangements
- Create visual balance and flow
- Add subtle borders or shadows for depth
- Maintain the style's aesthetic throughout
- Size: 1920x1080px landscape

Images to combine:
${imageUrls.join('\n')}

Output: A single, high-quality composite image that represents the complete design language.
`

  const imageUrl = await generateImage({
    prompt,
    aspectRatio: '16:9',
    quality: 'high',
  })

  return imageUrl
}

async function generateAnchorImage(params: {
  style: Style
  colorPalette: string[]
}): Promise<string> {
  const prompt = `
Create an artistic still-life photograph featuring fresh, appealing fruit on surfaces incorporating these colors:
${params.colorPalette.join(', ')}

Style: Interior design mood board aesthetic
Features: Vibrant fruit (pomegranates, figs, oranges), luxurious lighting
Color integration: Background, surface, or lighting should feature the palette
Size: 800x600px
Quality: High-end photography, sophisticated composition
`

  const imageUrl = await generateImage({
    prompt,
    aspectRatio: '4:3',
    quality: 'high',
  })

  return imageUrl
}

async function extractColorPalette(styleId: string): Promise<string[]> {
  // Extract dominant colors from style images
  const images = await prisma.styleImage.findMany({
    where: { styleId, imageCategory: 'ROOM_OVERVIEW' },
    take: 10,
  })

  // Use color extraction library (e.g., node-vibrant)
  const colors: string[] = []
  for (const image of images) {
    const palette = await extractColorsFromImage(image.url)
    colors.push(...palette)
  }

  // Return top 6-8 unique colors
  return [...new Set(colors)].slice(0, 8)
}
```

---

## Part 4: UI Updates

### 4.1 Admin: Style Form Updates

**File**: `src/app/[locale]/admin/styles/[id]/edit/page.tsx`

```typescript
<Stack spacing="md">
  {/* Room Category */}
  <Select
    label={t('style.room-category')}
    value={formData.roomCategory || ''}
    onChange={(value) => setValue('roomCategory', value)}
    data={[
      { value: 'Private', label: t('categories.private') },
      { value: 'Public', label: t('categories.public') },
      { value: 'Commercial', label: t('categories.commercial') },
    ]}
    clearable
    placeholder={t('style.select-room-category')}
  />

  {/* Price Level */}
  <SegmentedControl
    label={t('style.price-level')}
    value={formData.priceLevel}
    onChange={(value) => setValue('priceLevel', value as PriceLevel)}
    data={[
      {
        value: 'REGULAR',
        label: (
          <Center>
            <IconHome size={16} />
            <Box ml={10}>{t('price-level.regular')}</Box>
          </Center>
        ),
      },
      {
        value: 'LUXURY',
        label: (
          <Center>
            <IconDiamond size={16} />
            <Box ml={10}>{t('price-level.luxury')}</Box>
          </Center>
        ),
      },
    ]}
    fullWidth
  />

  {/* Price Level Description */}
  <Alert
    icon={formData.priceLevel === 'LUXURY' ? <IconDiamond size={16} /> : <IconHome size={16} />}
    color={formData.priceLevel === 'LUXURY' ? 'yellow' : 'blue'}
  >
    {formData.priceLevel === 'LUXURY'
      ? t('price-level.luxury-description')
      : t('price-level.regular-description')}
  </Alert>

  {/* Image Generation Summary */}
  {mode === 'create' && (
    <Paper p="md" withBorder>
      <Text weight={500} mb="xs">{t('style.image-generation-summary')}</Text>
      <List size="sm" spacing="xs">
        <List.Item>{t('style.will-generate-overview', { count: 60 })}</List.Item>
        <List.Item>{t('style.will-generate-materials', { count: 25 })}</List.Item>
        <List.Item>{t('style.will-generate-textures', { count: 15 })}</List.Item>
        <List.Item>{t('style.will-generate-composite')}</List.Item>
        <List.Item>{t('style.will-generate-anchor')}</List.Item>
      </List>
      <Text size="sm" color="dimmed" mt="xs">
        {t('style.total-images', { total: 102 })}
      </Text>
    </Paper>
  )}

  {/* Existing Images (if edit mode) */}
  {mode === 'edit' && (
    <Tabs defaultValue="overview">
      <Tabs.List>
        <Tabs.Tab value="overview" icon={<IconHome size={14} />}>
          {t('images.overview')} ({overviewImages.length}/60)
        </Tabs.Tab>
        <Tabs.Tab value="materials" icon={<IconPalette size={14} />}>
          {t('images.materials')} ({materialImages.length}/25)
        </Tabs.Tab>
        <Tabs.Tab value="textures" icon={<IconBrush size={14} />}>
          {t('images.textures')} ({textureImages.length}/15)
        </Tabs.Tab>
        <Tabs.Tab value="composite" icon={<IconLayout size={14} />}>
          {t('images.composite')}
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="overview" pt="md">
        <ImageGallery
          images={overviewImages}
          onReorder={handleReorderImages}
          onDelete={handleDeleteImage}
        />
      </Tabs.Panel>

      {/* Other tabs... */}
    </Tabs>
  )}
</Stack>
```

### 4.2 Frontend: Inspiration Page

**File**: `src/app/[locale]/styles/[id]/page.tsx`

```typescript
export default function StyleInspirationPage({ params }: Props) {
  const { data: style, isLoading } = useStyle(params.id)
  const { data: images } = useStyleImages(params.id)

  if (isLoading) return <LoadingSkeleton />

  const categorizedImages = {
    overview: images?.filter(i => i.imageCategory === 'ROOM_OVERVIEW') || [],
    materials: images?.filter(i => i.imageCategory === 'MATERIAL') || [],
    textures: images?.filter(i => i.imageCategory === 'TEXTURE') || [],
    details: images?.filter(i => i.imageCategory === 'ROOM_DETAIL') || [],
  }

  return (
    <Container size="xl">
      {/* Hero Section: Composite */}
      {style.compositeImageUrl && (
        <Box mb="xl">
          <Image
            src={style.compositeImageUrl}
            alt={`${style.name} Mood Board`}
            height={500}
            radius="md"
            fit="cover"
          />
        </Box>
      )}

      {/* Style Header */}
      <Group position="apart" mb="lg">
        <div>
          <Title order={1}>{style.name}</Title>
          <Group spacing="xs" mt="xs">
            <Badge
              color={style.priceLevel === 'LUXURY' ? 'yellow' : 'blue'}
              leftSection={style.priceLevel === 'LUXURY' ? <IconDiamond size={14} /> : <IconHome size={14} />}
            >
              {style.priceLevel === 'LUXURY' ? 'יוקרתי' : 'עממי'}
            </Badge>
            {style.roomCategory && (
              <Badge variant="outline">{style.roomCategory}</Badge>
            )}
          </Group>
        </div>

        {/* Anchor Image */}
        {style.anchorImageUrl && (
          <Image
            src={style.anchorImageUrl}
            alt="Color Anchor"
            width={200}
            height={150}
            radius="md"
          />
        )}
      </Group>

      {/* Tabs for Categories */}
      <Tabs defaultValue="overview">
        <Tabs.List grow>
          <Tabs.Tab value="overview" icon={<IconHome size={16} />}>
            חדרים ({categorizedImages.overview.length})
          </Tabs.Tab>
          <Tabs.Tab value="materials" icon={<IconPalette size={16} />}>
            חומרים ({categorizedImages.materials.length})
          </Tabs.Tab>
          <Tabs.Tab value="textures" icon={<IconBrush size={16} />}>
            טקסטורות ({categorizedImages.textures.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="xl">
          <MasonryGallery images={categorizedImages.overview} />
        </Tabs.Panel>

        <Tabs.Panel value="materials" pt="xl">
          <Grid>
            {categorizedImages.materials.map(image => (
              <Grid.Col key={image.id} span={3}>
                <Card shadow="sm" radius="md" withBorder>
                  <Card.Section>
                    <Image src={image.url} height={200} alt={image.description || 'Material'} />
                  </Card.Section>
                  {image.description && (
                    <Text size="sm" mt="xs">{image.description}</Text>
                  )}
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="textures" pt="xl">
          <Grid>
            {categorizedImages.textures.map(image => (
              <Grid.Col key={image.id} span={4}>
                <Card shadow="sm" radius="md" withBorder>
                  <Card.Section>
                    <Image src={image.url} height={180} alt={image.description || 'Texture'} />
                  </Card.Section>
                  {image.description && (
                    <Text size="sm" mt="xs">{image.description}</Text>
                  )}
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}
```

---

## Part 5: Migration & Deployment

### 5.1 Migration Script

**File**: `scripts/migrate-phase2-complete.ts`

```typescript
import { PrismaClient, PriceLevel } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Phase 2 Migration...\n')

  // 1. Set default price level for existing styles
  const stylesCount = await prisma.style.updateMany({
    where: { priceLevel: null },
    data: { priceLevel: 'REGULAR' as PriceLevel }
  })
  console.log(`✅ Set default REGULAR price level for ${stylesCount.count} styles`)

  // 2. Set default image category for existing images
  const imagesCount = await prisma.styleImage.updateMany({
    where: { imageCategory: null },
    data: { imageCategory: 'ROOM_OVERVIEW' }
  })
  console.log(`✅ Set default ROOM_OVERVIEW category for ${imagesCount.count} images`)

  // 3. Optionally categorize existing images by count
  // First 60 per style = ROOM_OVERVIEW, rest = ROOM_DETAIL
  const styles = await prisma.style.findMany({
    include: { images: { orderBy: { createdAt: 'asc' } } }
  })

  for (const style of styles) {
    if (style.images.length > 0) {
      const overviewImages = style.images.slice(0, 60)
      const detailImages = style.images.slice(60)

      if (overviewImages.length > 0) {
        await prisma.styleImage.updateMany({
          where: { id: { in: overviewImages.map(i => i.id) } },
          data: { imageCategory: 'ROOM_OVERVIEW' }
        })
      }

      if (detailImages.length > 0) {
        await prisma.styleImage.updateMany({
          where: { id: { in: detailImages.map(i => i.id) } },
          data: { imageCategory: 'ROOM_DETAIL' }
        })
      }

      console.log(`  Style "${style.name}": ${overviewImages.length} overview, ${detailImages.length} detail`)
    }
  }

  console.log('\n✅ Phase 2 Migration Complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 5.2 Rollout Plan

**Week 1: Schema & Backend (Days 1-3)**
- [ ] Day 1: Update Prisma schema, run migration
- [ ] Day 2: Update AI prompt functions
- [ ] Day 3: Update seed service with new generation flow

**Week 2: UI & Testing (Days 4-7)**
- [ ] Day 4-5: Update admin forms (style + room)
- [ ] Day 6: Create inspiration page with tabs
- [ ] Day 7: Test full flow (create style → generate 100+ images → view)

**Week 3: Production (Days 8-10)**
- [ ] Day 8: Deploy to staging, test with real data
- [ ] Day 9: Deploy to production (gradual rollout)
- [ ] Day 10: Monitor, gather feedback, iterate

**Total Time: ~2-3 weeks**

---

## Part 6: Testing Checklist

### Functional Tests
- [ ] Create style with REGULAR price level → Verify images use regular materials
- [ ] Create style with LUXURY price level → Verify images use premium materials
- [ ] Verify 60 room overview images generated
- [ ] Verify 25 material images generated (mood board style, not plain squares)
- [ ] Verify 15 texture images generated (realistic context)
- [ ] Verify composite mood board generated (Pinterest-style)
- [ ] Verify anchor image generated (fruit on colors)
- [ ] Test room father category assignment
- [ ] Test style room category filtering
- [ ] Test inspiration page displays all categorized images

### Performance Tests
- [ ] Measure total generation time for 102 images
- [ ] Test concurrent style generation (multiple styles)
- [ ] Monitor API rate limits
- [ ] Test image loading performance (lazy loading)

### Visual Quality Tests
- [ ] Materials shown as mood board images (not plain squares) ✓
- [ ] Textures shown in realistic context ✓
- [ ] Luxury materials look premium
- [ ] Regular materials look accessible
- [ ] Composite mood board is cohesive
- [ ] Anchor image matches color palette

---

## Summary

### What We're Building

✅ **Simple Category System**
- Room father category (flexible, user-defined)
- Style room category (one per style)
- Luxury vs Regular price level

✅ **Rich Image Generation** (~102 images per style)
- 60 Room Overview images (varied room types + aspect ratios)
- 25 Material images (mood board style)
- 15 Texture images (realistic context)
- 1 Composite mood board (Pinterest-style collage)
- 1 Anchor image (fruit on color palette)

✅ **Price Level Impact**
- LUXURY: Premium materials, custom furniture, sophisticated details
- REGULAR: Standard materials, functional furniture, practical solutions
- Affects ALL image generation prompts

✅ **UI Improvements**
- Admin forms with category + price level selectors
- Inspiration page with tabbed galleries
- Image count indicators
- Price level badges

### Time Estimate

- **Implementation**: 2 weeks (1 dev)
- **Testing**: 3 days
- **Deployment**: 2 days

**Total: ~2-3 weeks**

---

**Ready to start implementation?** 🚀
