/**
 * Migration Script: Materials to Suppliers
 *
 * This script migrates materials from the old organizationId field
 * to the new MaterialSupplier many-to-many relationship.
 *
 * Run with: npx tsx scripts/migrate-materials-to-suppliers.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateMaterialsToSuppliers() {
  console.log('Starting migration: Materials to Suppliers...\n')

  try {
    // Get all materials - the old organizationId field no longer exists in the schema
    // but may still exist in the database documents (MongoDB)
    const materials = await prisma.material.findMany({
      include: {
        suppliers: true,
      },
    })

    console.log(`Found ${materials.length} materials to check\n`)

    let migratedCount = 0
    let skippedCount = 0
    let alreadyMigratedCount = 0

    for (const material of materials) {
      // Check if material already has suppliers
      if (material.suppliers && material.suppliers.length > 0) {
        alreadyMigratedCount++
        continue
      }

      // Access the raw document to check for old organizationId field
      // Since Prisma doesn't know about this field anymore, we need to query it raw
      const rawMaterial = await prisma.$runCommandRaw({
        find: 'materials',
        filter: { _id: { $oid: material.id } },
        limit: 1,
      }) as any

      const doc = rawMaterial.cursor?.firstBatch?.[0]
      const organizationId = doc?.organizationId

      if (!organizationId) {
        // No organizationId - this is a global material
        skippedCount++
        console.log(`  [SKIP] ${material.name.he} (${material.sku || 'no SKU'}) - Global material (no org)`)
        continue
      }

      // Verify the organization exists
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      })

      if (!org) {
        console.log(`  [WARN] ${material.name.he} (${material.sku || 'no SKU'}) - Organization ${organizationId} not found, skipping`)
        skippedCount++
        continue
      }

      // Create MaterialSupplier record
      try {
        await prisma.materialSupplier.create({
          data: {
            materialId: material.id,
            organizationId: organizationId,
            isPreferred: true, // Mark as preferred since it was the original org
          },
        })

        migratedCount++
        console.log(`  [OK] ${material.name.he} (${material.sku || 'no SKU'}) -> Supplier: ${org.name}`)
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Unique constraint violation - already exists
          alreadyMigratedCount++
        } else {
          console.error(`  [ERROR] ${material.name.he}: ${err.message}`)
        }
      }
    }

    console.log('\n--- Migration Summary ---')
    console.log(`Total materials: ${materials.length}`)
    console.log(`Migrated: ${migratedCount}`)
    console.log(`Already migrated: ${alreadyMigratedCount}`)
    console.log(`Skipped (global): ${skippedCount}`)

    // Optional: Clean up old organizationId field from documents
    console.log('\n--- Cleaning up old organizationId field ---')
    const cleanupResult = await prisma.$runCommandRaw({
      update: 'materials',
      updates: [
        {
          q: { organizationId: { $exists: true } },
          u: { $unset: { organizationId: '' } },
          multi: true,
        },
      ],
    }) as any

    console.log(`Cleaned up ${cleanupResult.nModified || 0} documents`)

    console.log('\nMigration completed successfully!')

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateMaterialsToSuppliers()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
