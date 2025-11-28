# MoodB Design System

> A comprehensive design system for the MoodB interior design platform, built on Mantine 7.x with Hebrew RTL-first support.

**Version**: 1.0.0
**Last Updated**: 2024
**Maintained by**: ARIA (Atomic Rules & Interface Advisor)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Core Principles](#core-principles)
3. [Design Tokens](#design-tokens)
4. [RTL/LTR Support](#rtlltr-support)
5. [Component Library](#component-library)
6. [State Patterns](#state-patterns)
7. [Layout Patterns](#layout-patterns)
8. [Form Patterns](#form-patterns)
9. [Icon Management](#icon-management)
10. [Accessibility](#accessibility)
11. [Anti-Patterns](#anti-patterns)
12. [Full Examples](#full-examples)

---

## Quick Reference

### Common Imports

```typescript
// MoodB UI Components (Recommended - Direct imports for performance)
import { MoodBButton } from '@/components/ui/Button'
import { MoodBCard } from '@/components/ui/Card'
import { MoodBInput } from '@/components/ui/Input'
import { MoodBSelect } from '@/components/ui/Select'
import { MoodBTextarea } from '@/components/ui/Textarea'
import { MoodBNumberInput } from '@/components/ui/NumberInput'
import { MoodBCheckbox } from '@/components/ui/Checkbox'
import { MoodBBadge } from '@/components/ui/Badge'
import { MoodBModal } from '@/components/ui/Modal'

// Table Components
import {
  MoodBTable,
  MoodBTableHead,
  MoodBTableBody,
  MoodBTableRow,
  MoodBTableHeader,
  MoodBTableCell
} from '@/components/ui/Table'

// State Components
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// Form Components
import { FormField, FormSection, FormActions } from '@/components/ui/Form'

// Heavy Components (Use lazy loading)
import { LazyImageUpload, LazyRichTextEditor, LazyIconSelector } from '@/components/ui/lazy'

// Mantine Components (when MoodB wrapper not needed)
import {
  Container,
  Stack,
  Group,
  Title,
  Text,
  Divider,
  Alert,
  Menu,
  ActionIcon,
  Pagination,
  Collapse,
  Drawer,
  SimpleGrid,
  Paper,
  Box,
  NavLink,
} from '@mantine/core'

// Icons (Tabler Icons - ALWAYS use from @tabler/icons-react)
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconDots,
  IconEye,
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react'

// Translations
import { useTranslations } from 'next-intl'

// Navigation
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
```

### Import Rules

**CRITICAL**: Always use direct imports instead of barrel imports for performance:

```typescript
// GOOD - Direct import (fast compilation)
import { MoodBButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormSection } from '@/components/ui/Form/FormSection'

// BAD - Barrel import (slow - compiles ALL components including heavy ones)
import { MoodBButton, EmptyState, FormSection } from '@/components/ui'
```

---

## Core Principles

### 1. Hebrew RTL-First

MoodB is designed Hebrew-first with RTL as the default direction. All components must work seamlessly in both RTL and LTR modes.

### 2. Mantine-Based

All UI components are built on Mantine 7.x. Use MoodB wrapper components when available for consistent styling.

### 3. Token-Driven

Never use raw color values, spacing values, or other design values directly. Always use design tokens.

### 4. Performance-First

- Use direct imports, not barrel imports
- Lazy load heavy components (ImageUpload, RichTextEditor, IconSelector)
- Memoize expensive computations with `useMemo`
- Avoid unnecessary re-renders

### 5. Accessibility

All interactive components must be keyboard accessible and have proper ARIA labels.

### 6. Type Safety

All components use TypeScript with strict typing. No `any` types allowed.

---

## Design Tokens

### Brand Colors

```css
:root {
  /* Brand Colors */
  --moodb-background: #f7f7ed;     /* Light cream - App background */
  --moodb-brand: #df2538;          /* MoodB Red - Primary actions */
  --moodb-brand-hover: #c51f2f;    /* Darker red - Hover states */
  --moodb-text: #000000;           /* Black - Primary text */
  --moodb-text-inverse: #ffffff;   /* White - Text on dark backgrounds */
}
```

### Mantine Theme Color Scale

The brand color is available as a Mantine color scale:

```typescript
const brandColors = [
  '#fef4f5', // 0 - Lightest (backgrounds, subtle fills)
  '#fce8ea', // 1
  '#f8d0d4', // 2
  '#f4b8be', // 3
  '#f0a0a8', // 4
  '#df2538', // 5 - Main brand color (buttons, links)
  '#c51f2f', // 6 - Hover state
  '#ab1b28', // 7
  '#911721', // 8
  '#77131a', // 9 - Darkest
]
```

**Usage in components:**

```tsx
<Button color="brand">Primary Action</Button>
<Badge color="brand" variant="light">Badge</Badge>
<Loader color="brand" />
```

### Neutral Colors (Gray Scale)

```typescript
const grayColors = [
  '#fafafa', // 0 - Lightest
  '#f5f5f5', // 1 - Subtle backgrounds
  '#e5e5e5', // 2 - Borders
  '#d4d4d4', // 3
  '#a3a3a3', // 4 - Disabled text
  '#737373', // 5 - Secondary text
  '#525252', // 6 - Dimmed text
  '#404040', // 7
  '#262626', // 8
  '#171717', // 9 - Darkest
]
```

### Semantic Colors

| Purpose | Color | Usage |
|---------|-------|-------|
| Success | `green` | Confirmations, completed states |
| Warning | `yellow` | Caution states, pending actions |
| Error | `red` | Errors, destructive actions |
| Info | `blue` | Information, tips |

### Typography

```typescript
// Font Families
fontFamily: 'var(--font-geist-sans), "Heebo", "Assistant", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
fontFamilyMonospace: 'var(--font-geist-mono), Monaco, "Courier New", monospace'

// Heading Sizes
h1: { fontSize: '2.5rem', lineHeight: '1.2', fontWeight: 600 }
h2: { fontSize: '2rem', lineHeight: '1.3', fontWeight: 600 }
h3: { fontSize: '1.75rem', lineHeight: '1.4', fontWeight: 600 }
h4: { fontSize: '1.5rem', lineHeight: '1.5', fontWeight: 600 }
h5: { fontSize: '1.25rem', lineHeight: '1.6', fontWeight: 600 }
h6: { fontSize: '1rem', lineHeight: '1.6', fontWeight: 600 }
```

### Spacing

```typescript
// Mantine Spacing Scale
xs: '0.5rem'   // 8px
sm: '0.75rem'  // 12px
md: '1rem'     // 16px
lg: '1.5rem'   // 24px
xl: '2rem'     // 32px

// CSS Token Scale (for custom styles)
--moodb-spacing-xs: 0.25rem;   // 4px
--moodb-spacing-sm: 0.5rem;    // 8px
--moodb-spacing-md: 1rem;      // 16px
--moodb-spacing-lg: 1.5rem;    // 24px
--moodb-spacing-xl: 2rem;      // 32px
--moodb-spacing-2xl: 3rem;     // 48px
--moodb-spacing-3xl: 4rem;     // 64px
```

### Border Radius

```typescript
xs: '0.25rem'  // 4px - Small elements
sm: '0.5rem'   // 8px - Buttons, inputs
md: '0.75rem'  // 12px - Cards, modals (default)
lg: '1rem'     // 16px - Large cards
xl: '1.5rem'   // 24px - Hero sections
```

### Shadows

```typescript
xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
```

### Z-Index Scale

```css
--moodb-z-dropdown: 1000;
--moodb-z-sticky: 1020;
--moodb-z-fixed: 1030;
--moodb-z-modal-backdrop: 1040;
--moodb-z-modal: 1050;
--moodb-z-popover: 1060;
--moodb-z-tooltip: 1070;
```

---

## RTL/LTR Support

### MantineProvider Setup

RTL is handled via the MantineProvider wrapper:

```tsx
// src/components/providers/MantineProvider.tsx
export function MantineProvider({ children, locale = 'he' }: MantineProviderProps) {
  const direction = useMemo(() => locale === 'he' ? 'rtl' : 'ltr', [locale])

  return (
    <MantineUIProvider
      theme={moodbTheme}
      defaultColorScheme="light"
    >
      <ModalsProvider>
        <Notifications position={direction === 'rtl' ? 'top-start' : 'top-end'} />
        <div dir={direction}>
          {children}
        </div>
      </ModalsProvider>
    </MantineUIProvider>
  )
}
```

### CSS Rules for RTL

```css
/* Global RTL/LTR Support */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="ltr"] {
  direction: ltr;
  text-align: left;
}

/* Hebrew Font Support */
[dir="rtl"],
[lang="he"] {
  font-family: "Heebo", "Assistant", var(--font-geist-sans), sans-serif;
}
```

### Using Logical Properties

**ALWAYS** use logical CSS properties instead of physical ones:

```css
/* GOOD - Logical Properties (RTL-safe) */
.element {
  margin-inline-start: 1rem;   /* Instead of margin-left */
  margin-inline-end: 1rem;     /* Instead of margin-right */
  padding-inline-start: 1rem;  /* Instead of padding-left */
  padding-inline-end: 1rem;    /* Instead of padding-right */
  border-start-start-radius: 8px; /* Instead of border-top-left-radius */
  text-align: start;           /* Instead of text-align: left */
}

/* BAD - Physical Properties (breaks in RTL) */
.element {
  margin-left: 1rem;
  margin-right: 1rem;
  text-align: left;
}
```

### Handling Lists in RTL

```css
/* RTL-aware list padding */
.editor-list-ol,
.editor-list-ul {
  padding: 0;
  margin: 0;
  margin-left: 16px;
}

[dir="rtl"] .editor-list-ol,
[dir="rtl"] .editor-list-ul {
  margin-left: 0;
  margin-right: 16px;
}
```

### Component-Level RTL Handling

```tsx
// Modal with RTL direction
<Modal
  opened={opened}
  onClose={onClose}
  title={title}
  dir={locale === 'he' ? 'rtl' : 'ltr'}
>
  {content}
</Modal>

// Notifications positioned for RTL
<Notifications position={locale === 'he' ? 'top-start' : 'top-end'} />
```

---

## Component Library

### MoodBButton

A branded button component with semantic variants.

```tsx
interface MoodBButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle'
}

// Usage
<MoodBButton variant="primary">Save</MoodBButton>
<MoodBButton variant="secondary">Cancel</MoodBButton>
<MoodBButton variant="outline">Details</MoodBButton>
<MoodBButton variant="subtle">More Options</MoodBButton>

// With icons
<MoodBButton variant="primary" leftSection={<IconPlus size={16} />}>
  Add Item
</MoodBButton>

// Loading state
<MoodBButton variant="primary" loading={isSubmitting}>
  Saving...
</MoodBButton>
```

| Variant | Color | Mantine Variant | Use Case |
|---------|-------|-----------------|----------|
| `primary` | brand | filled | Primary actions |
| `secondary` | gray | filled | Secondary actions |
| `outline` | brand | outline | Tertiary actions |
| `subtle` | gray | subtle | Ghost actions |

### MoodBCard

A consistent card wrapper with default styling.

```tsx
// Basic usage
<MoodBCard>
  <Stack gap="md">
    <Title order={4}>Card Title</Title>
    <Text>Card content goes here</Text>
  </Stack>
</MoodBCard>

// Default props applied:
// shadow="sm", padding="lg", radius="md", withBorder
```

### MoodBInput

Text input with consistent styling.

```tsx
<MoodBInput
  label="Email"
  placeholder="Enter email address"
  error={errors.email?.message}
  {...register('email')}
/>

// With icon
<MoodBInput
  label="Search"
  placeholder="Search..."
  leftSection={<IconSearch size={16} />}
/>
```

### MoodBSelect

Dropdown select with consistent styling.

```tsx
<MoodBSelect
  label="Category"
  placeholder="Select category"
  data={[
    { value: 'cat1', label: 'Category 1' },
    { value: 'cat2', label: 'Category 2' },
  ]}
  value={selectedValue}
  onChange={setSelectedValue}
  searchable
/>
```

### MoodBTable

Data table with striped rows and hover effects.

```tsx
<MoodBCard>
  <div style={{ overflowX: 'auto' }}>
    <MoodBTable>
      <MoodBTableHead>
        <MoodBTableRow>
          <MoodBTableHeader>Name</MoodBTableHeader>
          <MoodBTableHeader>Status</MoodBTableHeader>
          <MoodBTableHeader style={{ width: 100 }}>Actions</MoodBTableHeader>
        </MoodBTableRow>
      </MoodBTableHead>
      <MoodBTableBody>
        {items.map((item) => (
          <MoodBTableRow key={item.id}>
            <MoodBTableCell>{item.name}</MoodBTableCell>
            <MoodBTableCell>
              <MoodBBadge status="success">Active</MoodBBadge>
            </MoodBTableCell>
            <MoodBTableCell>
              <Menu>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="brand">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEdit size={16} />}>Edit</Menu.Item>
                  <Menu.Item leftSection={<IconTrash size={16} />} color="red">Delete</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </MoodBTableCell>
          </MoodBTableRow>
        ))}
      </MoodBTableBody>
    </MoodBTable>
  </div>
</MoodBCard>
```

### MoodBBadge

Status badge with semantic colors.

```tsx
interface MoodBBadgeProps extends BadgeProps {
  status?: 'success' | 'warning' | 'error' | 'info' | 'default'
}

// Usage
<MoodBBadge status="success">Active</MoodBBadge>
<MoodBBadge status="warning">Pending</MoodBBadge>
<MoodBBadge status="error">Failed</MoodBBadge>
<MoodBBadge status="info">New</MoodBBadge>
<MoodBBadge status="default">Draft</MoodBBadge>

// Custom color
<MoodBBadge color="brand" variant="light">Featured</MoodBBadge>
```

### MoodBModal

Modal dialog with consistent styling.

```tsx
<MoodBModal
  opened={opened}
  onClose={() => setOpened(false)}
  title="Confirm Action"
  centered
>
  <Stack gap="lg">
    <Text>Are you sure you want to proceed?</Text>
    <Group justify="flex-end" gap="sm">
      <Button variant="subtle" onClick={() => setOpened(false)}>
        Cancel
      </Button>
      <Button color="brand" onClick={handleConfirm}>
        Confirm
      </Button>
    </Group>
  </Stack>
</MoodBModal>

// Default overlay props applied:
// backgroundOpacity: 0.55, blur: 3
```

### ConfirmDialog

Pre-built confirmation dialog for destructive actions.

```tsx
<ConfirmDialog
  opened={!!deleteItemId}
  onClose={() => setDeleteItemId(null)}
  onConfirm={handleDelete}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  danger={true}
  loading={isDeleting}
/>
```

---

## State Patterns

### LoadingState

Full-page or section loading indicator.

```tsx
import { LoadingState } from '@/components/ui/LoadingState'

// Basic usage
{isLoading && <LoadingState />}

// With custom message
<LoadingState message="Loading categories..." />
```

**Implementation:**

```tsx
export const LoadingState = ({ message = 'Loading...' }: LoadingStateProps) => {
  return (
    <Box style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <Stack align="center" gap="md">
        <Loader color="brand" size="lg" />
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Box>
  )
}
```

### EmptyState

Display when no data is available.

```tsx
import { EmptyState } from '@/components/ui/EmptyState'

<EmptyState
  title="No categories found"
  description="Create your first category to get started"
  icon={<IconFolder size={48} />}
  action={{
    label: 'Create Category',
    onClick: () => router.push('/admin/categories/new'),
  }}
/>
```

**Implementation:**

```tsx
interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState = ({ title, description, icon, action }: EmptyStateProps) => {
  return (
    <Box style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <Stack align="center" gap="md">
        {icon && <Box style={{ fontSize: '3rem', opacity: 0.5 }}>{icon}</Box>}
        <Text size="lg" fw={600} c="dimmed">
          {title}
        </Text>
        {description && (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        )}
        {action && (
          <Button variant="light" onClick={action.onClick} mt="md">
            {action.label}
          </Button>
        )}
      </Stack>
    </Box>
  )
}
```

### ErrorState

Display when an error occurs.

```tsx
import { ErrorState } from '@/components/ui/ErrorState'

<ErrorState
  title="Something went wrong"
  message="Failed to load categories. Please try again."
  onRetry={() => refetch()}
  retryLabel="Try Again"
/>
```

**Implementation:**

```tsx
export const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again'
}: ErrorStateProps) => {
  return (
    <Box style={{ padding: '2rem 1rem' }}>
      <Stack align="center" gap="md">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title={title}
          color="red"
          variant="light"
          style={{ maxWidth: '500px', width: '100%' }}
        >
          {message}
        </Alert>
        {onRetry && (
          <Button variant="light" onClick={onRetry} mt="md">
            {retryLabel}
          </Button>
        )}
      </Stack>
    </Box>
  )
}
```

### Standard State Pattern

Use this pattern consistently across all pages:

```tsx
// Standard loading/error/empty pattern
{isLoading ? (
  <LoadingState message={t('loading')} />
) : error ? (
  <ErrorState
    message={tCommon('error')}
    onRetry={() => refetch()}
  />
) : !data || data.length === 0 ? (
  <EmptyState
    title={t('noItems')}
    description={t('noItemsDescription')}
    action={{
      label: t('createItem'),
      onClick: () => router.push('/create'),
    }}
  />
) : (
  // Render data
  <DataTable data={data} />
)}
```

---

## Layout Patterns

### Page Layout Structure

Standard admin page structure:

```tsx
export default function AdminPage() {
  const t = useTranslations('admin.section')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>{t('title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push(`/${locale}/admin/section/new`)}
            color="brand"
          >
            {t('create')}
          </Button>
        </Group>

        {/* Filters */}
        <MoodBCard>
          <TextInput
            placeholder={t('searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </MoodBCard>

        {/* Content (with loading/error/empty states) */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={tCommon('error')} />
        ) : !data?.length ? (
          <EmptyState
            title={t('noItems')}
            action={{ label: t('create'), onClick: () => {} }}
          />
        ) : (
          <MoodBCard>
            <MoodBTable>
              {/* Table content */}
            </MoodBTable>
          </MoodBCard>
        )}

        {/* Modals */}
        <ConfirmDialog {...dialogProps} />
      </Stack>
    </Container>
  )
}
```

### AppShell Layout (Admin)

```tsx
<AppShell
  padding="md"
  styles={{
    main: {
      backgroundColor: '#f7f7ed',
      minHeight: '100vh',
    },
  }}
  header={{ height: { base: 60, sm: 0 } }}
  navbar={{
    width: 250,
    breakpoint: 'sm',
    collapsed: { mobile: !mobileNavbarOpened },
  }}
>
  <AppShell.Header hiddenFrom="sm">
    {/* Mobile header */}
  </AppShell.Header>

  <AppShell.Navbar p="md" style={{ backgroundColor: '#ffffff' }}>
    <Stack gap="md">
      {/* Navigation items */}
    </Stack>
  </AppShell.Navbar>

  <AppShell.Main>
    <Container size="xl">{children}</Container>
  </AppShell.Main>
</AppShell>
```

### Navigation Items

```tsx
const navItems = [
  {
    label: t('navigation.dashboard'),
    icon: IconLayoutDashboard,
    href: `/${locale}/admin`,
  },
  {
    label: t('navigation.categories'),
    icon: IconPalette,
    href: `/${locale}/admin/categories`,
  },
  // ...
]

// Render
{navItems.map((item) => {
  const Icon = item.icon
  const active = isActive(item.href)

  return (
    <NavLink
      key={item.href}
      component={Link}
      href={item.href}
      label={item.label}
      leftSection={<Icon size={20} />}
      active={active}
      variant="subtle"
      color="brand"
    />
  )
})}
```

---

## Form Patterns

### Form Structure

```tsx
import { FormSection, FormField, FormActions } from '@/components/ui/Form'

<form onSubmit={handleSubmit(onSubmit)}>
  <Stack gap="lg">
    {/* Section 1: Basic Info */}
    <FormSection title="Basic Information">
      <MoodBInput
        label={t('name')}
        placeholder={t('namePlaceholder')}
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <MoodBTextarea
        label={t('description')}
        placeholder={t('descriptionPlaceholder')}
        error={errors.description?.message}
        {...register('description')}
      />
    </FormSection>

    <Divider />

    {/* Section 2: Settings */}
    <FormSection title="Settings">
      <MoodBSelect
        label={t('category')}
        data={categoryOptions}
        error={errors.categoryId?.message}
        {...register('categoryId')}
      />

      <MoodBNumberInput
        label={t('order')}
        min={0}
        error={errors.order?.message}
        {...register('order')}
      />
    </FormSection>

    {/* Actions */}
    <FormActions
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      onCancel={handleCancel}
      loading={isSubmitting}
    />
  </Stack>
</form>
```

### FormSection Component

```tsx
export const FormSection = ({ title, children }: FormSectionProps) => {
  return (
    <Stack gap="md">
      {title && (
        <>
          <Title order={4} size="h5">
            {title}
          </Title>
          <Divider />
        </>
      )}
      <Stack gap="md">{children}</Stack>
    </Stack>
  )
}
```

### FormField Component

For custom form fields with consistent styling:

```tsx
export const FormField = ({
  label,
  error,
  required,
  description,
  children
}: FormFieldProps) => {
  return (
    <Stack gap="xs">
      {label && (
        <Text size="sm" fw={500}>
          {label}
          {required && <Text component="span" c="red"> *</Text>}
        </Text>
      )}
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      {children}
      {error && (
        <Text size="xs" c="red">
          {error.message}
        </Text>
      )}
    </Stack>
  )
}
```

### FormActions Component

```tsx
export const FormActions = ({
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  onCancel,
  loading = false,
  disabled = false
}: FormActionsProps) => {
  return (
    <Group justify="flex-end" gap="sm" mt="xl">
      {onCancel && (
        <Button variant="subtle" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" loading={loading} disabled={disabled} color="brand">
        {submitLabel}
      </Button>
    </Group>
  )
}
```

### React Hook Form with Zod

```tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createItemSchema, type CreateItemInput } from '@/lib/validations/item'

export function ItemForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: '',
      categoryId: '',
      order: 0,
    },
  })

  const onSubmit = async (data: CreateItemInput) => {
    try {
      await createItem(data)
      reset()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        {/* Simple inputs use register */}
        <MoodBInput
          label="Name"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Complex inputs use Controller */}
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <MoodBSelect
              label="Category"
              data={categories}
              value={field.value}
              onChange={field.onChange}
              error={errors.categoryId?.message}
            />
          )}
        />
      </Stack>
    </form>
  )
}
```

### Drawer Form Pattern

```tsx
<Drawer
  opened={opened}
  onClose={handleClose}
  title={editData ? t('edit') : t('create')}
  position="right"
  size="lg"
  padding="md"
>
  <form onSubmit={handleSubmit(onSubmit)}>
    <Stack gap="lg">
      {/* Form content */}
      <FormSection>
        <MoodBInput {...} />
      </FormSection>

      {/* Actions at bottom */}
      <Group justify="flex-end" mt="xl">
        <Button variant="subtle" onClick={handleClose} disabled={isSubmitting}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {editData ? tCommon('save') : tCommon('create')}
        </Button>
      </Group>
    </Stack>
  </form>
</Drawer>
```

---

## Icon Management

### Icon Library

MoodB uses **Tabler Icons** (`@tabler/icons-react`) for all icons.

### Common Icons

| Purpose | Icon | Import |
|---------|------|--------|
| Add | `IconPlus` | `@tabler/icons-react` |
| Edit | `IconEdit` | `@tabler/icons-react` |
| Delete | `IconTrash` | `@tabler/icons-react` |
| View | `IconEye` | `@tabler/icons-react` |
| Search | `IconSearch` | `@tabler/icons-react` |
| Menu | `IconDots` | `@tabler/icons-react` |
| Close | `IconX` | `@tabler/icons-react` |
| Check | `IconCheck` | `@tabler/icons-react` |
| Alert | `IconAlertCircle` | `@tabler/icons-react` |
| Info | `IconInfoCircle` | `@tabler/icons-react` |
| Home | `IconHome` | `@tabler/icons-react` |
| Settings | `IconSettings` | `@tabler/icons-react` |
| User | `IconUsers` | `@tabler/icons-react` |
| Folder | `IconFolder` | `@tabler/icons-react` |
| Palette | `IconPalette` | `@tabler/icons-react` |
| Box | `IconBox` | `@tabler/icons-react` |

### Icon Sizing Convention

| Context | Size | Usage |
|---------|------|-------|
| Inline/Button | `16` | Inside buttons, menu items |
| Navigation | `20` | Sidebar navigation |
| Feature | `24` | Feature highlights, cards |
| Empty State | `48-52` | Empty state illustrations |

### Usage Examples

```tsx
// In buttons
<Button leftSection={<IconPlus size={16} />}>Add Item</Button>

// In menu items
<Menu.Item leftSection={<IconEdit size={16} />}>Edit</Menu.Item>

// In navigation
<NavLink leftSection={<IconSettings size={20} />} label="Settings" />

// In alerts
<Alert icon={<IconAlertCircle size={16} />}>Warning message</Alert>

// In empty states
<EmptyState icon={<IconFolder size={48} />} title="No items" />
```

### IconSelector Component

For allowing users to select icons:

```tsx
import { IconSelector } from '@/components/ui/IconSelector'

<IconSelector
  value={selectedIcon}
  onChange={setSelectedIcon}
  label="Icon"
  description="Select an icon for this category"
/>
```

### Rules

1. **ALWAYS** import icons from `@tabler/icons-react`
2. **NEVER** use emoji in place of icons
3. **NEVER** import icons directly in components that don't need them
4. Use consistent sizing based on context
5. Match icon color with text/context color

---

## Accessibility

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```tsx
// Focusable elements should have visible focus styles
*:focus-visible {
  outline: 2px solid var(--moodb-brand);
  outline-offset: 2px;
}
```

### ARIA Labels

```tsx
// Buttons with only icons need aria-label
<ActionIcon aria-label="Edit item">
  <IconEdit size={16} />
</ActionIcon>

// Tables need proper structure
<MoodBTable aria-label="Categories list">
  <MoodBTableHead>
    <MoodBTableRow>
      <MoodBTableHeader scope="col">Name</MoodBTableHeader>
    </MoodBTableRow>
  </MoodBTableHead>
</MoodBTable>
```

### Screen Reader Text

```tsx
// Loading states should announce to screen readers
<LoadingState message="Loading categories, please wait..." />

// Error states should be announced
<ErrorState
  role="alert"
  message="Failed to load data"
/>
```

### Form Accessibility

```tsx
// Labels must be associated with inputs
<MoodBInput
  id="email"
  label="Email Address"
  aria-describedby="email-error"
/>
{errors.email && (
  <Text id="email-error" role="alert" c="red" size="xs">
    {errors.email.message}
  </Text>
)}

// Required fields should be marked
<MoodBInput
  label="Name"
  required
  aria-required="true"
/>
```

### Color Contrast

- Text on brand background (#df2538) must be white
- Text on light background (#f7f7ed) must be black
- Maintain WCAG 2.1 AA contrast ratios (4.5:1 for normal text)

---

## Anti-Patterns

### DO NOT: Use Raw Color Values

```tsx
// BAD
<Box style={{ backgroundColor: '#df2538' }}>

// GOOD
<Box bg="brand">
// or
<Box style={{ backgroundColor: 'var(--moodb-brand)' }}>
```

### DO NOT: Use Barrel Imports

```tsx
// BAD - Compiles ALL components
import { MoodBButton, EmptyState } from '@/components/ui'

// GOOD - Direct imports
import { MoodBButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
```

### DO NOT: Use Physical CSS Properties

```tsx
// BAD - Breaks in RTL
<Box style={{ marginLeft: '1rem', paddingRight: '1rem' }}>

// GOOD - Works in both directions
<Box style={{ marginInlineStart: '1rem', paddingInlineEnd: '1rem' }}>
// or use Mantine props
<Box ms="md" pe="md">
```

### DO NOT: Hardcode Translations

```tsx
// BAD
<Button>Save Changes</Button>

// GOOD
const t = useTranslations('common')
<Button>{t('save')}</Button>
```

### DO NOT: Use Inline Styles for Repeated Patterns

```tsx
// BAD - Repeated inline styles
<Box style={{ padding: '3rem 1rem', textAlign: 'center' }}>
<Box style={{ padding: '3rem 1rem', textAlign: 'center' }}>

// GOOD - Use components or CSS classes
<EmptyState title="No items" />
```

### DO NOT: Mix Icon Libraries

```tsx
// BAD - Multiple icon libraries
import { IconPlus } from '@tabler/icons-react'
import { FaPlus } from 'react-icons/fa'
import { Plus } from 'lucide-react'

// GOOD - Single icon library
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react'
```

### DO NOT: Skip Loading/Error/Empty States

```tsx
// BAD - No state handling
{data && <DataTable data={data} />}

// GOOD - Full state handling
{isLoading ? (
  <LoadingState />
) : error ? (
  <ErrorState message={error.message} />
) : !data?.length ? (
  <EmptyState title="No items" />
) : (
  <DataTable data={data} />
)}
```

### DO NOT: Use Any Type

```tsx
// BAD
const handleClick = (item: any) => {}

// GOOD
interface Item {
  id: string
  name: string
}
const handleClick = (item: Item) => {}
```

---

## Full Examples

### Complete Admin List Page

```tsx
/**
 * Admin Items Management Page
 */

'use client'

import { useState } from 'react'
import {
  Container,
  Title,
  Group,
  Stack,
  TextInput,
  ActionIcon,
  Menu,
  Text,
  Button,
  Badge,
} from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import {
  IconPlus,
  IconSearch,
  IconDots,
  IconEdit,
  IconTrash,
  IconEye,
} from '@tabler/icons-react'
import Link from 'next/link'

// Direct imports for performance
import { MoodBButton } from '@/components/ui/Button'
import { MoodBCard } from '@/components/ui/Card'
import {
  MoodBTable,
  MoodBTableHead,
  MoodBTableBody,
  MoodBTableRow,
  MoodBTableHeader,
  MoodBTableCell,
} from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

import { useItems, useDeleteItem } from '@/hooks/useItems'

export default function AdminItemsPage() {
  const t = useTranslations('admin.items')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  // State
  const [search, setSearch] = useState('')
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Data fetching
  const { data, isLoading, error, refetch } = useItems(search)
  const deleteMutation = useDeleteItem()

  // Handlers
  const handleDelete = async () => {
    if (!deleteItemId) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteItemId)
      setDeleteItemId(null)
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>{t('title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push(`/${locale}/admin/items/new`)}
            color="brand"
          >
            {t('createItem')}
          </Button>
        </Group>

        {/* Filters */}
        <MoodBCard>
          <TextInput
            placeholder={t('searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </MoodBCard>

        {/* Content */}
        {isLoading ? (
          <LoadingState message={t('loading')} />
        ) : error ? (
          <ErrorState
            message={tCommon('error')}
            onRetry={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            title={t('noItems')}
            description={t('noItemsDescription')}
            action={{
              label: t('createItem'),
              onClick: () => router.push(`/${locale}/admin/items/new`),
            }}
          />
        ) : (
          <MoodBCard>
            <div style={{ overflowX: 'auto' }}>
              <MoodBTable>
                <MoodBTableHead>
                  <MoodBTableRow>
                    <MoodBTableHeader>{t('table.name')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.status')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.createdAt')}</MoodBTableHeader>
                    <MoodBTableHeader style={{ width: 100 }}>
                      {t('table.actions')}
                    </MoodBTableHeader>
                  </MoodBTableRow>
                </MoodBTableHead>
                <MoodBTableBody>
                  {data.map((item) => (
                    <MoodBTableRow key={item.id}>
                      <MoodBTableCell>
                        <Stack gap={4}>
                          <Text fw={500}>{item.name.he}</Text>
                          <Text size="xs" c="dimmed">
                            {item.name.en}
                          </Text>
                        </Stack>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Badge
                          variant="light"
                          color={item.status === 'active' ? 'green' : 'gray'}
                        >
                          {item.status}
                        </Badge>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm">
                          {new Date(item.createdAt).toLocaleDateString(locale)}
                        </Text>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Menu shadow="md" width={200}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="brand">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEye size={16} />}
                              component={Link}
                              href={`/${locale}/admin/items/${item.id}`}
                            >
                              {tCommon('view')}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconEdit size={16} />}
                              component={Link}
                              href={`/${locale}/admin/items/${item.id}/edit`}
                            >
                              {tCommon('edit')}
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => setDeleteItemId(item.id)}
                            >
                              {tCommon('delete')}
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </MoodBTableCell>
                    </MoodBTableRow>
                  ))}
                </MoodBTableBody>
              </MoodBTable>
            </div>
          </MoodBCard>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          opened={!!deleteItemId}
          onClose={() => setDeleteItemId(null)}
          onConfirm={handleDelete}
          title={t('deleteItem')}
          message={t('deleteItemMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={isDeleting}
          danger={true}
        />
      </Stack>
    </Container>
  )
}
```

### Complete Form Page

```tsx
/**
 * Admin Item Create/Edit Page
 */

'use client'

import { useEffect } from 'react'
import { Container, Title, Stack, Divider } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Direct imports
import { MoodBCard } from '@/components/ui/Card'
import { MoodBInput } from '@/components/ui/Input'
import { MoodBTextarea } from '@/components/ui/Textarea'
import { MoodBSelect } from '@/components/ui/Select'
import { MoodBNumberInput } from '@/components/ui/NumberInput'
import { FormSection, FormActions } from '@/components/ui/Form'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

import { itemSchema, type ItemInput } from '@/lib/validations/item'
import { useItem, useCreateItem, useUpdateItem } from '@/hooks/useItems'
import { useCategories } from '@/hooks/useCategories'

interface ItemFormPageProps {
  itemId?: string
}

export default function ItemFormPage({ itemId }: ItemFormPageProps) {
  const t = useTranslations('admin.items')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  const isEditMode = !!itemId

  // Data fetching
  const { data: item, isLoading: itemLoading, error: itemError } = useItem(itemId)
  const { data: categories } = useCategories()
  const createMutation = useCreateItem()
  const updateMutation = useUpdateItem()

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: { he: '', en: '' },
      description: { he: '', en: '' },
      categoryId: '',
      order: 0,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description,
        categoryId: item.categoryId,
        order: item.order,
      })
    }
  }, [item, reset])

  // Handle submit
  const onSubmit = async (data: ItemInput) => {
    try {
      if (isEditMode && itemId) {
        await updateMutation.mutateAsync({ id: itemId, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      router.push(`/${locale}/admin/items`)
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const handleCancel = () => {
    router.push(`/${locale}/admin/items`)
  }

  // Category options for select
  const categoryOptions = categories?.map((cat) => ({
    value: cat.id,
    label: locale === 'he' ? cat.name.he : cat.name.en,
  })) || []

  // Loading state for edit mode
  if (isEditMode && itemLoading) {
    return (
      <Container size="md" py="xl">
        <LoadingState message={t('loading')} />
      </Container>
    )
  }

  // Error state for edit mode
  if (isEditMode && itemError) {
    return (
      <Container size="md" py="xl">
        <ErrorState message={tCommon('error')} />
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>
          {isEditMode ? t('editItem') : t('createItem')}
        </Title>

        <MoodBCard>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="lg">
              {/* Hebrew Name */}
              <FormSection title={t('sections.hebrewContent')}>
                <MoodBInput
                  label={t('fields.nameHe')}
                  placeholder={t('placeholders.nameHe')}
                  required
                  error={errors.name?.he?.message}
                  {...register('name.he')}
                />
                <MoodBTextarea
                  label={t('fields.descriptionHe')}
                  placeholder={t('placeholders.descriptionHe')}
                  error={errors.description?.he?.message}
                  {...register('description.he')}
                />
              </FormSection>

              <Divider />

              {/* English Name */}
              <FormSection title={t('sections.englishContent')}>
                <MoodBInput
                  label={t('fields.nameEn')}
                  placeholder={t('placeholders.nameEn')}
                  required
                  error={errors.name?.en?.message}
                  {...register('name.en')}
                />
                <MoodBTextarea
                  label={t('fields.descriptionEn')}
                  placeholder={t('placeholders.descriptionEn')}
                  error={errors.description?.en?.message}
                  {...register('description.en')}
                />
              </FormSection>

              <Divider />

              {/* Settings */}
              <FormSection title={t('sections.settings')}>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <MoodBSelect
                      label={t('fields.category')}
                      placeholder={t('placeholders.category')}
                      data={categoryOptions}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.categoryId?.message}
                      searchable
                    />
                  )}
                />

                <Controller
                  name="order"
                  control={control}
                  render={({ field }) => (
                    <MoodBNumberInput
                      label={t('fields.order')}
                      min={0}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.order?.message}
                    />
                  )}
                />
              </FormSection>

              {/* Form Actions */}
              <FormActions
                submitLabel={isEditMode ? tCommon('save') : tCommon('create')}
                cancelLabel={tCommon('cancel')}
                onCancel={handleCancel}
                loading={isSubmitting}
              />
            </Stack>
          </form>
        </MoodBCard>
      </Stack>
    </Container>
  )
}
```

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial design system documentation |

---

## Contributing

When proposing changes to the design system:

1. **Document the change** - Describe what you want to change and why
2. **Classify the impact** - Cosmetic / Additive / Breaking
3. **List affected components** - Which components use this pattern
4. **Propose migration path** - How existing code will be updated
5. **Update this document** - Changes are not complete until documented

Submit changes via PR and request review from the design system maintainer (ARIA).
