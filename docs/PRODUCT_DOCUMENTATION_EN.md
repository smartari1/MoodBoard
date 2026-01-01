# MoodB - Product Documentation

## What is MoodB?

MoodB is a SaaS platform for interior design studios. The system enables designers to manage projects, clients, design styles, materials, and budgets in one place.

---

## Part A: Admin Area (System Management)

### 1. Main Dashboard
- General statistics: Styles, Organizations, Users
- Quick access to all management areas

### 2. Style Management (Style Engine)
**Styles List** - View all global styles
- Filter by: Category, Sub-category, Design Approach, Free search
- Actions: View, Edit, Delete, Bulk delete

**Create/Edit Style** - Comprehensive form including:
- Bilingual name (Hebrew/English)
- Category and sub-category
- Design approach (Authentic, Fusion, Eclectic, etc.)
- Multiple image upload
- Color palette
- Price level (Luxury/Regular)
- Room profiles with images, colors, materials, and tips
- AI-powered texture matching

**Style Approvals** - Screen for approving/rejecting styles submitted by users

### 3. Category Management
**Main Categories**
- Create, edit, delete
- Detailed content (description, characteristics)
- Display order
- Bilingual support

**Sub-Categories**
- Link to parent category
- Associated styles count
- Display order management

### 4. Design System Settings
- **Design Approaches** - Manage design philosophies (Authentic, Fusion, Eclectic)
- **Room Types** - Define room classifications
- **Room Categories** - Hierarchical organization of room types

### 5. Color Management
- Color library with HEX codes and preview
- Categories: Neutral, Accent, Semantic
- Track usage across styles

### 6. Material Management
- Comprehensive material catalog for interior design
- Material details: name, category, supplier, pricing
- Images and technical specifications
- **Supplier Settings** - Manage material supplier information

### 7. Texture Management
- Reusable textures (Wall, Wood, Metal, Fabric, Stone)
- Texture image upload
- Link to design styles
- Usage statistics

### 8. Seed Styles
- Bulk style import
- AI-based style generation

### 9. User Management
- View all users with filtering by name/email/role
- Roles: Admin, Designer Owner, Designer Member, Client, Supplier
- User activity tracking

### 10. Organization Management
- Create and edit organizations
- Settings: name, language, currency, measurement units
- Brand color customization

### 11. Translation Management
- Manage all UI text strings
- Bilingual translation (Hebrew/English)
- Search and filter by key
- Export translations

---

## Part B: User Area (Designer Dashboard)

### 1. Main Dashboard
- Welcome greeting with organization name
- Key metrics: Total Projects, Active Projects, Clients, Total Budget
- Quick access cards: Projects, Clients, Styles, Budget
- Recent projects list

### 2. Project Management
**Projects List**
- Filter by: Search, Status (draft, active, review, approved, completed, archived)
- Display: Name, Client, Status, Room count, Team

**Project Details** - Multi-tab interface:
- **Overview**: Project details, client, status, budget, timeline
- **Rooms**: Room management - add, edit, delete, dimensions, notes
- **Budget**: Budget range and management (in development)
- **Timeline**: Start/end dates, milestones (in development)
- **Team**: Team member management (in development)

### 3. Client Management
**Clients List**
- Filter by: Search, Tags
- Predefined tags: VIP, Budget Conscious, New, Repeat Client, Corporate, Residential

**Client Details** - Multi-tab interface:
- **Basic Info**: Name, email, phone, address
- **Tags**: All assigned tags
- **Projects**: Client's project list
- **Notes**: Notes timeline
- **Preferences**: Special needs and preferences

### 4. Style Library
**Styles List**
- Filter by: Search, Category, Sub-category, Scope (all/global/public/personal)
- Grid display with images
- Scope badges: Global, Public, Personal

**Style Details** - Comprehensive view:
- Composite mood board image
- Metadata: Category, sub-category, price level, design approach
- **Overview Tab**: Description, characteristics, room profiles
- **Rooms Tab**: Room image gallery with filtering
- **Materials & Textures Tab**: Materials with images and textures
- **All Images Tab**: Full gallery with lightbox viewer

**Create New Style** - Create personal/organization style

### 5. Sign In & Sign Up
- System login
- Registration
- Error page

### 6. Onboarding (In Development)
- Initial setup process for new users
- Organization creation
- Preferences setup

---

## Cross-System Features

### Multilingual & RTL
- Full Hebrew (RTL) support as primary language
- English support as secondary language
- Bilingual content for all design entities

### Multi-Tenancy
- Complete separation between organizations
- RBAC-based roles and permissions
- Unique settings per organization

### Image Management
- Multiple image upload
- Cloud storage
- Preview and gallery views

### AI Capabilities
- Automatic texture matching
- AI-based style generation
- AI metadata tracking

---

## Main User Flow Summary

### Typical Designer Flow:
1. Login → Dashboard
2. Create new client
3. Create project and assign to client
4. Add rooms to project
5. Select styles from library or create new style
6. Manage budget and timeline
7. Share with client for approval

### Typical Admin Flow:
1. Login → Admin Dashboard
2. Manage categories and global styles
3. Approve submitted styles
4. Manage materials and textures
5. Manage users and organizations
6. Update translations

---

*This documentation is updated regularly as the product evolves.*
