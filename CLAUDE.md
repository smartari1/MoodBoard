# Claude Development Standards for MoodB

## Project Overview
MoodB is a comprehensive SaaS platform for interior design studios, featuring multi-tenancy, RTL support, advanced style engine, budget management, and client collaboration tools.

USE HEBREW RTL as first language

alwys prioretise reuse of exsting compoents structure and manage a clear lib of pages or components structure that we can reuse.

## 🆘 When You're Stuck

**IMPORTANT**: If you've tried solving a problem 3 times without success:

1. **STOP** - Don't keep trying random solutions
2. **CHECK** - Read `docs/TROUBLESHOOTING.md` for similar issues and debugging strategies
3. **DOCUMENT** - Write down what you've tried and what happened
4. **ASK** - Present your documented attempts when asking for help

The troubleshooting guide contains:
- Real-world debugging case studies with complete thought processes
- Common pitfalls and their solutions
- Effective debugging strategies
- Tools and commands for investigation
- The 3-iteration rule and when to escalate

**Location**: `docs/TROUBLESHOOTING.md`

### Brand Identity
**MoodB Brand Colors:**
- **Primary Background**: `#f7f7ed` (Light cream/beige)
- **Brand Color**: `#df2538` (MoodB Red - used for logos, titles, primary CTAs)
- **Text Primary**: `#000000` (Black - body text, secondary buttons)
- **Text Inverse**: `#ffffff` (White - text on dark backgrounds)

## Core Principles

### 1. Code Quality Standards

#### TypeScript First
- **ALWAYS** use TypeScript with strict mode enabled
- **NEVER** use `any` type - use `unknown` or proper typing
- **ALWAYS** define interfaces for all data structures
- **PREFER** type inference where obvious, explicit types where helpful

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  role: UserRole
}

const processUser = (user: User): ProcessedUser => {
  // Implementation
}

// ❌ Bad
const processUser = (user: any) => {
  // Implementation
}
```

#### Functional Programming Patterns
- **PREFER** immutability over mutation
- **USE** pure functions where possible
- **AVOID** side effects in business logic
- **USE** composition over inheritance

```typescript
// ✅ Good
const updateProject = (project: Project, updates: Partial<Project>): Project => ({
  ...project,
  ...updates,
  updatedAt: new Date()
})

// ❌ Bad
const updateProject = (project: Project, updates: Partial<Project>) => {
  project.name = updates.name
  project.updatedAt = new Date()
  return project
}
```

### 2. Architecture Standards

#### API Design
- **ALWAYS** validate input with Zod schemas
- **ALWAYS** handle errors explicitly
- **ALWAYS** implement proper RBAC checks
- **ALWAYS** audit sensitive operations
- **NEVER** expose internal IDs or sensitive data

```typescript
// ✅ Good API Route
export async function POST(req: Request) {
  try {
    // 1. Authentication
    const { userId, organizationId } = await authenticate(req)
    
    // 2. Validation
    const body = await req.json()
    const validatedData = createProjectSchema.parse(body)
    
    // 3. Authorization
    await authorize(userId, 'project:create', organizationId)
    
    // 4. Business Logic
    const project = await createProject({
      ...validatedData,
      organizationId,
      createdBy: userId
    })
    
    // 5. Audit
    await auditLog({
      action: 'project.created',
      userId,
      organizationId,
      projectId: project.id
    })
    
    // 6. Response
    return NextResponse.json(project, { status: 201 })
    
  } catch (error) {
    return handleError(error)
  }
}
```

#### Database Access
- **ALWAYS** use Prisma for type-safe database access
- **ALWAYS** scope queries by organizationId
- **NEVER** expose database errors to clients
- **USE** transactions for multi-step operations

```typescript
// ✅ Good
const getProjects = async (organizationId: string, userId: string) => {
  return await prisma.project.findMany({
    where: {
      organizationId,
      OR: [
        { createdBy: userId },
        { team: { some: { userId } } }
      ]
    },
    include: {
      client: true,
      rooms: true
    }
  })
}
```

### 3. Frontend Standards

#### Brand Color Implementation
Always use the MoodB brand colors consistently:

```typescript
// ✅ Good - Using brand colors
const theme = {
  colors: {
    background: '#f7f7ed',
    brand: '#df2538',
    text: '#000000',
    textInverse: '#ffffff',
    // Semantic colors based on brand
    primary: '#df2538',
    primaryHover: '#c51f2f',
    secondary: '#000000',
    secondaryHover: '#333333',
  }
}

