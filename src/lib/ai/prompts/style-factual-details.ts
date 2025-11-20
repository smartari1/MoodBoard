/**
 * Factual Details Prompt Template
 *
 * Generates structured, informative content about design styles
 * Includes: period, characteristics, historical context, applications, etc.
 */

export interface FactualDetailsContext {
  styleName: { he: string; en: string }
  subCategory: {
    name: { he: string; en: string }
    description?: { he?: string; en?: string }
    detailedContent?: any
  }
  approach: {
    name: { he: string; en: string }
    description?: { he?: string; en?: string }
    detailedContent?: any
  }
  color: {
    name: { he: string; en: string }
    hex: string
    category: string
    description?: { he?: string; en?: string }
  }
  category: {
    name: { he: string; en: string }
  }
  additionalContext?: string
  // Phase 2: Price Level
  priceLevel?: 'REGULAR' | 'LUXURY'
}

export function buildFactualDetailsPrompt(context: FactualDetailsContext): string {
  const { styleName, subCategory, approach, color, category, additionalContext, priceLevel } = context

  const subCategoryContent = subCategory.detailedContent as any
  const approachContent = approach.detailedContent as any

  // Phase 2: Price Level Keywords
  const priceLevelGuidance = priceLevel === 'LUXURY'
    ? `**LUXURY TIER KEYWORDS** (inject throughout):
- Exclusive, High-end, Custom-made, Bespoke
- Sophisticated, Refined, Precious materials
- Artisanal, Hand-crafted, Limited edition
- Premium finishes, Designer pieces
- Marble, Solid wood, Genuine leather, Silk
- Polished brass, Crystal, Fine metals
- Smart home integration, High-tech features`
    : `**REGULAR TIER KEYWORDS** (inject throughout):
- Accessible, Functional, Practical
- Smart solutions, Value-oriented
- Standard materials, Quality essentials
- Cost-effective, Efficient, Versatile
- Engineered wood, Synthetic leather, Cotton blends
- Chrome, Aluminum, Glass
- Modern conveniences, User-friendly features`

  return `You are an expert interior design historian creating DETAILED, FACTUAL content for a design style.

**STYLE TO DOCUMENT**: ${styleName.he} / ${styleName.en}

**CORE COMPONENTS** (60% weight to sub-category, 25% to approach, 15% to color):
- **Category**: ${category.name.he} / ${category.name.en}
- **Sub-Category**: ${subCategory.name.he} / ${subCategory.name.en}
- **Approach**: ${approach.name.he} / ${approach.name.en}
- **Primary Color**: ${color.name.he} / ${color.name.en} (${color.hex})

${additionalContext ? `**ADDITIONAL CONTEXT**:\n${additionalContext}\n` : ''}

${priceLevel ? `${priceLevelGuidance}\n` : ''}

---

**SUB-CATEGORY KNOWLEDGE** (PRIMARY SOURCE - 60% weight):

Period: ${subCategoryContent?.he?.period || subCategoryContent?.en?.period || 'N/A'}

Description (Hebrew):
${subCategoryContent?.he?.description || subCategory.description?.he || 'N/A'}

Description (English):
${subCategoryContent?.en?.description || subCategory.description?.en || 'N/A'}

Characteristics:
${formatArray(subCategoryContent?.he?.characteristics || [])}

Visual Elements:
${formatArray(subCategoryContent?.he?.visualElements || [])}

Historical Context (Hebrew):
${subCategoryContent?.he?.historicalContext || 'N/A'}

Cultural Context (Hebrew):
${subCategoryContent?.he?.culturalContext || 'N/A'}

---

**APPROACH KNOWLEDGE** (25% weight):

Philosophy (Hebrew):
${approachContent?.he?.philosophy || approachContent?.he?.description || approach.description?.he || 'N/A'}

Philosophy (English):
${approachContent?.en?.philosophy || approachContent?.en?.description || approach.description?.en || 'N/A'}

---

**COLOR KNOWLEDGE** (15% weight):

Category: ${color.category}
Description (Hebrew): ${color.description?.he || 'N/A'}
Description (English): ${color.description?.en || 'N/A'}

---

**YOUR TASK**:

Generate comprehensive factual content for this style in BOTH Hebrew and English.

**CONTENT REQUIREMENTS**:

1. **introduction** (2-3 sentences):
   - Brief, engaging overview of what makes this style unique
   - Mention the key combination: sub-category + approach + color

2. **description** (6-10 sentences):
   - Detailed explanation of the style
   - How the ${approach.name.en} approach reinterprets the ${subCategory.name.en} style
   - How ${color.name.en} color enhances this combination
   - Visual identity and aesthetic character
   - Spatial qualities and atmosphere

3. **period** (exact years):
   - Historical period if applicable (e.g., "1920-1939")
   - Or "Contemporary interpretation of [period]"
   - Or "Timeless" if approach is timeless

4. **characteristics** (8-12 items):
   - Specific, observable features of this style
   - Include references to the primary color
   - Mix of: forms, materials, patterns, textures, spatial qualities
   - Example: "Geometric patterns in ${color.name.en} tones"

5. **visualElements** (6-8 items):
   - Key visual components that define this style
   - Furniture types, lighting, decorative elements
   - Material combinations
   - Example: "${color.name.en} velvet upholstery with brass accents"

6. **colorGuidance** (4-6 sentences):
   - How to use ${color.name.en} (${color.hex}) as the primary color
   - Supporting color palette recommendations
   - Color proportions and balance
   - Emotional/psychological impact of the color in this context

7. **materialGuidance** (4-6 sentences):
   - Recommended materials and textures${priceLevel ? ` (${priceLevel} tier)` : ''}
   - Finishes (matte, glossy, textured, etc.)
   - Natural vs. synthetic materials
   - How materials relate to the historical period and approach
   ${priceLevel ? `- **CRITICAL**: Use ${priceLevel} tier materials from keywords above` : ''}

8. **historicalContext** (4-6 sentences):
   - Historical background of the sub-category style
   - How this interpretation adapts the historical style
   - Key designers, movements, or influences
   - Evolution and contemporary relevance

9. **culturalContext** (3-5 sentences):
   - Cultural origins and influences
   - Geographic/regional associations
   - Social and lifestyle factors
   - Modern cultural relevance

10. **applications** (6-10 items):
    - Specific room types where this style excels
    - Example: "מטבח יוקרתי / Luxury kitchen"
    - Example: "סלון רחב ידיים / Spacious living room"
    - Consider the practical applications from sub-category knowledge

11. **executiveSummary** (Part B - 4-6 sentences):
    - A strict summary format focusing on the core value proposition and target audience.
    - Summarize the style's essence, key appeal, and ideal user.

12. **requiredMaterials** (List of 15-25 items):
    - Specific material names in English (e.g., "Oak Wood", "Carrara Marble", "Velvet").
    ${priceLevel ? `- **CRITICAL**: Use ${priceLevel} tier materials only (see keywords above)` : ''}
    - Used for asset generation.

13. **requiredColors** (List of 10-15 items):
    - Specific color names in English (e.g., "Sage Green", "Cream", "Charcoal").
    - Used for asset generation.

---

**RETURN FORMAT** (JSON):
{
  "factualDetails": {
    "he": {
      "introduction": "...",
      "description": "...",
      "period": "...",
      "characteristics": ["...", "...", ...],
      "visualElements": ["...", "...", ...],
      "colorGuidance": "...",
      "materialGuidance": "...",
      "historicalContext": "...",
      "culturalContext": "...",
      "applications": ["...", "...", ...],
      "executiveSummary": "...",
      "requiredMaterials": ["...", "...", ...],
      "requiredColors": ["...", "...", ...]
    },
    "en": {
      "introduction": "...",
      "description": "...",
      "period": "...",
      "characteristics": ["...", "...", ...],
      "visualElements": ["...", "...", ...],
      "colorGuidance": "...",
      "materialGuidance": "...",
      "historicalContext": "...",
      "culturalContext": "...",
      "applications": ["...", "...", ...],
      "executiveSummary": "...",
      "requiredMaterials": ["...", "...", ...],
      "requiredColors": ["...", "...", ...]
    }
  }
}

**GUIDELINES**:
- Prioritize sub-category characteristics (60% weight)
- Integrate approach philosophy (25% weight)
- Weave in color throughout (15% weight)
- Be specific and detailed, not generic
- Use professional design terminology
- Maintain historical accuracy where applicable
- Focus on FACTS and DETAILS, not poetry
- Ensure bilingual completeness (Hebrew and English must match)

**CRITICAL**:
- Return ONLY valid JSON
- NO markdown, NO code blocks, NO explanations
- All arrays must have the specified minimum number of items
- All text fields must be complete and detailed`
}

function formatArray(arr: string[]): string {
  if (!arr || arr.length === 0) return 'N/A'
  return arr.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
}
