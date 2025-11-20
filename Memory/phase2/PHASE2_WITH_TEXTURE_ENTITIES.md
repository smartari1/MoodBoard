# Phase 2: Complete with Texture Entity Layer

## Overview

Building on the complete Phase 2 plan, adding an **additional entity layer for Textures**:

1. ✅ Simple Category System (Room father categories + Style room category + Luxury/Regular)
2. ✅ Rich Image Generation (102 images per style)
3. **➕ NEW: Texture Entity Layer** - Textures become reusable database entities

---

## Key Addition: Texture as Database Entity

### The Pattern

Just like **Materials** and **Colors** are entities that can be reused across styles, **Textures** should work the same way:

```
Material (Entity) ──→ Used in many Styles
Color (Entity) ────→ Used in many Styles
Texture (Entity) ──→ Used in many Styles  ← NEW!
```

### During AI Generation Flow

```typescript
// Current: Generate texture image → Save to StyleImage
// NEW: Generate texture image → Check if Texture exists → Create if not → Link to Texture entity

1. Generate texture image (AI)
2. Extract texture metadata (name, type, finish)
3. Check if Texture exists in DB (by name/type)
4. IF NOT EXISTS:
   - Create new Texture entity
   - Upload texture image
5. Link StyleImage to Texture entity
6. Increment Texture.usage counter
```

---

## Part 1: Database Schema Updates

### 1.1 New Texture Models

```prisma
// Texture Category (similar to MaterialCategory)
model TextureCategory {
  id          String            @id @default(auto()) @map("_id") @db.ObjectId
  name        LocalizedString   // e.g., { he: "גימורים", en: "Finishes" }
  description LocalizedString?
  slug        String            @unique
  order       Int               @default(0)
  icon        String?

  textures Texture[]

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())

  @@index([order, slug])
  @@map("texture_categories")
}

// Texture Type (sub-category)
model TextureType {
  id          String            @id @default(auto()) @map("_id") @db.ObjectId
  name        LocalizedString   // e.g., { he: "מט", en: "Matte" }
  description LocalizedString?
  categoryId  String            @db.ObjectId
  category    TextureCategory   @relation(fields: [categoryId], references: [id])
  slug        String
  order       Int               @default(0)

  textures Texture[]

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())

  @@unique([categoryId, slug])
  @@index([categoryId, order])
  @@map("texture_types")
}

// Main Texture Entity
model Texture {
  id             String           @id @default(auto()) @map("_id") @db.ObjectId
  organizationId String?          @db.ObjectId  // Null for global textures
  organization   Organization?    @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Basic Info
  name           LocalizedString  // e.g., { he: "מט לבן", en: "Matte White" }
  description    LocalizedString? // Usage description

  // Categorization
  categoryId     String           @db.ObjectId
  category       TextureCategory  @relation(fields: [categoryId], references: [id])
  typeId         String?          @db.ObjectId
  type           TextureType?     @relation(fields: [typeId], references: [id])

  // Properties
  finish         String           // 'matte', 'glossy', 'satin', 'rough', 'smooth'
  sheen          String?          // 'flat', 'eggshell', 'semi-gloss', 'high-gloss'
  baseColor      String?          // HEX color if applicable

  // AI Generation
  isAbstract     Boolean          @default(false)  // AI-generated vs. real product
  generationStatus GenerationStatus @default(COMPLETED)
  aiDescription  String?          // AI-generated description

  // Assets
  imageUrl       String?          // Primary texture image
  thumbnailUrl   String?          // Thumbnail
  tags           String[]         @default([])

  // Usage tracking
  usage          Int              @default(0)  // How many styles use this texture

  // Relations
  styles         Style[]          // Many-to-many with styles
  styleImages    StyleImage[]     // Images using this texture

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @default(now())

  @@index([organizationId])
  @@index([categoryId, typeId])
  @@index([finish])
  @@index([usage])
  @@map("textures")
}

// Update Organization to include textures
model Organization {
  // ... existing fields ...

  textures Texture[]  // NEW

  // ... rest of model ...
}
```

### 1.2 Update Style Model

