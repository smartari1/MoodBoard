#!/usr/bin/env tsx
/**
 * Check if description field is populated
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const approach = await prisma.approach.findFirst({
    where: { slug: 'eclectic' },
    select: {
      name: true,
      description: true,
    },
  })

  if (!approach) {
    console.log('❌ No approach found')
    return
  }

  console.log('\n✅ Approach found:', approach.name.he, '/', approach.name.en)
  console.log('\n📝 Description field:')
  if (approach.description) {
    console.log('  ✅ Hebrew:', approach.description.he)
    console.log('  ✅ English:', approach.description.en)
  } else {
    console.log('  ❌ Description is NULL or empty')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
