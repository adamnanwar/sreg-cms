import type { CollectionConfig } from 'payload'

import { isAdminOrEditor } from '../access'
import { scheduleRebuild, triggerRebuildOnDelete } from '../hooks/triggerRebuild'

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  admin: { useAsTitle: 'question', defaultColumns: ['question', 'category', 'order'] },
  defaultSort: 'order',
  access: {
    read: () => true,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  // FAQ tanpa draft (sesuai spesifikasi): tiap simpanan langsung tayang, jadi selalu memicu build.
  hooks: {
    afterChange: [
      ({ doc, context }) => {
        if (!context?.skipRebuild) scheduleRebuild()
        return doc
      },
    ],
    afterDelete: [triggerRebuildOnDelete],
  },
  fields: [
    { name: 'question', type: 'text', required: true, localized: true },
    { name: 'answer', type: 'richText', required: true, localized: true },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'other',
      options: [
        { label: 'Ordering', value: 'ordering' },
        { label: 'Shipping', value: 'shipping' },
        { label: 'Payment', value: 'payment' },
        { label: 'Products', value: 'products' },
        { label: 'Wholesale', value: 'wholesale' },
        { label: 'Lainnya', value: 'other' },
      ],
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
