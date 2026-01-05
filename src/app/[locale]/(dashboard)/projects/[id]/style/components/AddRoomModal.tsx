'use client'

import { useState } from 'react'
import {
  Modal,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  Select,
  Textarea,
  Button,
  NumberInput,
} from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

interface RoomType {
  id: string
  name: { he: string; en: string }
  slug: string
}

interface AddRoomModalProps {
  opened: boolean
  onClose: () => void
  onAdd: (data: {
    roomType: string
    roomTypeId?: string
    name?: string
    customPrompt?: string
  }) => void | Promise<void>
  isLoading?: boolean
}

async function fetchRoomTypes(): Promise<{ data: RoomType[] }> {
  const response = await fetch('/api/admin/room-types?limit=50')
  if (!response.ok) throw new Error('Failed to fetch room types')
  return response.json()
}

export function AddRoomModal({
  opened,
  onClose,
  onAdd,
  isLoading,
}: AddRoomModalProps) {
  const t = useTranslations('projectStyle')
  const params = useParams()
  const locale = params.locale as string

  const [roomTypeId, setRoomTypeId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  // Fetch room types
  const { data: roomTypesData } = useQuery({
    queryKey: ['room-types'],
    queryFn: fetchRoomTypes,
    enabled: opened,
  })

  const roomTypes = roomTypesData?.data || []

  const getName = (nameObj: { he: string; en: string }) =>
    locale === 'he' ? nameObj.he : nameObj.en

  const handleSubmit = async () => {
    const selectedRoomType = roomTypes.find((rt) => rt.id === roomTypeId)
    if (!selectedRoomType) return

    await onAdd({
      roomType: selectedRoomType.slug,
      roomTypeId: selectedRoomType.id,
      name: name || undefined,
      customPrompt: customPrompt || undefined,
    })

    // Reset form
    setRoomTypeId(null)
    setName('')
    setCustomPrompt('')
  }

  const handleClose = () => {
    setRoomTypeId(null)
    setName('')
    setCustomPrompt('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3}>{t('addRoom.title')}</Title>}
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Room Type */}
        <Select
          label={t('addRoom.roomType')}
          placeholder={t('addRoom.roomTypePlaceholder')}
          data={roomTypes.map((rt) => ({
            value: rt.id,
            label: getName(rt.name),
          }))}
          value={roomTypeId}
          onChange={setRoomTypeId}
          searchable
          required
        />

        {/* Custom Name */}
        <TextInput
          label={t('addRoom.name')}
          placeholder={t('addRoom.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Custom Prompt */}
        <Textarea
          label={t('addRoom.customPrompt')}
          placeholder={t('addRoom.customPromptPlaceholder')}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
        />

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            {t('addRoom.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!roomTypeId}
            loading={isLoading}
          >
            {t('addRoom.add')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
