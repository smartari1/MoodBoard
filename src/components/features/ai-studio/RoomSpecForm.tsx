'use client'

import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  IconDoor,
  IconDimensions,
  IconWindow,
  IconArmchair,
  IconFlame,
  IconPlus,
  IconX,
} from '@tabler/icons-react'
import { usePathname } from 'next/navigation'

import { useRoomTypes } from '@/hooks/useRoomTypes'
import { useAIStudio, type FurnitureZone } from '@/hooks/useAIStudio'

// Window position options
const WINDOW_POSITIONS = [
  { value: 'north', label: { he: 'צפון', en: 'North' } },
  { value: 'south', label: { he: 'דרום', en: 'South' } },
  { value: 'east', label: { he: 'מזרח', en: 'East' } },
  { value: 'west', label: { he: 'מערב', en: 'West' } },
  { value: 'multiple', label: { he: 'מרובה', en: 'Multiple' } },
]

const WINDOW_SIZES = [
  { value: 'small', label: { he: 'קטן', en: 'Small' } },
  { value: 'medium', label: { he: 'בינוני', en: 'Medium' } },
  { value: 'large', label: { he: 'גדול', en: 'Large' } },
  { value: 'floor-to-ceiling', label: { he: 'מרצפה לתקרה', en: 'Floor to Ceiling' } },
]

// Furniture zone types
const FURNITURE_TYPES = [
  { value: 'seating', label: { he: 'ישיבה', en: 'Seating' }, icon: IconArmchair },
  { value: 'dining', label: { he: 'אוכל', en: 'Dining' }, icon: IconArmchair },
  { value: 'sleeping', label: { he: 'שינה', en: 'Sleeping' }, icon: IconArmchair },
  { value: 'work', label: { he: 'עבודה', en: 'Work' }, icon: IconArmchair },
  { value: 'storage', label: { he: 'אחסון', en: 'Storage' }, icon: IconArmchair },
]

const FURNITURE_POSITIONS = [
  { value: 'center', label: { he: 'מרכז', en: 'Center' } },
  { value: 'corner', label: { he: 'פינה', en: 'Corner' } },
  { value: 'wall', label: { he: 'קיר', en: 'Wall' } },
  { value: 'window', label: { he: 'ליד חלון', en: 'By Window' } },
]

// Special features
const SPECIAL_FEATURES = [
  { value: 'fireplace', label: { he: 'אח', en: 'Fireplace' }, icon: IconFlame },
  { value: 'built-in-shelves', label: { he: 'מדפים מובנים', en: 'Built-in Shelves' }, icon: IconArmchair },
  { value: 'island', label: { he: 'אי', en: 'Island' }, icon: IconArmchair },
  { value: 'balcony-access', label: { he: 'גישה למרפסת', en: 'Balcony Access' }, icon: IconDoor },
]

/**
 * RoomSpecForm - Form for specifying room details
 */
