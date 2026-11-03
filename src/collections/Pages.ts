import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { slugField } from '../fields/common'
import { triggerRebuild, triggerRebuildOnDelete } from '../hooks/triggerRebuild'

/** Halaman bebas: terms, privacy, shipping-returns, dan halaman baru. */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'] },
  versions: { drafts: { autosave: true }, maxPerDoc: 25 },
  access: {
    read: publishedOrStaff,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: { afterChange: [triggerRebuild], afterDelete: [triggerRebuildOnDelete] },
  fields: [
    slugField(),
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'body', type: 'richText', localized: true },
  ],
}
