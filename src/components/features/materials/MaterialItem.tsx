/**
 * Material Item/Detail Component
 * Reusable component for displaying detailed material information
 *
 * Architecture:
 * - Material: Shared properties (name, category, properties, assets)
 * - MaterialSupplier: Per-supplier data (pricing, availability, colors)
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/ui/ErrorState'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { LoadingState } from '@/components/ui/LoadingState'
import { MoodBBadge } from '@/components/ui/Badge'
import { MoodBCard } from '@/components/ui/Card'
import { useAuth } from '@/hooks/use-auth/useAuth'
import { useColors } from '@/hooks/useColors'
import { useMaterialCategory, useMaterialType } from '@/hooks/useMaterialCategories'
import { useDeleteMaterial, useMaterial, type Material, type MaterialSupplier } from '@/hooks/useMaterials'
import { Accordion, Badge, Button, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core'
import { IconArrowLeft, IconBuilding, IconEdit, IconStar, IconTrash } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface MaterialItemProps {
  materialId: string
  showActions?: boolean
  onEdit?: (material: Material) => void
  onDelete?: (materialId: string) => void
}

export function MaterialItem({ materialId, showActions = true, onEdit, onDelete }: MaterialItemProps) {
  const t = useTranslations('admin.materials')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const { organization } = useAuth()

  const { data: material, isLoading, error } = useMaterial(materialId)
  const deleteMutation = useDeleteMaterial()
  const [deleteOpened, setDeleteOpened] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Get suppliers from material
  const suppliers = material?.suppliers || []
  const hasSuppliers = suppliers.length > 0

  // Get preferred supplier or first supplier for quick display
  const preferredSupplier = useMemo(() => {
    if (!hasSuppliers) return null
    return suppliers.find((s) => s.isPreferred) || suppliers[0]
  }, [suppliers, hasSuppliers])

  // Aggregate all color IDs from all suppliers
  const allColorIds = useMemo(() => {
    const ids = new Set<string>()
    suppliers.forEach((s) => {
      (s.colorIds || []).forEach((id) => ids.add(id))
    })
    return Array.from(ids)
  }, [suppliers])

  // Fetch colors
  const { data: colorsData } = useColors({ page: 1, limit: 200 })
  const allColors = colorsData?.data || []
  const materialColors = useMemo(() => {
    return allColors.filter((color) => allColorIds.includes(color.id))
  }, [allColors, allColorIds])

  // Helper to check if an ObjectId is valid (not null/placeholder)
  const isValidObjectId = (id: string | undefined | null): boolean => {
    if (!id) return false
    // Check for null ObjectId placeholder
    if (id === '000000000000000000000000') return false
    // Check for valid MongoDB ObjectId format (24 hex characters)
    return /^[a-f\d]{24}$/i.test(id)
  }

  // Fetch category and type
  const { data: category } = useMaterialCategory(material?.categoryId || '', {
    enabled: isValidObjectId(material?.categoryId),
  })
  const { data: materialType } = useMaterialType(material?.properties.typeId || '', {
    enabled: isValidObjectId(material?.properties.typeId),
  })

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(materialId)
      setDeleteOpened(false)
      if (onDelete) {
        onDelete(materialId)
      } else {
        router.push(`/${locale}/admin/materials`)
      }
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (error || !material) {
    return <ErrorState message={tCommon('error')} />
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      {showActions && (
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.push(`/${locale}/admin/materials`)}
          >
            {tCommon('back')}
          </Button>
          <Group ml="auto">
            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={() => {
                if (onEdit) {
                  onEdit(material)
                } else {
                  router.push(`/${locale}/admin/materials/${material.id}/edit`)
                }
              }}
            >
              {tCommon('edit')}
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => setDeleteOpened(true)}
            >
              {tCommon('delete')}
            </Button>
          </Group>
        </Group>
      )}

      {/* Basic Information */}
      <MoodBCard>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="xl" fw={700} c="brand">
                {material.name.he}
              </Text>
              <Text size="sm" c="dimmed">
                {material.name.en}
              </Text>
            </div>
            {preferredSupplier?.availability ? (
              <MoodBBadge color={preferredSupplier.availability.inStock ? 'green' : 'red'} size="lg">
                {preferredSupplier.availability.inStock ? t('inStock') : t('outOfStock')}
              </MoodBBadge>
            ) : (
              <MoodBBadge color="gray" size="lg">
                {t('noSuppliers')}
              </MoodBBadge>
            )}
          </Group>

          <Divider />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.sku')}
              </Text>
              <Text fw={500} ff="monospace">
                {material.sku}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.category')}
              </Text>
              <Text fw={500}>
                {category ? `${category.name.he} (${category.name.en})` : material.categoryId}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.type')}
              </Text>
              <MoodBBadge>
                {materialType ? `${materialType.name.he} (${materialType.name.en})` : material.properties.typeId}
              </MoodBBadge>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.subType')}
              </Text>
              <Text fw={500}>{material.properties.subType}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('suppliers')}
              </Text>
              <Text fw={500}>{suppliers.length} {suppliers.length === 1 ? t('supplier') : t('suppliers')}</Text>
            </div>
          </SimpleGrid>
        </Stack>
      </MoodBCard>

      {/* Properties */}
      <MoodBCard>
        <Text size="lg" fw={600} mb="md">
          {t('detail.properties')}
        </Text>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.colors')}
              </Text>
              <Group gap="xs">
                {materialColors.length > 0 ? (
                  materialColors.map((color) => (
                    <Group key={color.id} gap="xs">
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          backgroundColor: color.hex,
                          border: '1px solid #ddd',
                          borderRadius: 4,
                        }}
                      />
                      <Text fw={500} size="sm">
                        {color.name.he}
                      </Text>
                      {color.pantone && (
                        <Text size="xs" c="dimmed">
                          ({color.pantone})
                        </Text>
                      )}
                    </Group>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    {t('detail.noColors')}
                  </Text>
                )}
              </Group>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.texture')}
              </Text>
              <Text fw={500}>{material.properties.texture}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.finish')}
              </Text>
              <Group gap="xs">
                {material.properties.finish.length > 0 ? (
                  material.properties.finish.map((finish, idx) => (
                    <Badge key={idx} variant="light">
                      {finish}
                    </Badge>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    {t('detail.noFinish')}
                  </Text>
                )}
              </Group>
            </div>
          </SimpleGrid>

          {/* Technical Specs */}
          <Divider />
          <Text size="md" fw={600} mb="sm">
            {t('detail.technicalSpecs')}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.durability')}
              </Text>
              <Text fw={500}>{material.properties.technical.durability}/10</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.maintenance')}
              </Text>
              <Text fw={500}>{material.properties.technical.maintenance}/10</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.sustainability')}
              </Text>
              <Text fw={500}>{material.properties.technical.sustainability}/10</Text>
            </div>
          </SimpleGrid>
        </Stack>
      </MoodBCard>

      {/* Suppliers */}
      {hasSuppliers && (
        <MoodBCard>
          <Text size="lg" fw={600} mb="md">
            {t('suppliers')} ({suppliers.length})
          </Text>
          <Accordion variant="separated">
            {suppliers.map((supplier, index) => (
              <Accordion.Item key={supplier.id || index} value={supplier.id || `supplier-${index}`}>
                <Accordion.Control>
                  <Group gap="sm">
                    <IconBuilding size={18} />
                    <Text fw={500}>{supplier.organization?.name || `${t('supplier')} ${index + 1}`}</Text>
                    {supplier.isPreferred && (
                      <Badge color="yellow" size="sm" leftSection={<IconStar size={12} />}>
                        {t('preferred')}
                      </Badge>
                    )}
                    {supplier.availability?.inStock ? (
                      <Badge color="green" size="sm">{t('inStock')}</Badge>
                    ) : (
                      <Badge color="red" size="sm">{t('outOfStock')}</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    {/* Supplier Pricing */}
                    <div>
                      <Text size="sm" fw={600} mb="xs">{t('detail.pricing')}</Text>
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <div>
                          <Text size="sm" c="dimmed" mb={4}>{t('detail.cost')}</Text>
                          <Text size="lg" fw={700}>
                            {supplier.pricing?.cost || 0} {supplier.pricing?.currency || 'ILS'}
                          </Text>
                          <Text size="sm" c="dimmed">/ {supplier.pricing?.unit || t('unit')}</Text>
                        </div>
                        <div>
                          <Text size="sm" c="dimmed" mb={4}>{t('detail.retail')}</Text>
                          <Text size="lg" fw={700}>
                            {supplier.pricing?.retail || 0} {supplier.pricing?.currency || 'ILS'}
                          </Text>
                          <Text size="sm" c="dimmed">/ {supplier.pricing?.unit || t('unit')}</Text>
                        </div>
                      </SimpleGrid>
                    </div>

                    {/* Supplier Availability */}
                    <Divider />
                    <div>
                      <Text size="sm" fw={600} mb="xs">{t('detail.availability')}</Text>
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <div>
                          <Text size="sm" c="dimmed" mb={4}>{t('detail.leadTime')}</Text>
                          <Text fw={500}>{supplier.availability?.leadTime || 0} {t('detail.days')}</Text>
                        </div>
                        <div>
                          <Text size="sm" c="dimmed" mb={4}>{t('detail.minOrder')}</Text>
                          <Text fw={500}>{supplier.availability?.minOrder || 0} {supplier.pricing?.unit || t('unit')}</Text>
                        </div>
                      </SimpleGrid>
                    </div>

                    {/* Supplier Colors */}
                    {supplier.colorIds && supplier.colorIds.length > 0 && (
                      <>
                        <Divider />
                        <div>
                          <Text size="sm" fw={600} mb="xs">{t('detail.colors')}</Text>
                          <Group gap="xs">
                            {allColors
                              .filter((color) => supplier.colorIds?.includes(color.id))
                              .map((color) => (
                                <Group key={color.id} gap="xs">
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      backgroundColor: color.hex,
                                      border: '1px solid #ddd',
                                      borderRadius: 4,
                                    }}
                                  />
                                  <Text size="sm">{color.name.he}</Text>
                                </Group>
                              ))}
                          </Group>
                        </div>
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </MoodBCard>
      )}

      {/* Quick Pricing Summary (from preferred supplier) */}
      {preferredSupplier?.pricing && (
        <MoodBCard>
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={600}>
              {t('detail.pricing')}
            </Text>
            <Badge color="blue" variant="light">
              {preferredSupplier.organization?.name || t('preferredSupplier')}
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.cost')}
              </Text>
              <Text size="xl" fw={700}>
                {preferredSupplier.pricing.cost} {preferredSupplier.pricing.currency}
              </Text>
              <Text size="sm" c="dimmed">
                / {preferredSupplier.pricing.unit}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.retail')}
              </Text>
              <Text size="xl" fw={700}>
                {preferredSupplier.pricing.retail} {preferredSupplier.pricing.currency}
              </Text>
              <Text size="sm" c="dimmed">
                / {preferredSupplier.pricing.unit}
              </Text>
            </div>
          </SimpleGrid>
        </MoodBCard>
      )}

      {/* Quick Availability Summary (from preferred supplier) */}
      {preferredSupplier?.availability && (
        <MoodBCard>
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={600}>
              {t('detail.availability')}
            </Text>
            <Badge color="blue" variant="light">
              {preferredSupplier.organization?.name || t('preferredSupplier')}
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.leadTime')}
              </Text>
              <Text fw={500}>{preferredSupplier.availability.leadTime} {t('detail.days')}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                {t('detail.minOrder')}
              </Text>
              <Text fw={500}>{preferredSupplier.availability.minOrder} {preferredSupplier.pricing?.unit || t('unit')}</Text>
            </div>
          </SimpleGrid>
        </MoodBCard>
      )}

      {/* Image Gallery */}
      <MoodBCard>
        <Text size="lg" fw={600} mb="md">
          {t('detail.imageGallery')}
        </Text>
        <ImageUpload
          entityType="material"
          entityId={material.id}
          value={material.assets.images || []}
          onChange={(images) => {
            // This will be handled by the parent component or API update
            // For now, just display the images
          }}
          maxImages={20}
          multiple
          disabled={!showActions}
        />
      </MoodBCard>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        onConfirm={handleDelete}
        title={t('deleteMaterial')}
        message={t('deleteMaterialMessage')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        loading={isDeleting}
      />
    </Stack>
  )
}

