import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { slugField } from '../fields/common'
import { triggerRebuild, triggerRebuildOnDelete } from '../hooks/triggerRebuild'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'publishedAt', 'featured', '_status'] },
  defaultSort: '-publishedAt',
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
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'body', type: 'richText', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
      hooks: {
        beforeValidate: [({ value, siblingData }) => value ?? (siblingData?._status === 'published' ? new Date().toISOString() : value)],
      },
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text', required: true }] },
  ],
}