// Component usage
const Button = styled.button`
  background-color: ${props => props.primary ? '#df2538' : '#000000'};
  color: #ffffff;
  
  &:hover {
    background-color: ${props => props.primary ? '#c51f2f' : '#333333'};
  }
`

// Mantine theme override
const mantineTheme = {
  colors: {
    brand: [
      '#fef4f5',
      '#fce8ea',
      '#f8d0d4',
      '#f4b8be',
      '#df2538',  // Main brand color at index 5
      '#c51f2f',
      '#ab1b28',
      '#911721',
      '#77131a',
      '#5d0f14',
    ],
  },
  primaryColor: 'brand',
  defaultGradient: {
    from: '#df2538',
    to: '#c51f2f',
  },
}
```

#### Component Structure
- **USE** functional components with hooks
- **ORGANIZE** components by feature, not by type
- **IMPLEMENT** proper loading and error states
- **ENSURE** accessibility (ARIA labels, keyboard navigation)

```typescript
// ✅ Good Component Structure
interface ProjectCardProps {
  project: Project
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onEdit, 
  onDelete 
}) => {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)
  
  if (isDeleting) {
    return <ProjectCardSkeleton />
  }
  
  return (
    <Card>
      <CardHeader>
        <Title>{project.name}</Title>
      </CardHeader>
      {/* Rest of component */}
    </Card>
  )
}
```

#### State Management
- **USE** TanStack Query for server state
- **USE** Zustand for client state
- **AVOID** prop drilling - use context or state management
- **SEPARATE** UI state from business logic

```typescript
// ✅ Good State Management
// Server State (TanStack Query)
export const useProject = (projectId: string) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    staleTime: 5 * 60 * 1000,
  })
}

// Client State (Zustand)
export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  selectedRoom: null,
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  selectRoom: (roomId) => set({ selectedRoom: roomId })
}))
```

#### Image Upload Pattern (CRITICAL - Standard Pattern)
The MoodB codebase uses a consistent image upload pattern across all entities (Styles, Sub-Categories, etc.). **ALWAYS** follow this pattern:

**Standard Pattern:**
- **Edit Mode** (entity exists): Pass `entityId` to ImageUpload → Images upload immediately → Trust URLs (don't filter)
- **Create Mode** (entity doesn't exist): No `entityId` → Track pending files → Filter blob URLs → Upload after creation

```typescript
// ✅ Good - Edit Mode Image Upload
<Controller
  name="images"
  control={control}
  render={({ field }) => (
    <ImageUpload
      value={field.value || []}
      onChange={(images) => {
        field.onChange(images)
        setValue('images', images)
      }}
      entityType="style"
      entityId={mode === 'edit' ? initialData?.id : ''} // Critical: entityId triggers immediate upload
      maxImages={20}
      multiple
    />
  )}
/>

// ✅ Good - Form Submission (Edit Mode)
const onSubmit = async (data: UpdateStyle) => {
  // In edit mode, ImageUpload already uploaded images, so pass as-is
  // DON'T filter blob URLs - ImageUpload replaced them with R2 URLs
  await updateMutation.mutateAsync({ 
    id: styleId, 
    data: {
      ...data,
      images: data.images || [], // Trust ImageUpload - no filtering needed
    }
  })
}

// ✅ Good - Form Submission (Create Mode)
const onSubmit = async (data: CreateStyle) => {
  // In create mode, filter blob URLs (they'll be uploaded after creation)
  const cleanedData = {
    ...data,
    images: (data.images || []).filter((url) => {
      if (typeof url !== 'string') return false
      if (url.startsWith('blob:')) return false // Filter blob URLs
      return url.startsWith('http://') || url.startsWith('https://')
    }),
  }
  
  const result = await createMutation.mutateAsync(cleanedData)
  
  // Upload pending files after creation
  if (pendingFiles.length > 0 && result.id) {
    const uploadedUrls = await Promise.all(
      pendingFiles.map(file => uploadImage({ file, entityType: 'style', entityId: result.id }))
    )
    await updateMutation.mutateAsync({ 
      id: result.id, 
      data: { images: uploadedUrls } 
    })
  }
}
```

**Key Principles:**
1. **When `entityId` is provided**: ImageUpload handles uploads automatically - trust it, don't filter
2. **When `entityId` is empty**: Track pending files, filter blob URLs on submit, upload after creation
3. **Never filter blob URLs in edit mode** - ImageUpload already replaced them with R2 URLs
4. **Always filter blob URLs in create mode** - They're temporary preview URLs
5. **Reference Implementation**: See `src/app/[locale]/admin/sub-categories/[id]/edit/page.tsx` for the working pattern

### 4. RTL & Internationalization

#### RTL Support
- **ALWAYS** use logical CSS properties
- **ALWAYS** test both RTL and LTR layouts
- **USE** Mantine's RTL support
- **AVOID** directional assumptions in code

```css
/* ✅ Good - Logical Properties */
.container {
  margin-inline-start: 1rem;
  padding-inline-end: 2rem;
  border-start-start-radius: 8px;
}

