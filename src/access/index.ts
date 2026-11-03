import type { Access, FieldAccess } from 'payload'

export type Role = 'admin' | 'editor' | 'ops'

const hasRole =
  (roles: Role[]) =>
  ({ req: { user } }: { req: { user?: unknown } }): boolean => {
    const u = user as { collection?: string; role?: Role } | null | undefined
    return !!u && u.collection === 'users' && !!u.role && roles.includes(u.role)
  }

export const isAdmin: Access & FieldAccess = hasRole(['admin'])
export const isAdminOrEditor: Access & FieldAccess = hasRole(['admin', 'editor'])
export const isAdminOrOps: Access & FieldAccess = hasRole(['admin', 'ops'])
export const isStaff: Access & FieldAccess = hasRole(['admin', 'editor', 'ops'])

/** Publik hanya melihat yang terbit; staf melihat semua termasuk draft. */
export const publishedOrStaff: Access = (args) =>
  isStaff(args) ? true : { _status: { equals: 'published' } }
