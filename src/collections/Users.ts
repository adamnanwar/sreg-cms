import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  auth: true,
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        // Akun pertama menjadi admin; selanjutnya hanya admin yang boleh menentukan peran.
        const { totalDocs } = await req.payload.count({ collection: 'users', req })
        if (totalDocs === 0) return { ...data, role: 'admin' }
        if (req.user && !isAdmin({ req })) return { ...data, role: 'editor' }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor (konten)', value: 'editor' },
        { label: 'Ops (pesanan, stok, form)', value: 'ops' },
      ],
      access: { update: isAdmin },
    },
  ],
}