/* ❌ Bad - Physical Properties */
.container {
  margin-left: 1rem;
  padding-right: 2rem;
  border-top-left-radius: 8px;
}
```

#### Internationalization
- **ALWAYS** use translation keys, never hardcode text
- **ORGANIZE** translations by feature
- **SUPPORT** Hebrew as primary, English as secondary
- **FORMAT** dates, numbers, and currencies properly

```typescript
// ✅ Good
const ProjectStatus = () => {
  const { t, locale } = useTranslation()
  const formattedDate = new Intl.DateTimeFormat(locale).format(date)
  
  return <Text>{t('project.status.updated', { date: formattedDate })}</Text>
}

// ❌ Bad
const ProjectStatus = () => {
  return <Text>Updated on {date.toLocaleDateString()}</Text>
}
```

### 5. Security Standards

#### Authentication & Authorization
- **ALWAYS** verify authentication on server
- **ALWAYS** check permissions before operations
- **NEVER** trust client-side data
- **IMPLEMENT** rate limiting on all endpoints

```typescript
// ✅ Good Security Check
export const protectedAction = async (
  userId: string,
  organizationId: string,
  resourceId: string
) => {
  // Verify ownership
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      organizationId
    }
  })
  
  if (!resource) {
    throw new NotFoundError()
  }
  
  // Check permissions
  const hasPermission = await checkPermission(
    userId,
    'resource:edit',
    organizationId
  )
  
  if (!hasPermission) {
    throw new ForbiddenError()
  }
  
  // Proceed with action
}
```

#### Data Protection
- **ENCRYPT** sensitive data at rest
- **SANITIZE** all user inputs
- **VALIDATE** file uploads
- **IMPLEMENT** CSRF protection

### 6. Performance Standards

#### Frontend Performance
- **IMPLEMENT** code splitting
- **USE** lazy loading for images
- **OPTIMIZE** bundle size
- **MINIMIZE** re-renders

```typescript
// ✅ Good Performance Patterns
// Memoization
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(
    () => processData(data),
    [data]
  )
  
  return <div>{/* Render */}</div>
})

// Dynamic imports
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
)
```

#### Backend Performance
- **USE** database indexes effectively
- **IMPLEMENT** caching strategies
- **PAGINATE** large datasets
- **OPTIMIZE** database queries

```typescript
// ✅ Good Query Optimization
const getProjectsWithBudget = async (organizationId: string) => {
  return await prisma.$queryRaw`
    SELECT 
      p.*,
      COALESCE(SUM(bl.total), 0) as totalBudget
    FROM projects p
    LEFT JOIN budget_lines bl ON bl.projectId = p.id
    WHERE p.organizationId = ${organizationId}
    GROUP BY p.id
    LIMIT 50
  `
}
```

### 7. Testing Standards

#### Test Coverage Requirements
- **MINIMUM** 80% code coverage
- **CRITICAL** paths must have 100% coverage
- **TEST** error scenarios
- **TEST** edge cases

```typescript
// ✅ Good Test Structure
describe('ProjectService', () => {
  describe('createProject', () => {
    it('should create project with valid data', async () => {
      const result = await createProject(validData)
      expect(result).toMatchObject({
        name: validData.name,
        status: 'draft'
      })
    })
    
    it('should throw on invalid budget', async () => {
      const invalidData = { ...validData, budget: -100 }
      await expect(createProject(invalidData))
        .rejects
        .toThrow(ValidationError)
    })
    
    it('should enforce organization scope', async () => {
      const otherOrgData = { 
        ...validData, 
        organizationId: 'other' 
      }
      await expect(createProject(otherOrgData))
        .rejects
        .toThrow(ForbiddenError)
    })
  })
})
```

### 8. Image Upload Standards

#### ImageUpload Component Usage
- **ALWAYS** use the standard ImageUpload pattern for consistency
- **EDIT MODE**: Provide `entityId` → ImageUpload uploads immediately → Pass URLs as-is to API
- **CREATE MODE**: No `entityId` → Track pending files → Filter blob URLs → Upload after creation
- **NEVER** filter blob URLs in edit mode - ImageUpload already handles uploads
- **ALWAYS** filter blob URLs in create mode before API submission

**Reference Implementations:**
- Working example: `src/app/[locale]/admin/sub-categories/[id]/edit/page.tsx`
- Styles implementation: `src/components/features/style-engine/StyleForm.tsx`

### 9. Error Handling

#### Error Management
- **ALWAYS** use try-catch in async functions
- **PROVIDE** meaningful error messages
- **LOG** errors with context
- **NEVER** expose internal errors to users

```typescript
// ✅ Good Error Handling
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true
  ) {
    super(message)
  }
}