```prisma
model Style {
  // ... existing fields ...

  // NEW: Many-to-many with Textures
  textures    Texture[]  // Featured textures in this style

  // ... rest of model ...
}
```

### 1.3 Update StyleImage Model

```prisma
model StyleImage {
  // ... existing fields ...

  // NEW: Link to Texture entity (for TEXTURE category images)
  textureId   String?   @db.ObjectId
  texture     Texture?  @relation(fields: [textureId], references: [id])

  // ... rest of model ...

  @@index([textureId])
}
```

---

## Part 2: Seed Data - Texture Categories

### 2.1 Default Categories & Types

**File**: `prisma/seed-textures.ts`

```typescript
const textureCategories = [
  {
    name: { he: 'גימורי קיר', en: 'Wall Finishes' },
    slug: 'wall-finishes',
    order: 1,
    types: [
      { name: { he: 'מט', en: 'Matte' }, slug: 'matte', order: 1 },
      { name: { he: 'מבריק', en: 'Glossy' }, slug: 'glossy', order: 2 },
      { name: { he: 'סאטן', en: 'Satin' }, slug: 'satin', order: 3 },
      { name: { he: 'טקסטורה', en: 'Textured' }, slug: 'textured', order: 4 },
    ]
  },
  {
    name: { he: 'גימורי עץ', en: 'Wood Finishes' },
    slug: 'wood-finishes',
    order: 2,
    types: [
      { name: { he: 'טבעי', en: 'Natural' }, slug: 'natural', order: 1 },
      { name: { he: 'לכה', en: 'Lacquered' }, slug: 'lacquered', order: 2 },
      { name: { he: 'מוברש', en: 'Brushed' }, slug: 'brushed', order: 3 },
    ]
  },
  {
    name: { he: 'גימורי מתכת', en: 'Metal Finishes' },
    slug: 'metal-finishes',
    order: 3,
    types: [
      { name: { he: 'מבריק', en: 'Polished' }, slug: 'polished', order: 1 },
      { name: { he: 'מוברש', en: 'Brushed' }, slug: 'brushed', order: 2 },
      { name: { he: 'שחור מט', en: 'Matte Black' }, slug: 'matte-black', order: 3 },
    ]
  },
  {
    name: { he: 'טקסטורות בד', en: 'Fabric Textures' },
    slug: 'fabric-textures',
    order: 4,
    types: [
      { name: { he: 'חלק', en: 'Smooth' }, slug: 'smooth', order: 1 },
      { name: { he: 'אריגה', en: 'Woven' }, slug: 'woven', order: 2 },
      { name: { he: 'קטיפה', en: 'Velvet' }, slug: 'velvet', order: 3 },
    ]
  },
  {
    name: { he: 'גימורי אבן', en: 'Stone Finishes' },
    slug: 'stone-finishes',
    order: 5,
    types: [
      { name: { he: 'מלוטש', en: 'Polished' }, slug: 'polished', order: 1 },
      { name: { he: 'מחוספס', en: 'Honed' }, slug: 'honed', order: 2 },
      { name: { he: 'טבעי', en: 'Natural' }, slug: 'natural', order: 3 },
    ]
  },
]

async function seedTextureCategories() {
  for (const cat of textureCategories) {
    const category = await prisma.textureCategory.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        order: cat.order,
      }
    })

    for (const type of cat.types) {
      await prisma.textureType.create({
        data: {
          name: type.name,
          slug: type.slug,
          order: type.order,
          categoryId: category.id,
        }
      })
    }
  }

  console.log('✅ Seeded texture categories and types')
}
```

---

## Part 3: Enhanced Generation Flow

### 3.1 Texture Generation with Entity Creation

**File**: `src/lib/seed/texture-generator.ts`

