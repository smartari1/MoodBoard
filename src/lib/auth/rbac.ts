/**
 * Role-Based Access Control (RBAC) System
 * Defines permissions and authorization logic for MoodB
 */

export type UserRole =
  | 'designer_owner'
  | 'designer_member'
  | 'client'
  | 'supplier'
  | 'admin'

export type Permission =
  // Organization permissions
  | 'org:read'
  | 'org:write'
  | 'org:delete'
  | 'org:settings'

  // Project permissions
  | 'project:create'
  | 'project:read'
  | 'project:read:own'
  | 'project:write'
  | 'project:delete'
  | 'project:approve'
  | 'project:comment'

  // Client permissions
  | 'client:create'
  | 'client:read'
  | 'client:write'
  | 'client:delete'

  // Material & Style permissions
  | 'material:read'
  | 'material:read:own'
  | 'material:write'
  | 'material:write:own'
  | 'material:delete'

  | 'style:read'
  | 'style:write'
  | 'style:delete'

  // Budget permissions
  | 'budget:read'
  | 'budget:write'
  | 'budget:approve'

  // Quote permissions
  | 'quote:create'

  // Audit permissions
  | 'audit:read'

/**
 * Permission matrix for each role
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  designer_owner: [
    // Full access to everything
    'org:read',
    'org:write',
    'org:delete',
    'org:settings',
    'project:create',
    'project:read',
    'project:write',
    'project:delete',
    'project:approve',
    'project:comment',
    'client:create',
    'client:read',
    'client:write',
    'client:delete',
    'material:read',
    'material:write',
    'material:delete',
    'style:read',
    'style:write',
    'style:delete',
    'budget:read',
    'budget:write',
    'budget:approve',
    'quote:create',
    'audit:read',
  ],

  designer_member: [
    'org:read',
    'project:create',
    'project:read',
    'project:write',
    'project:comment',
    'client:create',
    'client:read',
    'client:write',
    'material:read',
    'material:write',
    'style:read',
    'style:write',
    'budget:read',
    'budget:write',
  ],

  client: [
    'project:read:own',
    'project:comment',
    'project:approve',
    'budget:read',
    'material:read',
    'style:read',
  ],

  supplier: [
    'material:read:own',
    'material:write:own',
    'quote:create',
  ],

  admin: [
    // Admin has all permissions
    'org:read',
    'org:write',
    'org:delete',
    'org:settings',
    'project:create',
    'project:read',
    'project:write',
    'project:delete',
    'project:approve',
    'project:comment',
    'client:create',
    'client:read',
    'client:write',
    'client:delete',
    'material:read',
    'material:write',
    'material:delete',
    'style:read',
    'style:write',
    'style:delete',
    'budget:read',
    'budget:write',
    'budget:approve',
    'quote:create',
    'audit:read',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if user is organization owner
 */
export function isOrganizationOwner(role: UserRole): boolean {
  return role === 'designer_owner' || role === 'admin'
}

/**
 * Check if user is a designer (any type)
 */
export function isDesigner(role: UserRole): boolean {
  return role === 'designer_owner' || role === 'designer_member'
}

/**
 * Check if user can manage organization settings
 */
export function canManageOrganization(role: UserRole): boolean {
  return hasPermission(role, 'org:settings')
}