export const handleError = (error: unknown): Response => {
  // Log error
  logger.error(error)
  
  // Handle known errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code 
      },
      { status: error.statusCode }
    )
  }
  
  // Handle validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: error.errors 
      },
      { status: 400 }
    )
  }
  
  // Generic error
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### 10. Git & Development Workflow

#### Commit Standards
```bash
# Format: <type>(<scope>): <subject>

feat(style-engine): add palette comparison feature
fix(budget): correct tax calculation for materials
docs(api): update project endpoints documentation
test(auth): add RBAC integration tests
refactor(db): optimize material search query
style(ui): update button hover states
perf(images): implement lazy loading
chore(deps): update dependencies
```

#### Branch Naming
```bash
feature/MOOD-123-style-engine
bugfix/MOOD-456-rtl-layout
hotfix/MOOD-789-security-patch
release/v1.2.0
```

#### Pull Request Standards
- **INCLUDE** issue number in PR title
- **PROVIDE** clear description of changes
- **ADD** screenshots for UI changes
- **ENSURE** all tests pass
- **REQUEST** review from relevant team members

### 11. Documentation Standards

#### Code Documentation
```typescript
/**
 * Calculates the total budget for a project including materials and labor
 * 
 * @param projectId - The unique identifier of the project
 * @param options - Calculation options
 * @returns Promise resolving to the calculated budget
 * 
 * @example
 * const budget = await calculateProjectBudget('proj_123', {
 *   includeTax: true,
 *   currency: 'ILS'
 * })
 */
export async function calculateProjectBudget(
  projectId: string,
  options: BudgetOptions = {}
): Promise<Budget> {
  // Implementation
}
```

#### README Structure
- Project overview
- Quick start guide
- Architecture overview
- Development setup
- Testing instructions
- Deployment guide
- Contributing guidelines

## File Structure Standards

```
src/
├── app/                    # Next.js app directory
│   ├── [locale]/          # Internationalization
│   │   ├── (auth)/       # Auth group
│   │   ├── (dashboard)/  # Dashboard group
│   │   └── (public)/     # Public pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and helpers
│   ├── api/             # API clients
│   ├── db/              # Database utilities
│   ├── auth/            # Auth utilities
│   └── utils/           # General utilities
├── schemas/             # Zod schemas
├── styles/              # Global styles
│   ├── globals.css      # Global CSS with brand colors
│   ├── theme.ts         # MoodB theme configuration
│   └── tokens.css       # Design tokens (#f7f7ed, #df2538, etc.)
├── types/               # TypeScript types
└── tests/               # Test files
```

## Development Checklist

Before committing code, ensure:

- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] All tests pass
- [ ] Code coverage meets requirements
- [ ] RTL layout works correctly
- [ ] Translations are added for new text
- [ ] Accessibility requirements are met
- [ ] Security best practices are followed
- [ ] Performance impact is considered
- [ ] Documentation is updated

## Performance Budgets

- **Initial Page Load**: < 2s
- **API Response Time**: < 200ms (p95)
- **Time to Interactive**: < 3s
- **First Contentful Paint**: < 1s
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size**: < 250KB (gzipped)

## Monitoring & Alerts

Critical metrics to monitor:
- API error rate > 1%
- Response time > 500ms
- Database connection pool exhaustion
- Memory usage > 80%
- Failed authentication attempts
- Budget calculation errors
- File upload failures

## Contact & Support

For questions about these standards:
- Review existing code for examples
- Check project documentation
- Consult team lead for clarification
- Propose improvements via PR

## Version

These standards are version 1.0.0 and will be updated as the project evolves.