```typescript
import { PrismaClient, PriceLevel, Texture } from '@prisma/client'

const prisma = new PrismaClient()

interface TextureSpec {
  name: { he: string; en: string }
  finish: string        // 'matte', 'glossy', 'satin', 'rough', 'smooth'
  categorySlug: string  // 'wall-finishes', 'wood-finishes', etc.
  typeSlug?: string     // 'matte', 'polished', etc.
  baseColor?: string    // HEX color
  aiDescription: string // For image generation
}

async function generateTextureImages(params: {
  style: Style
  priceLevel: PriceLevel
  count: number
  onProgress?: (current: number) => void
}): Promise<void> {
  // Get texture specs based on price level
  const textureSpecs = getTextureSpecsByPriceLevel(params.priceLevel)

  for (let i = 0; i < params.count; i++) {
    const spec = textureSpecs[i % textureSpecs.length]

    // 1. Generate AI image
    console.log(`    Generating: ${spec.name.en}...`)
    const imageUrl = await generateTextureImage({
      styleDescriptor: params.style.factualDetails || params.style.description,
      priceLevel: params.priceLevel,
      textureSpec: spec,
    })

    // 2. Check if texture exists in database
    let texture = await findOrCreateTexture({
      spec,
      imageUrl,
      organizationId: params.style.organizationId,
    })

    // 3. Create StyleImage linked to Texture
    await prisma.styleImage.create({
      data: {
        url: imageUrl,
        styleId: params.style.id,
        imageCategory: 'TEXTURE',
        displayOrder: i,
        description: spec.aiDescription,
        textureId: texture.id,  // Link to Texture entity
        tags: ['texture', spec.finish, params.priceLevel.toLowerCase()],
      }
    })

    // 4. Link texture to style (many-to-many)
    await prisma.style.update({
      where: { id: params.style.id },
      data: {
        textures: {
          connect: { id: texture.id }
        }
      }
    })

    // 5. Increment usage counter
    await prisma.texture.update({
      where: { id: texture.id },
      data: { usage: { increment: 1 } }
    })

    params.onProgress?.(i + 1)
    await delay(500)
  }
}

async function findOrCreateTexture(params: {
  spec: TextureSpec
  imageUrl: string
  organizationId: string | null
}): Promise<Texture> {
  // Try to find existing texture by name and finish
  let texture = await prisma.texture.findFirst({
    where: {
      OR: [
        { organizationId: params.organizationId },
        { organizationId: null }  // Global textures
      ],
      name: {
        equals: params.spec.name
      },
      finish: params.spec.finish,
    }
  })

  if (texture) {
    console.log(`      ✓ Found existing texture: ${params.spec.name.en}`)
    return texture
  }

  // Create new texture
  console.log(`      + Creating new texture: ${params.spec.name.en}`)

  // Get category and type
  const category = await prisma.textureCategory.findUnique({
    where: { slug: params.spec.categorySlug }
  })

  const type = params.spec.typeSlug
    ? await prisma.textureType.findFirst({
        where: {
          categoryId: category!.id,
          slug: params.spec.typeSlug
        }
      })
    : null

  texture = await prisma.texture.create({
    data: {
      organizationId: params.organizationId,
      name: params.spec.name,
      description: { he: params.spec.aiDescription, en: params.spec.aiDescription },
      categoryId: category!.id,
      typeId: type?.id,
      finish: params.spec.finish,
      baseColor: params.spec.baseColor,
      imageUrl: params.imageUrl,
      isAbstract: true,  // AI-generated
      aiDescription: params.spec.aiDescription,
      tags: [params.spec.finish, params.spec.categorySlug],
    }
  })

  return texture
}

function getTextureSpecsByPriceLevel(priceLevel: PriceLevel): TextureSpec[] {
  const baseTextures: TextureSpec[] = [
    // Wall finishes
    {
      name: { he: 'מט לבן', en: 'Matte White' },
      finish: 'matte',
      categorySlug: 'wall-finishes',
      typeSlug: 'matte',
      baseColor: '#FFFFFF',
      aiDescription: 'Smooth matte white wall paint finish',
    },
    {
      name: { he: 'טקסטורה גבס', en: 'Textured Plaster' },
      finish: 'rough',
      categorySlug: 'wall-finishes',
      typeSlug: 'textured',
      aiDescription: 'Subtle textured plaster wall finish',
    },

    // Wood finishes
    {
      name: { he: 'עץ טבעי', en: 'Natural Wood' },
      finish: 'natural',
      categorySlug: 'wood-finishes',
      typeSlug: 'natural',
      aiDescription: 'Natural wood grain texture',
    },
    {
      name: { he: 'עץ לכה', en: 'Lacquered Wood' },
      finish: 'glossy',
      categorySlug: 'wood-finishes',
      typeSlug: 'lacquered',
      aiDescription: 'High-gloss lacquered wood finish',
    },

    // Metal finishes
    {
      name: { he: 'מתכת מוברשת', en: 'Brushed Metal' },
      finish: 'brushed',
      categorySlug: 'metal-finishes',
      typeSlug: 'brushed',
      aiDescription: 'Linear brushed metal texture',
    },
    {
      name: { he: 'פליז מבריק', en: 'Polished Brass' },
      finish: 'polished',
      categorySlug: 'metal-finishes',
      typeSlug: 'polished',
      baseColor: '#B5A642',
      aiDescription: priceLevel === 'LUXURY'
        ? 'Premium polished brass with warm gold tones'
        : 'Standard polished brass finish',
    },

    // Fabric textures
    {
      name: { he: 'בד פשתן', en: 'Linen Fabric' },
      finish: 'woven',
      categorySlug: 'fabric-textures',
      typeSlug: 'woven',
      aiDescription: 'Natural linen fabric weave texture',
    },
    {
      name: { he: 'קטיפה', en: 'Velvet' },
      finish: 'soft',
      categorySlug: 'fabric-textures',
      typeSlug: 'velvet',
      aiDescription: priceLevel === 'LUXURY'
        ? 'Luxurious crushed velvet texture'
        : 'Soft velvet upholstery texture',
    },

    // Stone finishes
    {
      name: { he: 'שיש מלוטש', en: 'Polished Marble' },
      finish: 'polished',
      categorySlug: 'stone-finishes',
      typeSlug: 'polished',
      aiDescription: priceLevel === 'LUXURY'
        ? 'Premium Calacatta marble with elegant veining'
        : 'Standard marble finish',
    },
    {
      name: { he: 'בטון גולמי', en: 'Raw Concrete' },
      finish: 'rough',
      categorySlug: 'stone-finishes',
      typeSlug: 'natural',
      aiDescription: 'Industrial raw concrete texture',
    },

    // Additional textures
    {
      name: { he: 'זכוכית שקופה', en: 'Clear Glass' },
      finish: 'glossy',
      categorySlug: 'wall-finishes',
      aiDescription: 'Transparent glossy glass surface',
    },
    {
      name: { he: 'עור', en: 'Leather' },
      finish: 'smooth',
      categorySlug: 'fabric-textures',
      aiDescription: priceLevel === 'LUXURY'
        ? 'Premium full-grain leather texture'
        : 'Standard leather upholstery',
    },
  ]

  // Can expand with more textures or customize based on price level
  return baseTextures
}

async function generateTextureImage(params: {
  styleDescriptor: string
  priceLevel: PriceLevel
  textureSpec: TextureSpec
}): Promise<string> {
  const prompt = buildImagePrompt({
    styleDescriptor: params.styleDescriptor,
    priceLevel: params.priceLevel,
    imageCategory: 'TEXTURE',
    specificElement: `${params.textureSpec.aiDescription}. Show in realistic, atmospheric context (fabric draping, wall surface, material close-up). DO NOT show plain color square.`,
  })

  const imageUrl = await generateImage({
    prompt,
    aspectRatio: '1:1',  // Square for textures
  })

  return imageUrl
}
```

