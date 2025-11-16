#!/usr/bin/env tsx
/**
 * Quick script to view the generated approach data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const approach = await prisma.approach.findFirst({
    where: { slug: 'eclectic' },
  })

  if (!approach) {
    console.log('No approach found')
    return
  }

  console.log('\n🎨 Approach: Eclectic / אקלקטי\n')
  console.log('─'.repeat(80))
  console.log('\n📝 HEBREW CONTENT:\n')

  if (approach.detailedContent?.he) {
    const he = approach.detailedContent.he
    console.log('🔹 Introduction:')
    console.log(he.introduction || 'N/A')
    console.log('\n🔹 Description:')
    console.log(he.description || 'N/A')
    console.log('\n🔹 Philosophy:')
    console.log(he.philosophy || 'N/A')
    console.log('\n🔹 Characteristics:')
    he.characteristics?.forEach((c: string, i: number) => console.log(`  ${i + 1}. ${c}`))
    console.log('\n🔹 Visual Elements:')
    he.visualElements?.forEach((v: string, i: number) => console.log(`  ${i + 1}. ${v}`))
    console.log('\n🔹 Color Guidance:')
    console.log(he.colorGuidance || 'N/A')
    console.log('\n🔹 Material Guidance:')
    console.log(he.materialGuidance || 'N/A')
    console.log('\n🔹 Applications:')
    he.applications?.forEach((a: string, i: number) => console.log(`  ${i + 1}. ${a}`))
  }

  console.log('\n' + '─'.repeat(80))
  console.log('\n📝 ENGLISH CONTENT:\n')

  if (approach.detailedContent?.en) {
    const en = approach.detailedContent.en
    console.log('🔹 Introduction:')
    console.log(en.introduction || 'N/A')
    console.log('\n🔹 Description:')
    console.log(en.description || 'N/A')
    console.log('\n🔹 Philosophy:')
    console.log(en.philosophy || 'N/A')
    console.log('\n🔹 Characteristics:')
    en.characteristics?.forEach((c: string, i: number) => console.log(`  ${i + 1}. ${c}`))
    console.log('\n🔹 Visual Elements:')
    en.visualElements?.forEach((v: string, i: number) => console.log(`  ${i + 1}. ${v}`))
    console.log('\n🔹 Color Guidance:')
    console.log(en.colorGuidance || 'N/A')
    console.log('\n🔹 Material Guidance:')
    console.log(en.materialGuidance || 'N/A')
    console.log('\n🔹 Applications:')
    en.applications?.forEach((a: string, i: number) => console.log(`  ${i + 1}. ${a}`))
  }

  console.log('\n' + '─'.repeat(80))
  console.log('\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
