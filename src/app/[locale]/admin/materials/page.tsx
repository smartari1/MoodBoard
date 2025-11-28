/**
 * Admin Materials Management Page
 * Manage global materials catalog with reusable components
 */

'use client'

// FIX: Direct import instead of barrel to avoid compiling all 6 components
// Barrel imports force compilation of heavy components like IconSelector
import { MaterialList } from '@/components/features/materials/MaterialList'
import { Alert, Button, Container, Stack, Text, Title } from '@mantine/core'
import { IconInfoCircle, IconPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'

export default function AdminMaterialsPage() {
  const t = useTranslations('admin.materials')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Title order={1} c="brand" mb="sm">
            {t('title')}
          </Title>
          <Text c="dimmed" size="lg">
            {t('description')}
          </Text>
        </div>

        {/* How to Add Materials Info */}
        <Alert
          icon={<IconInfoCircle size={16} />}
          title={t('howToAdd.title')}
          color="blue"
          variant="light"
        >
          <Stack gap="xs">
            <Text size="sm">{t('howToAdd.description')}</Text>
            <Text size="sm" fw={500} mt="xs">
              {t('howToAdd.steps.title')}
            </Text>
            <ol style={{ margin: 0, paddingInlineStart: '1.5rem' }}>
              <li>
                <Text size="sm" component="span">
                  {t('howToAdd.steps.step1')}
                </Text>
              </li>
              <li>
                <Text size="sm" component="span">
                  {t('howToAdd.steps.step2')}
                </Text>
              </li>
              <li>
                <Text size="sm" component="span">
                  {t('howToAdd.steps.step3')}
                </Text>
              </li>
              <li>
                <Text size="sm" component="span">
                  {t('howToAdd.steps.step4')}
                </Text>
              </li>
            </ol>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push(`/${locale}/admin/materials/new`)}
              color="brand"
              variant="filled"
              mt="md"
              size="sm"
            >
              {t('createMaterial')}
            </Button>
          </Stack>
        </Alert>

        {/* Materials List */}
        <MaterialList />
      </Stack>
    </Container>
  )
}

