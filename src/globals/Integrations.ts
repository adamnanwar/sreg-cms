import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access'

const ro = { readOnly: true } as const
const syncedOnly = { access: { create: () => false, update: () => false } }

/** Pengaturan koneksi. Token TIDAK disimpan di sini: pakai env (LOYVERSE_ACCESS_TOKEN). */
export const Integrations: GlobalConfig = {
  slug: 'integrations',
  access: { read: isAdmin, update: isAdmin },
  fields: [
    {
      name: 'loyverse',
      type: 'group',
      fields: [
        { name: 'storeId', type: 'text', admin: { description: 'Toko Loyverse yang stoknya dipakai untuk penjualan online. Kosong → env LOYVERSE_STORE_ID.' } },
        { name: 'paymentTypeId', type: 'text', admin: { description: 'Jenis pembayaran untuk receipt online (Fase 2).' } },
        { name: 'lowStockThreshold', type: 'number', defaultValue: 5, min: 0 },
        { name: 'lastFullSyncAt', type: 'date', admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } }, ...syncedOnly },
        { name: 'lastError', type: 'textarea', admin: ro, ...syncedOnly },
        { name: 'lastSummary', type: 'text', admin: ro, ...syncedOnly },
        {
          name: 'unprofiled',
          type: 'array',
          label: 'Item Loyverse yang belum punya profil di Payload',
          admin: ro,
          ...syncedOnly,
          fields: [
            { name: 'itemId', type: 'text' },
            { name: 'name', type: 'text' },
          ],
        },
      ],
    },
  ],
}
