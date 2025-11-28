/**
 * Migration Script: Move pricing, availability, colorIds from Material to MaterialSupplier
 *
 * This script:
 * 1. Finds all materials that have pricing, availability, or colorIds at the material level
 * 2. For each material with suppliers, copies this data to the suppliers
 * 3. Cleans up the old fields from material documents
 *
 * Run with: npx tsx scripts/migrate-material-pricing-to-suppliers.ts
 */

import * as dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'

// Load environment variables
dotenv.config()

const MONGODB_URI = process.env.DATABASE_URL

if (!MONGODB_URI) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

interface OldMaterialDoc {
  _id: ObjectId
  sku?: string
  name?: { he: string; en: string }
  pricing?: {
    cost: number
    retail: number
    unit: string
    currency: string
    bulkDiscounts?: Array<{ minQuantity: number; discount: number }>
  }
  availability?: {
    inStock: boolean
    leadTime: number
    minOrder: number
  }
  properties?: {
    colorIds?: string[]
    [key: string]: unknown
  }
}

interface MaterialSupplierDoc {
  _id: ObjectId
  materialId: ObjectId
  organizationId: ObjectId
  pricing?: unknown
  availability?: unknown
  colorIds?: string[]
}

async function migrate() {
  console.log('🚀 Starting migration: Material pricing/availability/colors to suppliers...\n')

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to MongoDB\n')

    const db = client.db()
    const materialsCollection = db.collection<OldMaterialDoc>('materials')
    const suppliersCollection = db.collection<MaterialSupplierDoc>('material_suppliers')

    // Find materials that have old pricing, availability, or colorIds fields
    const materialsWithOldFields = await materialsCollection
      .find({
        $or: [
          { pricing: { $exists: true } },
          { availability: { $exists: true } },
          { 'properties.colorIds': { $exists: true } },
        ],
      })
      .toArray()

    console.log(`📦 Found ${materialsWithOldFields.length} materials with old fields\n`)

    if (materialsWithOldFields.length === 0) {
      console.log('✅ No materials need migration - all clean!\n')
      return
    }

    let migratedCount = 0
    let cleanedCount = 0
    let suppliersUpdated = 0

    for (const material of materialsWithOldFields) {
      console.log(`\n📋 Processing material: ${material.sku || material._id.toString()}`)
      console.log(`   Name: ${material.name?.he || material.name?.en || 'Unknown'}`)

      const hasOldPricing = !!material.pricing
      const hasOldAvailability = !!material.availability
      const hasOldColorIds =
        material.properties?.colorIds && material.properties.colorIds.length > 0

      console.log(`   Has pricing: ${hasOldPricing}`)
      console.log(`   Has availability: ${hasOldAvailability}`)
      console.log(`   Has colorIds: ${hasOldColorIds}`)

      // Find suppliers for this material
      const suppliers = await suppliersCollection
        .find({ materialId: material._id })
        .toArray()

      console.log(`   Suppliers count: ${suppliers.length}`)

      // If material has suppliers, copy the data to suppliers that don't have it
      if (suppliers.length > 0) {
        for (const supplier of suppliers) {
          const updateData: Record<string, unknown> = {}

          // Copy pricing if supplier doesn't have it
          if (hasOldPricing && !supplier.pricing) {
            updateData.pricing = material.pricing
          }

          // Copy availability if supplier doesn't have it
          if (hasOldAvailability && !supplier.availability) {
            updateData.availability = material.availability
          }

          // Copy colorIds if supplier doesn't have it
          if (hasOldColorIds && (!supplier.colorIds || supplier.colorIds.length === 0)) {
            updateData.colorIds = material.properties!.colorIds
          }

          if (Object.keys(updateData).length > 0) {
            await suppliersCollection.updateOne(
              { _id: supplier._id },
              { $set: updateData }
            )
            suppliersUpdated++
            console.log(`   ✅ Updated supplier ${supplier._id.toString()}`)
          }
        }
        migratedCount++
      }

      // Clean up old fields from material document
      const unsetFields: Record<string, string> = {}
      if (hasOldPricing) unsetFields.pricing = ''
      if (hasOldAvailability) unsetFields.availability = ''
      if (hasOldColorIds) unsetFields['properties.colorIds'] = ''

      if (Object.keys(unsetFields).length > 0) {
        await materialsCollection.updateOne(
          { _id: material._id },
          { $unset: unsetFields }
        )
        cleanedCount++
        console.log(`   🧹 Cleaned up old fields from material`)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary:')
    console.log(`   Materials processed: ${materialsWithOldFields.length}`)
    console.log(`   Materials with data migrated to suppliers: ${migratedCount}`)
    console.log(`   Suppliers updated: ${suppliersUpdated}`)
    console.log(`   Materials cleaned up: ${cleanedCount}`)
    console.log('='.repeat(50))
    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Disconnected from MongoDB')
  }
}

// Run migration
migrate()
