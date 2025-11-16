/**
 * Room Profile Prompt Template
 *
 * Generates room-specific applications of a design style
 * Includes: description, colors, materials, furniture, products
 */

export interface RoomProfileContext {
  styleName: { he: string; en: string }
  styleDescription: { he?: string; en?: string }
  roomType: {
    name: { he: string; en: string }
    slug: string
    description?: { he?: string; en?: string }
    detailedContent?: any
  }
  primaryColor: {
    name: { he: string; en: string }
    hex: string
  }
  styleCharacteristics: string[]
  styleVisualElements: string[]
  styleMaterialGuidance: { he?: string; en?: string }
}

export function buildRoomProfilePrompt(context: RoomProfileContext): string {
  const {
    styleName,
    styleDescription,
    roomType,
    primaryColor,
    styleCharacteristics,
    styleVisualElements,
    styleMaterialGuidance,
  } = context

  const roomContent = roomType.detailedContent as any

  return `You are an interior designer creating a ROOM-SPECIFIC application guide for a design style.

**STYLE**: ${styleName.he} / ${styleName.en}
**ROOM TYPE**: ${roomType.name.he} / ${roomType.name.en}
**PRIMARY COLOR**: ${primaryColor.name.he} / ${primaryColor.name.en} (${primaryColor.hex})

---

**STYLE OVERVIEW**:

Description (Hebrew): ${styleDescription.he || 'N/A'}
Description (English): ${styleDescription.en || 'N/A'}

Key Characteristics:
${formatArray(styleCharacteristics.slice(0, 6))}

Visual Elements:
${formatArray(styleVisualElements.slice(0, 6))}

Material Guidance (Hebrew): ${styleMaterialGuidance.he || 'N/A'}
Material Guidance (English): ${styleMaterialGuidance.en || 'N/A'}

---

**ROOM TYPE KNOWLEDGE**:

Description (Hebrew): ${roomContent?.he?.description || roomType.description?.he || 'N/A'}
Description (English): ${roomContent?.en?.description || roomType.description?.en || 'N/A'}

Room Characteristics:
${formatArray(roomContent?.he?.characteristics || [])}

Applications:
${formatArray(roomContent?.he?.applications || [])}

---

**YOUR TASK**:

Create a detailed room profile showing how the **${styleName.en}** style is applied specifically in a **${roomType.name.en}**.

**RETURN FORMAT** (JSON):
{
  "roomProfile": {
    "description": {
      "he": "תיאור מפורט (4-6 משפטים) כיצד הסגנון הזה מיושם בחדר זה. כלול: אווירה, פונקציונליות, פריסה מרחבית, תאורה, ונקודות מוקד עיצוביות.",
      "en": "Detailed description (4-6 sentences) of how this style is applied in this room. Include: atmosphere, functionality, spatial layout, lighting, and design focal points."
    },
    "colorPalette": {
      "primary": "${primaryColor.hex}",
      "secondary": ["hex1", "hex2", "hex3"],
      "accent": ["hex1", "hex2"],
      "description": {
        "he": "הסבר (2-3 משפטים) כיצד משתמשים בצבעים בחדר זה - באילו משטחים, פרופורציות, ואפקטים",
        "en": "Explanation (2-3 sentences) how colors are used in this room - which surfaces, proportions, and effects"
      }
    },
    "materials": [
      {
        "name": { "he": "שם החומר בעברית", "en": "Material name in English" },
        "application": { "he": "היכן ואיך משתמשים בו", "en": "Where and how it's used" },
        "finish": "matte | glossy | textured | natural"
      }
    ],
    "furnitureAndFixtures": [
      {
        "item": { "he": "פריט ריהוט/אביזר", "en": "Furniture/fixture item" },
        "description": { "he": "תיאור סגנוני וחומרים", "en": "Stylistic description and materials" },
        "importance": "essential | recommended | optional"
      }
    ],
    "lighting": {
      "natural": {
        "he": "כיצד מנצלים אור טבעי (חלונות, וילונות, כיוון)",
        "en": "How natural light is utilized (windows, curtains, direction)"
      },
      "artificial": [
        {
          "type": { "he": "סוג תאורה", "en": "Lighting type" },
          "description": { "he": "תיאור ומיקום", "en": "Description and placement" }
        }
      ]
    },
    "spatialConsiderations": {
      "layout": {
        "he": "פריסה מרחבית מומלצת (2-3 משפטים)",
        "en": "Recommended spatial layout (2-3 sentences)"
      },
      "circulation": {
        "he": "זרימה ותנועה בחדר",
        "en": "Circulation and movement in the room"
      },
      "functionalZones": [
        {
          "zone": { "he": "אזור פונקציונלי", "en": "Functional zone" },
          "purpose": { "he": "מטרה", "en": "Purpose" }
        }
      ]
    },
    "decorativeElements": [
      {
        "element": { "he": "אלמנט דקורטיבי", "en": "Decorative element" },
        "role": { "he": "תפקיד בעיצוב", "en": "Role in design" }
      }
    ],
    "designTips": [
      {
        "tip": {
          "he": "טיפ עיצובי ספציפי לחדר זה בסגנון זה",
          "en": "Design tip specific to this room in this style"
        }
      }
    ]
  }
}

**DETAILED REQUIREMENTS**:

1. **description**:
   - How does ${styleName.en} manifest in a ${roomType.name.en}?
   - What's the overall atmosphere and feeling?
   - How does it balance aesthetics and functionality?

2. **colorPalette**:
   - Primary: ${primaryColor.hex} (already provided)
   - Secondary: 3 supporting colors (provide hex codes based on the style)
   - Accent: 2 accent colors for contrast or emphasis
   - Description: Which surfaces get which colors? (walls, floor, ceiling, furniture)

3. **materials**:
   - 4-6 materials appropriate for this room in this style
   - Examples: "אבן טבעית / Natural stone", "עץ מלא / Solid wood", "שיש / Marble"
   - Specify where each is used: floors, walls, countertops, furniture
   - Specify finish: matte, glossy, textured, natural

4. **furnitureAndFixtures**:
   - 6-10 key furniture pieces/fixtures for this room
   - For a kitchen: cabinets, countertops, appliances, island, seating
   - For a living room: sofa, chairs, coffee table, shelving, media console
   - For a bedroom: bed, nightstands, wardrobe, dresser, seating
   - Mark importance: essential | recommended | optional

5. **lighting**:
   - Natural: Window treatments, orientation, how to maximize daylight
   - Artificial: 3-5 lighting types (chandelier, recessed, task, ambient, accent)
   - Be specific to the room type (kitchen needs task lighting, bedroom needs dimmable)

6. **spatialConsiderations**:
   - Layout: How to arrange furniture/elements for this style
   - Circulation: Movement paths, clearances, flow
   - Functional zones: 2-4 zones specific to this room (e.g., cooking zone, dining zone in kitchen)

7. **decorativeElements**:
   - 4-6 decorative elements that complete the look
   - Examples: artwork, textiles, plants, vases, sculptures, rugs, cushions
   - How each reinforces the style

8. **designTips**:
   - 5-7 practical tips for achieving this style in this room
   - Balance between inspiration and actionable advice
   - Room-specific and style-specific (not generic)

**GUIDELINES**:
- Be HIGHLY SPECIFIC to the room type
- A kitchen profile should be completely different from a bedroom profile
- Consider functional requirements of the room
- Match the style's aesthetic while meeting the room's needs
- Use professional interior design terminology
- Provide actionable, practical guidance
- Ensure complete bilingual content (Hebrew and English)

**CRITICAL**:
- Return ONLY valid JSON
- NO markdown, NO code blocks
- All hex colors must be valid 6-digit hex codes with #
- All descriptions must be complete and detailed
- Minimum array lengths must be met`
}

function formatArray(arr: string[]): string {
  if (!arr || arr.length === 0) return 'N/A'
  return arr.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
}
