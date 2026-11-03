import type { CollectionConfig } from 'payload'

import { isAdminOrEditor } from '../access'
import { slugField } from '../fields/common'
import { triggerRebuild, triggerRebuildOnDelete } from '../hooks/triggerRebuild'

export const ProductCategories: CollectionConfig = {
  slug: 'product-categories',
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'slug', 'order'] },
  defaultSort: 'order',
  access: {
    read: () => true,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: { afterChange: [triggerRebuild], afterDelete: [triggerRebuildOnDelete] },
  fields: [
    slugField(),
    { name: 'label', type: 'text', required: true, localized: true },
    { name: 'blurb', type: 'textarea', localized: true },
    { name: 'sectorImage', type: 'upload', relationTo: 'media' },
    { name: 'sectorBadge', type: 'text', localized: true, admin: { description: 'Opsional, mis. NEW MENU!' } },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