---

## Part 4: UI Updates

### 4.1 Inspiration Page - Textures Next to Materials

**File**: `src/app/[locale]/styles/[id]/page.tsx`

```typescript
export default function StyleInspirationPage({ params }: Props) {
  const { data: style } = useStyle(params.id)
  const { data: images } = useStyleImages(params.id)

  // Get textures from style relation
  const { data: styleTextures } = useQuery({
    queryKey: ['style-textures', params.id],
    queryFn: () => fetchStyleTextures(params.id),
  })

  const categorizedImages = {
    overview: images?.filter(i => i.imageCategory === 'ROOM_OVERVIEW') || [],
    materials: images?.filter(i => i.imageCategory === 'MATERIAL') || [],
    textureImages: images?.filter(i => i.imageCategory === 'TEXTURE') || [],
  }

  return (
    <Container size="xl">
      {/* ... hero and header ... */}

      <Tabs defaultValue="overview">
        <Tabs.List grow>
          <Tabs.Tab value="overview">חדרים ({categorizedImages.overview.length})</Tabs.Tab>
          <Tabs.Tab value="materials-textures">חומרים וטקסטורות</Tabs.Tab>
        </Tabs.List>

        {/* Room Overview Tab */}
        <Tabs.Panel value="overview" pt="xl">
          <MasonryGallery images={categorizedImages.overview} />
        </Tabs.Panel>

        {/* Materials & Textures Tab - Side by Side */}
        <Tabs.Panel value="materials-textures" pt="xl">
          <Grid>
            {/* Left Column: Materials */}
            <Grid.Col span={6}>
              <Title order={3} mb="md">
                חומרים ({categorizedImages.materials.length})
              </Title>
              <Stack spacing="md">
                {categorizedImages.materials.map(image => (
                  <Card key={image.id} shadow="sm" withBorder>
                    <Card.Section>
                      <Image src={image.url} height={200} alt={image.description} />
                    </Card.Section>
                    {image.description && (
                      <Text size="sm" mt="xs">{image.description}</Text>
                    )}
                  </Card>
                ))}
              </Stack>
            </Grid.Col>

            {/* Right Column: Textures */}
            <Grid.Col span={6}>
              <Title order={3} mb="md">
                טקסטורות ({styleTextures?.length || 0})
              </Title>
              <Stack spacing="md">
                {styleTextures?.map(texture => (
                  <Card key={texture.id} shadow="sm" withBorder>
                    <Card.Section>
                      <Image
                        src={texture.imageUrl}
                        height={200}
                        alt={texture.name.he || texture.name.en}
                      />
                    </Card.Section>

                    <Group position="apart" mt="xs">
                      <div>
                        <Text weight={500}>{texture.name.he || texture.name.en}</Text>
                        {texture.description && (
                          <Text size="xs" color="dimmed">
                            {texture.description.he || texture.description.en}
                          </Text>
                        )}
                      </div>

                      <Group spacing={4}>
                        <Badge size="sm" variant="outline">{texture.finish}</Badge>
                        {texture.baseColor && (
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              backgroundColor: texture.baseColor,
                              border: '1px solid #ddd'
                            }}
                          />
                        )}
                      </Group>
                    </Group>

                    {/* Usage count */}
                    <Text size="xs" color="dimmed" mt="xs">
                      {t('texture.used-in-styles', { count: texture.usage })}
                    </Text>
                  </Card>
                ))}
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}
```

