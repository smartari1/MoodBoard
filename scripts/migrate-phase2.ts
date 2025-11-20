import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Phase 2 Migration...')
  
  // 1. Migrate Styles
  const styles = await prisma.style.findMany()
  for (const style of styles) {
    // Check if already migrated (simple check: if gallery has items but images was empty, or logic specific to your DB state)
    // Actually, since we renamed the field in schema, Prisma might not return 'images' in the type.
    // You might need to use @ts-ignore or raw query if the column name changed in Mongo (it usually stays as is).
    // In Mongo, if you rename in schema, the data is still there under the old key until overwritten.
    
    // Strategy: We assume 'images' data needs to move to 'gallery'.
    // Since we can't access 'images' via typed client easily if removed from schema, 
    // we treat the existing string array as a source for the new gallery.
    
    const oldImages = (style as any).images || []
    
    if (oldImages.length > 0 && style.gallery.length === 0) {
      const galleryItems = oldImages.map((url: string) => ({
        id: crypto.randomUUID(),
        url,
        type: 'scene',
        sceneName: 'legacy',
        createdAt: new Date()
      }))
      
      await prisma.style.update({
        where: { id: style.id },
        data: {
          gallery: galleryItems,
          priceTier: 'AFFORDABLE' // Default
        }
      })
      console.log(`✅ Migrated Style: ${style.slug}`)
    }
  }
  
  // 2. Migrate Room Profiles
  // Similar logic: Iterate styles, iterate roomProfiles, convert images -> views
  for (const style of styles) {
    if (style.roomProfiles && style.roomProfiles.length > 0) {
      const updatedRoomProfiles = style.roomProfiles.map((profile: any) => {
        const oldImages = profile.images || []
        const currentViews = profile.views || []
        
        if (oldImages.length > 0 && currentViews.length === 0) {
          const newViews = oldImages.map((url: string, index: number) => ({
            id: crypto.randomUUID(),
            url,
            orientation: index === 0 ? 'main' : 'other',
            status: 'COMPLETED',
            createdAt: new Date()
          }))
          return { ...profile, views: newViews }
        }
        return profile
      })

      // Check if any changes were made
      const hasChanges = updatedRoomProfiles.some((p, i) => {
         const old = style.roomProfiles[i] as any;
         return (p.views?.length || 0) !== (old.views?.length || 0);
      });

      if (hasChanges) {
          await prisma.style.update({
              where: { id: style.id },
              data: {
                  roomProfiles: updatedRoomProfiles
              }
          })
          console.log(`✅ Migrated Room Profiles for Style: ${style.slug}`)
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