export function RoomSpecForm() {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'

  const {
    input,
    setRoomType,
    setDimensions,
    setWindows,
    addFurnitureZone,
    removeFurnitureZone,
    toggleSpecialFeature,
  } = useAIStudio()

  const { roomSpec } = input

  // Fetch room types
  const { data: roomTypesData, isLoading: roomTypesLoading } = useRoomTypes()
  const roomTypes = roomTypesData?.data || []

  // Room type select data
  const roomTypeSelectData = roomTypes.map((rt: any) => ({
    value: rt.id,
    label: rt.name?.[locale] || rt.name?.he || rt.name,
  }))

  // Handle room type change
  const handleRoomTypeChange = (value: string | null) => {
    if (value) {
      const roomType = roomTypes.find((rt: any) => rt.id === value)
      if (roomType) {
        setRoomType(value, roomType.name)
      }
    }
  }

  // Handle add furniture zone
  const handleAddFurnitureZone = () => {
    addFurnitureZone({
      type: 'seating',
      position: 'center',
    })
  }

  return (
    <Accordion
      variant="separated"
      radius="md"
      defaultValue={['room-type', 'dimensions']}
      multiple
    >
      {/* Room Type */}
      <Accordion.Item value="room-type">
        <Accordion.Control icon={<IconDoor size={20} />}>
          <Group gap="xs">
            <Text fw={600}>סוג החדר</Text>
            {roomSpec.roomTypeName && (
              <Badge size="sm" variant="light" color="violet">
                {roomSpec.roomTypeName[locale]}
              </Badge>
            )}
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Select
            placeholder="בחר סוג חדר"
            data={roomTypeSelectData}
            value={roomSpec.roomTypeId}
            onChange={handleRoomTypeChange}
            searchable
            clearable
            rightSection={roomTypesLoading ? <Loader size="xs" /> : undefined}
          />
        </Accordion.Panel>
      </Accordion.Item>

      {/* Dimensions */}
      <Accordion.Item value="dimensions">
        <Accordion.Control icon={<IconDimensions size={20} />}>
          <Group gap="xs">
            <Text fw={600}>מידות החדר</Text>
            <Badge size="sm" variant="light" color="gray">
              {roomSpec.dimensions.width}x{roomSpec.dimensions.length}x{roomSpec.dimensions.height} מ'
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <SimpleGrid cols={3} spacing="md">
            <NumberInput
              label="רוחב (מ')"
              value={roomSpec.dimensions.width}
              onChange={(val) => setDimensions({ width: Number(val) || 0 })}
              min={1}
              max={20}
              step={0.1}
              decimalScale={1}
            />
            <NumberInput
              label="אורך (מ')"
              value={roomSpec.dimensions.length}
              onChange={(val) => setDimensions({ length: Number(val) || 0 })}
              min={1}
              max={20}
              step={0.1}
              decimalScale={1}
            />
            <NumberInput
              label="גובה (מ')"
              value={roomSpec.dimensions.height}
              onChange={(val) => setDimensions({ height: Number(val) || 0 })}
              min={2}
              max={5}
              step={0.1}
              decimalScale={1}
            />
          </SimpleGrid>
        </Accordion.Panel>
      </Accordion.Item>

      {/* Windows */}
      <Accordion.Item value="windows">
        <Accordion.Control icon={<IconWindow size={20} />}>
          <Group gap="xs">
            <Text fw={600}>חלונות</Text>
            <Badge size="sm" variant="light" color="blue">
              {roomSpec.windows.count} חלונות
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <SimpleGrid cols={3} spacing="md">
            <NumberInput
              label="מספר חלונות"
              value={roomSpec.windows.count}
              onChange={(val) => setWindows({ count: Number(val) || 0 })}
              min={0}
              max={10}
            />
            <Select
              label="כיוון"
              value={roomSpec.windows.position}
              onChange={(val) =>
                setWindows({
                  position: val as 'north' | 'south' | 'east' | 'west' | 'multiple',
                })
              }
              data={WINDOW_POSITIONS.map((p) => ({
                value: p.value,
                label: p.label[locale],
              }))}
            />
            <Select
              label="גודל"
              value={roomSpec.windows.size}
              onChange={(val) =>
                setWindows({
                  size: val as 'small' | 'medium' | 'large' | 'floor-to-ceiling',
                })
              }
              data={WINDOW_SIZES.map((s) => ({
                value: s.value,
                label: s.label[locale],
              }))}
            />
          </SimpleGrid>
        </Accordion.Panel>
      </Accordion.Item>

      {/* Furniture Zones */}
      <Accordion.Item value="furniture">
        <Accordion.Control icon={<IconArmchair size={20} />}>
          <Group gap="xs">
            <Text fw={600}>אזורי ריהוט</Text>
            <Badge size="sm" variant="light" color="green">
              {roomSpec.furnitureZones.length} אזורים
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            {/* Existing Zones */}
            {roomSpec.furnitureZones.map((zone) => (
              <Paper key={zone.id} p="sm" radius="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <SimpleGrid cols={2} spacing="sm" style={{ flex: 1 }}>
                    <Select
                      size="sm"
                      placeholder="סוג"
                      value={zone.type}
                      data={FURNITURE_TYPES.map((f) => ({
                        value: f.value,
                        label: f.label[locale],
                      }))}
                      readOnly
                    />
                    <Select
                      size="sm"
                      placeholder="מיקום"
                      value={zone.position}
                      data={FURNITURE_POSITIONS.map((p) => ({
                        value: p.value,
                        label: p.label[locale],
                      }))}
                      readOnly
                    />
                  </SimpleGrid>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => removeFurnitureZone(zone.id)}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}

            {/* Add Zone Button */}
            <Button
              variant="light"
              color="green"
              leftSection={<IconPlus size={16} />}
              onClick={handleAddFurnitureZone}
              disabled={roomSpec.furnitureZones.length >= 5}
            >
              הוסף אזור ריהוט
            </Button>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      {/* Special Features */}
      <Accordion.Item value="features">
        <Accordion.Control icon={<IconFlame size={20} />}>
          <Group gap="xs">
            <Text fw={600}>תכונות מיוחדות</Text>
            {roomSpec.specialFeatures.length > 0 && (
              <Badge size="sm" variant="light" color="pink">
                {roomSpec.specialFeatures.length}
              </Badge>
            )}
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <SimpleGrid cols={2} spacing="sm">
            {SPECIAL_FEATURES.map((feature) => (
              <Checkbox
                key={feature.value}
                label={feature.label[locale]}
                checked={roomSpec.specialFeatures.includes(feature.value)}
                onChange={() => toggleSpecialFeature(feature.value)}
              />
            ))}
          </SimpleGrid>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