### 4.2 Admin - Texture Management

**File**: `src/app/[locale]/admin/textures/page.tsx`

```typescript
export default function TexturesManagementPage() {
  const { data: textures } = useQuery({
    queryKey: ['textures'],
    queryFn: fetchTextures,
  })

  const categories = groupBy(textures, 'categoryId')

  return (
    <Container size="xl">
      <Group position="apart" mb="lg">
        <Title>ניהול טקסטורות</Title>
        <Button leftIcon={<IconPlus />}>צור טקסטורה חדשה</Button>
      </Group>

      <Accordion>
        {Object.entries(categories).map(([categoryId, textures]) => (
          <Accordion.Item key={categoryId} value={categoryId}>
            <Accordion.Control>
              {textures[0].category.name.he} ({textures.length})
            </Accordion.Control>
            <Accordion.Panel>
              <Grid>
                {textures.map(texture => (
                  <Grid.Col key={texture.id} span={3}>
                    <Card shadow="sm" withBorder>
                      <Card.Section>
                        <Image src={texture.imageUrl} height={150} />
                      </Card.Section>
                      <Text size="sm" weight={500} mt="xs">
                        {texture.name.he}
                      </Text>
                      <Group spacing={4} mt="xs">
                        <Badge size="xs">{texture.finish}</Badge>
                        <Badge size="xs" variant="outline">
                          {texture.usage} styles
                        </Badge>
                      </Group>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Container>
  )
}
```

---

## Part 5: API Endpoints

### 5.1 Get Style Textures

