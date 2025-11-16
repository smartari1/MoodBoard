/**
 * Detailed Content Viewer Component
 * Displays rich, AI-generated content for entities (Approaches, Categories, etc.)
 */

'use client'

import { Accordion, Badge, Box, Divider, Image, SimpleGrid, Stack, Tabs, Text, Title } from '@mantine/core'
import {
  IconBook,
  IconBulb,
  IconCalendar,
  IconCheckbox,
  IconEye,
  IconPalette,
  IconPhoto,
  IconPuzzle,
  IconSparkles,
  IconWorld,
} from '@tabler/icons-react'
import { useParams } from 'next/navigation'

export interface DetailedContent {
  introduction?: string
  description?: string
  period?: string
  characteristics?: string[]
  visualElements?: string[]
  philosophy?: string
  colorGuidance?: string
  materialGuidance?: string
  applications?: string[]
  historicalContext?: string
  culturalContext?: string
}

export interface LocalizedDetailedContent {
  he: DetailedContent
  en: DetailedContent
}

interface DetailedContentViewerProps {
  content: LocalizedDetailedContent
  entityName: { he: string; en: string }
  entityType?: 'approach' | 'category' | 'subcategory' | 'style' | 'roomType'
  images?: string[]
}

export function DetailedContentViewer({
  content,
  entityName,
  entityType = 'approach',
  images = [],
}: DetailedContentViewerProps) {
  const params = useParams()
  const locale = (params.locale as string) || 'he'
  const isRTL = locale === 'he'

  const currentContent = content[locale as 'he' | 'en']

  return (
    <Box>
      <Tabs defaultValue="overview" dir={isRTL ? 'rtl' : 'ltr'}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconBook size={16} />}>
            {locale === 'he' ? 'סקירה כללית' : 'Overview'}
          </Tabs.Tab>
          <Tabs.Tab value="details" leftSection={<IconSparkles size={16} />}>
            {locale === 'he' ? 'פרטים מלאים' : 'Full Details'}
          </Tabs.Tab>
          {images.length > 0 && (
            <Tabs.Tab value="images" leftSection={<IconPhoto size={16} />}>
              {locale === 'he' ? `תמונות (${images.length})` : `Images (${images.length})`}
            </Tabs.Tab>
          )}
          <Tabs.Tab value="bilingual" leftSection={<IconWorld size={16} />}>
            {locale === 'he' ? 'דו־לשוני' : 'Bilingual'}
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab */}
        <Tabs.Panel value="overview" pt="md">
          <Stack gap="lg">
            <Box>
              <Title order={3} mb="xs">
                {entityName[locale as 'he' | 'en']}
              </Title>
              {currentContent.period && (
                <Badge variant="light" color="blue" leftSection={<IconCalendar size={14} />}>
                  {currentContent.period}
                </Badge>
              )}
            </Box>

            <Divider />

            {currentContent.introduction && (
              <Box>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  {locale === 'he' ? '📖 פתיח' : '📖 Introduction'}
                </Text>
                <Text size="md" style={{ lineHeight: 1.7 }}>
                  {currentContent.introduction}
                </Text>
              </Box>
            )}

            {currentContent.description && (
              <Box>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  {locale === 'he' ? '📝 תיאור' : '📝 Description'}
                </Text>
                <Text size="md" style={{ lineHeight: 1.7 }}>
                  {currentContent.description}
                </Text>
              </Box>
            )}

            {currentContent.philosophy && (
              <Box>
                <Text size="sm" fw={600} mb="xs" c="dimmed">
                  {locale === 'he' ? '💡 פילוסופיה' : '💡 Philosophy'}
                </Text>
                <Text size="md" style={{ lineHeight: 1.7 }}>
                  {currentContent.philosophy}
                </Text>
              </Box>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Details Tab */}
        <Tabs.Panel value="details" pt="md">
          <Accordion variant="separated" defaultValue="characteristics">
            {/* Characteristics */}
            {currentContent.characteristics && currentContent.characteristics.length > 0 && (
              <Accordion.Item value="characteristics">
                <Accordion.Control icon={<IconCheckbox size={20} />}>
                  <Text fw={600}>
                    {locale === 'he' ? 'מאפיינים מרכזיים' : 'Key Characteristics'}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {currentContent.characteristics.map((char, idx) => (
                      <Box key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Text size="sm" c="brand" fw={600}>
                          {idx + 1}.
                        </Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {char}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Visual Elements */}
            {currentContent.visualElements && currentContent.visualElements.length > 0 && (
              <Accordion.Item value="visualElements">
                <Accordion.Control icon={<IconEye size={20} />}>
                  <Text fw={600}>
                    {locale === 'he' ? 'אלמנטים ויזואליים' : 'Visual Elements'}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {currentContent.visualElements.map((elem, idx) => (
                      <Box key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Text size="sm" c="brand" fw={600}>
                          •
                        </Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {elem}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Color Guidance */}
            {currentContent.colorGuidance && (
              <Accordion.Item value="colorGuidance">
                <Accordion.Control icon={<IconPalette size={20} />}>
                  <Text fw={600}>{locale === 'he' ? 'הנחיות צבעים' : 'Color Guidance'}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.7 }}>
                    {currentContent.colorGuidance}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Material Guidance */}
            {currentContent.materialGuidance && (
              <Accordion.Item value="materialGuidance">
                <Accordion.Control icon={<IconPuzzle size={20} />}>
                  <Text fw={600}>{locale === 'he' ? 'הנחיות חומרים' : 'Material Guidance'}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.7 }}>
                    {currentContent.materialGuidance}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Applications */}
            {currentContent.applications && currentContent.applications.length > 0 && (
              <Accordion.Item value="applications">
                <Accordion.Control icon={<IconBulb size={20} />}>
                  <Text fw={600}>{locale === 'he' ? 'תחומי יישום' : 'Applications'}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {currentContent.applications.map((app, idx) => (
                      <Box key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Text size="sm" c="brand" fw={600}>
                          ✓
                        </Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {app}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Historical Context */}
            {currentContent.historicalContext && (
              <Accordion.Item value="historicalContext">
                <Accordion.Control icon={<IconBook size={20} />}>
                  <Text fw={600}>{locale === 'he' ? 'רקע היסטורי' : 'Historical Context'}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.7 }}>
                    {currentContent.historicalContext}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* Cultural Context */}
            {currentContent.culturalContext && (
              <Accordion.Item value="culturalContext">
                <Accordion.Control icon={<IconWorld size={20} />}>
                  <Text fw={600}>{locale === 'he' ? 'הקשר תרבותי' : 'Cultural Context'}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.7 }}>
                    {currentContent.culturalContext}
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            )}
          </Accordion>
        </Tabs.Panel>

        {/* Images Tab */}
        {images.length > 0 && (
          <Tabs.Panel value="images" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {locale === 'he'
                  ? `${images.length} תמונות שנוצרו באמצעות AI המייצגות את ${entityName[locale as 'he' | 'en']}`
                  : `${images.length} AI-generated images representing ${entityName[locale as 'he' | 'en']}`
                }
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {images.map((imageUrl, idx) => (
                  <Box key={idx} style={{ position: 'relative', aspectRatio: '3/2' }}>
                    <Image
                      src={imageUrl}
                      alt={`${entityName[locale as 'he' | 'en']} - ${locale === 'he' ? 'תמונה' : 'Image'} ${idx + 1}`}
                      radius="md"
                      fit="cover"
                      h="100%"
                      w="100%"
                      style={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                    <Badge
                      size="xs"
                      variant="filled"
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: isRTL ? 'auto' : 8,
                        left: isRTL ? 8 : 'auto',
                      }}
                    >
                      {idx + 1}
                    </Badge>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>
        )}

        {/* Bilingual Tab */}
        <Tabs.Panel value="bilingual" pt="md">
          <Stack gap="xl">
            {/* Hebrew */}
            <Box>
              <Title order={4} mb="md" c="brand">
                🇮🇱 עברית
              </Title>
              <Stack gap="md">
                {content.he.introduction && (
                  <Box>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                      פתיח
                    </Text>
                    <Text size="sm">{content.he.introduction}</Text>
                  </Box>
                )}
                {content.he.description && (
                  <Box>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                      תיאור
                    </Text>
                    <Text size="sm">{content.he.description}</Text>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* English */}
            <Box>
              <Title order={4} mb="md" c="brand">
                🇬🇧 English
              </Title>
              <Stack gap="md">
                {content.en.introduction && (
                  <Box>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                      Introduction
                    </Text>
                    <Text size="sm">{content.en.introduction}</Text>
                  </Box>
                )}
                {content.en.description && (
                  <Box>
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                      Description
                    </Text>
                    <Text size="sm">{content.en.description}</Text>
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
