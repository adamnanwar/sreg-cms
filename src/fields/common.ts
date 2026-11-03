import type { Field } from 'payload'

/** Pasangan label–nilai yang dipertahankan urutannya (specs, facts). */
export const labelValueArray = (name: string, maxRows = 10): Field => ({
  name,
  type: 'array',
  localized: true,
  maxRows,
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'value', type: 'text', required: true },
  ],
})

export const enabledField: Field = {
  name: 'enabled',
  type: 'checkbox',
  defaultValue: true,
  label: 'Tampilkan bagian ini',
}

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar', description: 'Dipakai di URL. Jangan diubah setelah terbit.' },
  hooks: {
    beforeValidate: [
      ({ value }) =>
        typeof value === 'string'
          ? value
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          : value,
    ],
  },
})

export const linkField = (name: string): Field => ({
  name,
  type: 'group',
  fields: [
    { name: 'label', type: 'text', localized: true },
    { name: 'href', type: 'text' },
  ],
})
