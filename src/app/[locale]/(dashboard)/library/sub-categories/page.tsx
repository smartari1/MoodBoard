'use client'

import { Container, Stack, TextInput, Group, Select } from '@mantine/core'
import { IconCategory2, IconSearch, IconFilter } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { LibraryHero } from '@/components/features/library/LibraryHero'
import { LibraryGrid } from '@/components/features/library/LibraryGrid'
import { LibraryCard } from '@/components/features/library/LibraryCard'

interface SubCategory {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  slug: string
  images: string[]
  category: {
    id: string
    name: { he: string; en: string }
  }
  _count?: { styles: number }
}

interface Category {
  id: string
  name: { he: string; en: string }
}

async function fetchSubCategories(): Promise<{ data: SubCategory[] }> {
  const res = await fetch('/api/admin/sub-categories')
  if (!res.ok) throw new Error('Failed to fetch sub-categories')
  return res.json()
}

async function fetchCategories(): Promise<{ data: Category[] }> {
  const res = await fetch('/api/admin/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export default function SubCategoriesPage() {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const { data: subCategoriesData, isLoading: subCategoriesLoading } = useQuery({
    queryKey: ['sub-categories'],
    queryFn: fetchSubCategories,
    staleTime: 5 * 60 * 1000,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })

  const subCategories = subCategoriesData?.data || []
  const categories = categoriesData?.data || []

  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      value: cat.id,
      label: cat.name[locale],
    }))
  }, [categories, locale])

  const filteredSubCategories = useMemo(() => {
    let filtered = subCategories

    if (categoryFilter) {
      filtered = filtered.filter((sub) => sub.category?.id === categoryFilter)
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (sub) =>
          sub.name.he.toLowerCase().includes(searchLower) ||
          sub.name.en.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [subCategories, search, categoryFilter])

  return (
    <Stack gap={0}>
      <LibraryHero
        title="תתי-קטגוריות"
        subtitle="סגנונות עיצוב מפורטים"
        description="גלו את כל תתי-הקטגוריות של עיצוב פנים - סגנונות ייחודיים ומגוונים לכל טעם ופרויקט."
        icon={<IconCategory2 size={28} />}
        count={subCategories.length}
        countLabel="תתי-קטגוריות"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'תתי-קטגוריות', href: `/${locale}/library/sub-categories` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Filters */}
        <Group justify="flex-end" mb="xl" gap="md">
          <Select
            placeholder="סנן לפי קטגוריה"
            leftSection={<IconFilter size={16} />}
            data={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            style={{ width: 200 }}
          />
          <TextInput
            placeholder="חיפוש תת-קטגוריה..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Group>

        {subCategoriesLoading ? (
          <LoadingState message="טוען תתי-קטגוריות..." />
        ) : filteredSubCategories.length === 0 ? (
          <EmptyState
            title="לא נמצאו תתי-קטגוריות"
            description={search || categoryFilter ? 'נסו לשנות את הסינון' : 'אין תתי-קטגוריות זמינות'}
            icon={<IconCategory2 size={48} />}
          />
        ) : (
          <LibraryGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}>
            {filteredSubCategories.map((subCategory) => (
              <LibraryCard
                key={subCategory.id}
                title={subCategory.name[locale]}
                subtitle={subCategory.category?.name?.[locale]}
                imageUrl={subCategory.images?.[0]}
                href={`/${locale}/library/sub-categories/${subCategory.id}`}
                count={subCategory._count?.styles || 0}
                countLabel="סגנונות"
              />
            ))}
          </LibraryGrid>
        )}
      </Container>
    </Stack>
  )
}
