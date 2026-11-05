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
      // Kunci API (BITESHIP_API_KEY, FEDEX_*) tetap di env, bukan di sini.
      name: 'shipping',
      type: 'group',
      admin: { description: 'Alamat asal dan aturan hitung ongkir. Biteship untuk tujuan Indonesia, FedEx untuk luar negeri.' },
      fields: [
        { name: 'originName', type: 'text', label: 'Nama kontak pengirim' },
        { name: 'originPhone', type: 'text', label: 'Telepon pengirim' },
        { name: 'originAddress', type: 'textarea', label: 'Alamat asal' },
        { name: 'originPostalCode', type: 'text', label: 'Kode pos asal', admin: { description: 'Wajib bila ID area kosong.' } },
        { name: 'originAreaId', type: 'text', label: 'ID area Biteship asal', admin: { description: 'Opsional, lebih akurat daripada kode pos.' } },
        { name: 'couriers', type: 'text', defaultValue: 'jne,sicepat,anteraja', admin: { description: 'Kode kurir Biteship dipisah koma, mis. jne,sicepat,anteraja,gojek' } },
        { name: 'packagingGrams', type: 'number', defaultValue: 100, min: 0, label: 'Berat kemasan (g)', admin: { description: 'Ditambahkan ke berat total tiap paket.' } },
        { name: 'defaultItemGrams', type: 'number', defaultValue: 250, min: 1, label: 'Berat bawaan per item (g)', admin: { description: 'Dipakai bila produk/varian belum punya berat.' } },
      ],
    },
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
