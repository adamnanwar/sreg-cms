import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrOps } from '../access'

/**
 * Stok tersedia = stok Loyverse − reservasi `active` − `committed`.
 * Alur: active (pesanan dibuat) → committed (paid) → fulfilled (receipt Loyverse dibuat,
 * stok Loyverse sudah berkurang) atau released (batal/kedaluwarsa/refund).
 */
export const StockReservations: CollectionConfig = {
  slug: 'stock-reservations',
  admin: { defaultColumns: ['order', 'variantId', 'qty', 'status', 'expiresAt'], group: 'Pelanggan' },
  access: { read: isAdminOrOps, create: () => false, update: () => false, delete: isAdmin },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    { name: 'product', type: 'relationship', relationTo: 'products' },
    { name: 'variantId', type: 'text', required: true, index: true },
    { name: 'qty', type: 'number', required: true, min: 1 },
    { name: 'expiresAt', type: 'date', index: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'active', index: true, options: ['active', 'committed', 'fulfilled', 'released'] },
  ],
}
