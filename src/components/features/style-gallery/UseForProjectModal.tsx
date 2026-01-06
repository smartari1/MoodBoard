'use client'

import { Modal, Stack, Text, Select, Button, Group, Paper, Alert, Loader } from '@mantine/core'
import { IconCopy, IconFolder, IconCheck, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useForkFromStyle } from '@/hooks/useProjectStyle'

interface UseForProjectModalProps {
  opened: boolean
  onClose: () => void
  styleId: string
  locale: 'he' | 'en'
}

export function UseForProjectModal({ opened, onClose, styleId, locale }: UseForProjectModalProps) {
  const router = useRouter()
  const { data: projectsData, isLoading: projectsLoading } = useProjects()
  const forkMutation = useForkFromStyle()

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [forkStatus, setForkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [forkError, setForkError] = useState<string | null>(null)
  const [forkResult, setForkResult] = useState<{ forkedRoomsCount: number } | null>(null)

  const projects = projectsData?.data || []

  const handleUseForProject = async () => {
    if (!selectedProjectId) return

    setForkStatus('loading')
    setForkError(null)

    try {
      const result = await forkMutation.mutateAsync({
        projectId: selectedProjectId,
        sourceStyleId: styleId,
      })
      setForkStatus('success')
      setForkResult({ forkedRoomsCount: result.forkedRoomsCount })
    } catch (err: any) {
      setForkStatus('error')
      setForkError(err.message || (locale === 'he' ? 'שגיאה בהעתקת הסגנון' : 'Error copying style'))
    }
  }

  const handleCloseModal = () => {
    onClose()
    // Reset state after modal animation
    setTimeout(() => {
      setSelectedProjectId(null)
      setForkStatus('idle')
      setForkError(null)
      setForkResult(null)
    }, 200)
  }

  const handleGoToProjectStyle = () => {
    if (selectedProjectId) {
      router.push(`/${locale}/projects/${selectedProjectId}/style`)
    }
    handleCloseModal()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleCloseModal}
      title={locale === 'he' ? 'השתמש בסגנון זה לפרויקט' : 'Use This Style for Project'}
      size="md"
      centered
    >
      <Stack gap="md">
        {forkStatus === 'idle' && (
          <>
            <Text size="sm" c="dimmed">
              {locale === 'he'
                ? 'בחר פרויקט להעתקת הסגנון אליו. כל החדרים והאלמנטים יועתקו בחינם.'
                : 'Select a project to copy this style to. All rooms and elements will be copied for free.'}
            </Text>

            {projectsLoading ? (
              <Stack align="center" py="md">
                <Loader size="sm" />
              </Stack>
            ) : projects.length === 0 ? (
              <Alert color="yellow">
                {locale === 'he'
                  ? 'אין לך פרויקטים עדיין. צור פרויקט חדש תחילה.'
                  : 'You have no projects yet. Create a project first.'}
              </Alert>
            ) : (
              <Select
                label={locale === 'he' ? 'בחר פרויקט' : 'Select Project'}
                placeholder={locale === 'he' ? 'בחר פרויקט...' : 'Select a project...'}
                data={projects.map((p: any) => ({
                  value: p.id,
                  label: `${p.name}${p.client ? ` (${p.client.name})` : ''}`,
                }))}
                value={selectedProjectId}
                onChange={setSelectedProjectId}
                searchable
                leftSection={<IconFolder size={16} />}
              />
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleCloseModal}>
                {locale === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
              <Button
                onClick={handleUseForProject}
                disabled={!selectedProjectId}
                leftSection={<IconCopy size={16} />}
              >
                {locale === 'he' ? 'העתק לפרויקט' : 'Copy to Project'}
              </Button>
            </Group>
          </>
        )}

        {forkStatus === 'loading' && (
          <Stack align="center" py="xl">
            <Loader size="lg" />
            <Text size="sm" c="dimmed">
              {locale === 'he' ? 'מעתיק סגנון וחדרים...' : 'Copying style and rooms...'}
            </Text>
          </Stack>
        )}

        {forkStatus === 'success' && forkResult && (
          <Stack align="center" py="lg" gap="md">
            <Paper p="md" radius="xl" bg="green.0">
              <IconCheck size={48} color="green" />
            </Paper>
            <Text fw={600} ta="center">
              {locale === 'he' ? 'הסגנון הועתק בהצלחה!' : 'Style copied successfully!'}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {locale === 'he'
                ? `${forkResult.forkedRoomsCount} חדרים נוספו לפרויקט`
                : `${forkResult.forkedRoomsCount} rooms added to the project`}
            </Text>
            <Group>
              <Button variant="subtle" onClick={handleCloseModal}>
                {locale === 'he' ? 'סגור' : 'Close'}
              </Button>
              <Button onClick={handleGoToProjectStyle}>
                {locale === 'he' ? 'עבור לעמוד הסגנון' : 'Go to Style Page'}
              </Button>
            </Group>
          </Stack>
        )}

        {forkStatus === 'error' && (
          <Stack align="center" py="lg" gap="md">
            <Paper p="md" radius="xl" bg="red.0">
              <IconX size={48} color="red" />
            </Paper>
            <Text fw={600} c="red" ta="center">
              {locale === 'he' ? 'שגיאה בהעתקת הסגנון' : 'Error copying style'}
            </Text>
            {forkError && (
              <Text size="sm" c="dimmed" ta="center">
                {forkError}
              </Text>
            )}
            <Group>
              <Button variant="subtle" onClick={handleCloseModal}>
                {locale === 'he' ? 'סגור' : 'Close'}
              </Button>
              <Button onClick={() => setForkStatus('idle')}>
                {locale === 'he' ? 'נסה שנית' : 'Try Again'}
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
