/**
 * Detailed Content Editor Component
 * Form fields for editing AI-generated detailed content
 */

'use client'

import { FormSection } from '@/components/ui/Form/FormSection'
import { Accordion, Box, Stack, Textarea, TextInput, Text, Button, Group } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useParams } from 'next/navigation'
import { Controller, Control, UseFormSetValue, UseFormWatch } from 'react-hook-form'

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

interface DetailedContentEditorProps {
  control: Control<any>
  errors?: any
  watch: UseFormWatch<any>
  setValue: UseFormSetValue<any>
  fieldPrefix?: string
  entityType?: 'approach' | 'category' | 'subcategory' | 'style' | 'roomType'
}

export function DetailedContentEditor({
  control,
  errors,
  watch,
  setValue,
  fieldPrefix = 'detailedContent',
  entityType = 'approach',
}: DetailedContentEditorProps) {
  const params = useParams()
  const locale = (params.locale as string) || 'he'

  // Helper to get array field value
  const getArrayValue = (lang: 'he' | 'en', field: string): string[] => {
    const value = watch(`${fieldPrefix}.${lang}.${field}`)
    return Array.isArray(value) ? value : []
  }

  // Helper to add array item
  const addArrayItem = (lang: 'he' | 'en', field: string) => {
    const current = getArrayValue(lang, field)
    setValue(`${fieldPrefix}.${lang}.${field}`, [...current, ''])
  }

  // Helper to remove array item
  const removeArrayItem = (lang: 'he' | 'en', field: string, index: number) => {
    const current = getArrayValue(lang, field)
    setValue(
      `${fieldPrefix}.${lang}.${field}`,
      current.filter((_, i) => i !== index)
    )
  }

  // Helper to update array item
  const updateArrayItem = (lang: 'he' | 'en', field: string, index: number, value: string) => {
    const current = getArrayValue(lang, field)
    const updated = [...current]
    updated[index] = value
    setValue(`${fieldPrefix}.${lang}.${field}`, updated)
  }

  const renderLanguageSection = (lang: 'he' | 'en', title: string) => (
    <FormSection title={title}>
      <Accordion variant="separated" defaultValue="basic">
        {/* Basic Information */}
        <Accordion.Item value="basic">
          <Accordion.Control>
            {lang === 'he' ? 'מידע בסיסי' : 'Basic Information'}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Controller
                name={`${fieldPrefix}.${lang}.introduction`}
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    value={field.value || ''}
                    label={lang === 'he' ? 'פתיח (2-3 משפטים)' : 'Introduction (2-3 sentences)'}
                    placeholder={
                      lang === 'he'
                        ? 'פסקה קצרה שמציגה את הישות...'
                        : 'A brief paragraph introducing the entity...'
                    }
                    minRows={3}
                    error={errors?.detailedContent?.[lang]?.introduction?.message}
                  />
                )}
              />

              <Controller
                name={`${fieldPrefix}.${lang}.description`}
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    value={field.value || ''}
                    label={lang === 'he' ? 'תיאור מלא' : 'Full Description'}
                    placeholder={
                      lang === 'he' ? 'תיאור מפורט...' : 'Detailed description...'
                    }
                    minRows={5}
                    error={errors?.detailedContent?.[lang]?.description?.message}
                  />
                )}
              />

              <Controller
                name={`${fieldPrefix}.${lang}.period`}
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...field}
                    value={field.value || ''}
                    value={field.value || ''}
                    label={lang === 'he' ? 'תקופה (אופציונלי)' : 'Period (optional)'}
                    placeholder={lang === 'he' ? 'לדוגמה: 1920-1939' : 'e.g., 1920-1939'}
                    error={errors?.detailedContent?.[lang]?.period?.message}
                  />
                )}
              />

              {(entityType === 'approach' || entityType === 'style') && (
                <Controller
                  name={`${fieldPrefix}.${lang}.philosophy`}
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                    value={field.value || ''}
                      label={lang === 'he' ? 'פילוסופיה' : 'Philosophy'}
                      placeholder={
                        lang === 'he' ? 'הפילוסופיה העיצובית...' : 'Design philosophy...'
                      }
                      minRows={4}
                      error={errors?.detailedContent?.[lang]?.philosophy?.message}
                    />
                  )}
                />
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Characteristics */}
        <Accordion.Item value="characteristics">
          <Accordion.Control>
            {lang === 'he' ? 'מאפיינים מרכזיים' : 'Key Characteristics'}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {getArrayValue(lang, 'characteristics').map((char, index) => (
                <Group key={index} align="flex-start">
                  <TextInput
                    style={{ flex: 1 }}
                    value={char}
                    onChange={(e) =>
                      updateArrayItem(lang, 'characteristics', index, e.target.value)
                    }
                    placeholder={lang === 'he' ? `מאפיין ${index + 1}` : `Characteristic ${index + 1}`}
                  />
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={() => removeArrayItem(lang, 'characteristics', index)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>
              ))}
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => addArrayItem(lang, 'characteristics')}
              >
                {lang === 'he' ? 'הוסף מאפיין' : 'Add Characteristic'}
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Visual Elements */}
        <Accordion.Item value="visualElements">
          <Accordion.Control>
            {lang === 'he' ? 'אלמנטים ויזואליים' : 'Visual Elements'}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {getArrayValue(lang, 'visualElements').map((elem, index) => (
                <Group key={index} align="flex-start">
                  <TextInput
                    style={{ flex: 1 }}
                    value={elem}
                    onChange={(e) =>
                      updateArrayItem(lang, 'visualElements', index, e.target.value)
                    }
                    placeholder={lang === 'he' ? `אלמנט ${index + 1}` : `Element ${index + 1}`}
                  />
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={() => removeArrayItem(lang, 'visualElements', index)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>
              ))}
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => addArrayItem(lang, 'visualElements')}
              >
                {lang === 'he' ? 'הוסף אלמנט' : 'Add Element'}
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Guidance */}
        <Accordion.Item value="guidance">
          <Accordion.Control>{lang === 'he' ? 'הנחיות' : 'Guidance'}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Controller
                name={`${fieldPrefix}.${lang}.colorGuidance`}
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    label={lang === 'he' ? 'הנחיות צבעים' : 'Color Guidance'}
                    placeholder={
                      lang === 'he' ? 'המלצות לגבי צבעים...' : 'Color recommendations...'
                    }
                    minRows={3}
                    error={errors?.detailedContent?.[lang]?.colorGuidance?.message}
                  />
                )}
              />

              <Controller
                name={`${fieldPrefix}.${lang}.materialGuidance`}
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    label={lang === 'he' ? 'הנחיות חומרים' : 'Material Guidance'}
                    placeholder={
                      lang === 'he' ? 'המלצות לגבי חומרים...' : 'Material recommendations...'
                    }
                    minRows={3}
                    error={errors?.detailedContent?.[lang]?.materialGuidance?.message}
                  />
                )}
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Applications */}
        <Accordion.Item value="applications">
          <Accordion.Control>{lang === 'he' ? 'תחומי יישום' : 'Applications'}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {getArrayValue(lang, 'applications').map((app, index) => (
                <Group key={index} align="flex-start">
                  <TextInput
                    style={{ flex: 1 }}
                    value={app}
                    onChange={(e) => updateArrayItem(lang, 'applications', index, e.target.value)}
                    placeholder={lang === 'he' ? `יישום ${index + 1}` : `Application ${index + 1}`}
                  />
                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={() => removeArrayItem(lang, 'applications', index)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>
              ))}
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => addArrayItem(lang, 'applications')}
              >
                {lang === 'he' ? 'הוסף יישום' : 'Add Application'}
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Context (for styles and categories) */}
        {(entityType === 'style' || entityType === 'category') && (
          <Accordion.Item value="context">
            <Accordion.Control>{lang === 'he' ? 'הקשר' : 'Context'}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Controller
                  name={`${fieldPrefix}.${lang}.historicalContext`}
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                    value={field.value || ''}
                      label={lang === 'he' ? 'רקע היסטורי' : 'Historical Context'}
                      placeholder={
                        lang === 'he' ? 'רקע היסטורי...' : 'Historical background...'
                      }
                      minRows={4}
                      error={errors?.detailedContent?.[lang]?.historicalContext?.message}
                    />
                  )}
                />

                <Controller
                  name={`${fieldPrefix}.${lang}.culturalContext`}
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                    value={field.value || ''}
                      label={lang === 'he' ? 'הקשר תרבותי' : 'Cultural Context'}
                      placeholder={
                        lang === 'he' ? 'השפעות תרבותיות...' : 'Cultural influences...'
                      }
                      minRows={4}
                      error={errors?.detailedContent?.[lang]?.culturalContext?.message}
                    />
                  )}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </FormSection>
  )

  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        {locale === 'he'
          ? 'תוכן מפורט - נוצר באמצעות AI או ניתן לעריכה ידנית'
          : 'Detailed Content - AI-generated or manually editable'}
      </Text>

      {renderLanguageSection('he', '🇮🇱 תוכן מפורט בעברית')}
      {renderLanguageSection('en', '🇬🇧 Detailed Content in English')}
    </Stack>
  )
}
