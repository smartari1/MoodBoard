'use client'

import { Container, Stack, TextInput, Group } from '@mantine/core'
import { IconCategory, IconSearch } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { LibraryHero } from '@/components/features/library/LibraryHero'
import { LibraryGrid } from '@/components/features/library/LibraryGrid'
import { LibraryCard } from '@/components/features/library/LibraryCard'

interface Category {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  slug: string
  images: string[]
  _count?: { subCategories: number; styles: number }
}

async function fetchCategories(): Promise<{ data: Category[] }> {
  const res = await fetch('/api/admin/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export default function CategoriesPage() {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })

  const categories = data?.data || []

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const searchLower = search.toLowerCase()
    return categories.filter(
      (cat) =>
        cat.name.he.toLowerCase().includes(searchLower) ||
        cat.name.en.toLowerCase().includes(searchLower)
    )
  }, [categories, search])

  return (
    <Stack gap={0}>
      <LibraryHero
        title="קטגוריות עיצוב"
        subtitle="סגנונות עיצוב ראשיים"
        description="גלו את כל הקטגוריות הראשיות של עיצוב פנים - מודרני, קלאסי, תעשייתי ועוד. כל קטגוריה מכילה תתי-קטגוריות ייחודיות."
        icon={<IconCategory size={28} />}
        count={categories.length}
        countLabel="קטגוריות"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'קטגוריות', href: `/${locale}/library/categories` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Search */}
        <Group justify="flex-end" mb="xl">
          <TextInput
            placeholder="חיפוש קטגוריה..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Group>

        {isLoading ? (
          <LoadingState message="טוען קטגוריות..." />
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            title="לא נמצאו קטגוריות"
            description={search ? 'נסו לחפש במילים אחרות' : 'אין קטגוריות זמינות כרגע'}
            icon={<IconCategory size={48} />}
          />
        ) : (
          <LibraryGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
            {filteredCategories.map((category) => (
              <LibraryCard
                key={category.id}
                title={category.name[locale]}
                subtitle={category.description?.[locale]}
                imageUrl={category.images?.[0]}
                href={`/${locale}/library/categories/${category.id}`}
                count={category._count?.subCategories || 0}
                countLabel="תתי-קטגוריות"
              />
            ))}
          </LibraryGrid>
        )}
      </Container>
    </Stack>
  )
}