**File**: `src/app/api/styles/[id]/textures/route.ts`

```typescript
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, organizationId } = await authenticate(req)

    const style = await prisma.style.findFirst({
      where: {
        id: params.id,
        organizationId,
      },
      include: {
        textures: {
          include: {
            category: true,
            type: true,
          },
          orderBy: {
            name: 'asc'
          }
        }
      }
    })

    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    return NextResponse.json(style.textures)
  } catch (error) {
    return handleError(error)
  }
}
```

### 5.2 Search/Find Textures

**File**: `src/app/api/textures/search/route.ts`

```typescript
export async function GET(req: Request) {
  try {
    const { userId, organizationId } = await authenticate(req)
    const { searchParams } = new URL(req.url)

    const finish = searchParams.get('finish')
    const categoryId = searchParams.get('categoryId')
    const query = searchParams.get('q')

    const textures = await prisma.texture.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null }  // Include global textures
        ],
        ...(finish && { finish }),
        ...(categoryId && { categoryId }),
        ...(query && {
          OR: [
            { name: { path: ['he'], string_contains: query } },
            { name: { path: ['en'], string_contains: query } },
          ]
        })
      },
      include: {
        category: true,
        type: true,
      },
      orderBy: {
        usage: 'desc'  // Most used first
      },
      take: 50,
    })

    return NextResponse.json(textures)
  } catch (error) {
    return handleError(error)
  }
}
```

---

## Part 6: Migration Strategy

### 6.1 Seed Texture Categories First

```bash
# 1. Create texture categories and types
npx tsx prisma/seed-textures.ts
```

### 6.2 Migrate Existing Texture Images

**File**: `scripts/migrate-texture-entities.ts`

```typescript
async function migrateExistingTextureImages() {
  console.log('Migrating existing texture images to entities...')

  // Get all TEXTURE category images
  const textureImages = await prisma.styleImage.findMany({
    where: { imageCategory: 'TEXTURE' },
    include: { style: true }
  })

  console.log(`Found ${textureImages.length} texture images`)

  for (const image of textureImages) {
    // Extract texture info from description or tags
    const textureName = extractTextureName(image.description || image.tags[0])
    const finish = extractFinish(image.tags)

    // Find or create texture entity
    const texture = await findOrCreateTextureFromImage({
      name: textureName,
      finish: finish,
      imageUrl: image.url,
      organizationId: image.style.organizationId,
    })

    // Link image to texture
    await prisma.styleImage.update({
      where: { id: image.id },
      data: { textureId: texture.id }
    })

    // Link texture to style
    await prisma.style.update({
      where: { id: image.styleId },
      data: {
        textures: {
          connect: { id: texture.id }
        }
      }
    })

    // Increment usage
    await prisma.texture.update({
      where: { id: texture.id },
      data: { usage: { increment: 1 } }
    })

    console.log(`  ✓ Linked image ${image.id} to texture ${texture.id}`)
  }

  console.log('✅ Migration complete')
}
```

---

## Summary: What Changed

### Before
```
Generate texture image → Save to StyleImage → Done
```

### After (With Texture Entity Layer)
```
Generate texture image
  → Extract texture metadata
  → Check if Texture exists in DB
  → If not, create Texture entity
  → Save StyleImage linked to Texture
  → Link Texture to Style (many-to-many)
  → Increment Texture.usage
```

### Benefits

1. **Reusability**: Textures can be shared across multiple styles
2. **Consistency**: Same texture entity = consistent representation
3. **Searchable**: Find textures by finish, category, color
4. **Usage Tracking**: See which textures are most popular
5. **UI Organization**: Display textures next to materials in organized way
6. **Future-Proof**: Can add real product textures later (like materials)

---

## Rollout Additions

### Week 1 (Updated)
- Day 1: Schema changes + **texture models**
- Day 2: **Seed texture categories** + AI prompt updates
- Day 3: Seed service with **texture entity creation**

### Week 2 (Updated)
- Day 4-5: Admin forms + **texture management UI**
- Day 6: Inspiration page with **materials & textures side-by-side**
- Day 7: Full test + **verify texture reusability**

---

**Ready to implement with Texture entity layer?** 🎯
