import type { CollectionConfig, FieldAccess } from 'payload'

import { isAdminOrEditor, isStaff } from '../access'

/** Hanya job sinkron (Local API, overrideAccess) yang boleh menulis field ini. */
const syncedOnly: { access: { create: FieldAccess; update: FieldAccess } } = {
  access: { create: () => false, update: () => false },
}
const ro = { readOnly: true } as const

const staffAccess = {
  read: isStaff,
  create: () => false, // baris dibuat oleh sinkron
  update: isAdminOrEditor,
  delete: () => false,
}

/**
 * Cermin kategori Loyverse. Centang `showOnWeb` untuk menampilkan semua item di kategori ini.
 */
export const LoyverseCategories: CollectionConfig = {
  slug: 'loyverse-categories',
  labels: { singular: 'Kategori Loyverse', plural: 'Kategori Loyverse' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'showOnWeb', 'webCategory'],
    group: 'Loyverse',
    description: 'Centang untuk menampilkan semua menu di kategori ini di web. Daftar diperbarui oleh sinkron Loyverse.',
  },
  defaultSort: 'name',
  access: staffAccess,
  fields: [
    { name: 'categoryId', type: 'text', required: true, unique: true, index: true, admin: ro, ...syncedOnly },
    { name: 'name', type: 'text', required: true, admin: ro, ...syncedOnly },
    {
      name: 'showOnWeb',
      type: 'checkbox',
      defaultValue: false,
      label: 'Tampilkan di web',
      index: true,
      admin: { components: { Cell: '/components/ShowOnWebCell#ShowOnWebCell' } },
    },
    {
      name: 'webCategory',
      type: 'relationship',
      relationTo: 'product-categories',
      label: 'Kategori web',
      admin: { description: 'Kategori web untuk produk baru yang dibuat dari kategori Loyverse ini.' },
    },
  ],
}

/**
 * Cermin item Loyverse. Centang `showOnWeb` per menu; item tampil bila item ATAU kategorinya dicentang.
 * Item yang tampil dibuatkan produk draf; foto dan teks dilengkapi lalu diterbitkan di Products.
 */
export const LoyverseItems: CollectionConfig = {
  slug: 'loyverse-items',
  labels: { singular: 'Menu Loyverse', plural: 'Menu Loyverse' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'categoryName', 'minPrice', 'showOnWeb', 'product'],
    listSearchableFields: ['name', 'categoryName'],
    group: 'Loyverse',
    description: 'Centang menu yang ingin ditampilkan di web (bisa banyak sekaligus lewat pilih + Edit). Daftar diperbarui oleh sinkron Loyverse.',
  },
  defaultSort: 'name',
  access: staffAccess,
  fields: [
    { name: 'itemId', type: 'text', required: true, unique: true, index: true, admin: ro, ...syncedOnly },
    { name: 'name', type: 'text', required: true, admin: ro, ...syncedOnly },
    { name: 'categoryId', type: 'text', index: true, admin: { ...ro, position: 'sidebar' }, ...syncedOnly },
    { name: 'categoryName', type: 'text', index: true, label: 'Kategori Loyverse', admin: ro, ...syncedOnly },
    { name: 'minPrice', type: 'number', label: 'Harga mulai', admin: ro, ...syncedOnly },
    { name: 'variantCount', type: 'number', admin: ro, ...syncedOnly },
    {
      name: 'showOnWeb',
      type: 'checkbox',
      defaultValue: false,
      label: 'Tampilkan di web',
      index: true,
      admin: { components: { Cell: '/components/ShowOnWebCell#ShowOnWebCell' } },
    },
    { name: 'product', type: 'relationship', relationTo: 'products', label: 'Produk di web', admin: ro, ...syncedOnly },
    { name: 'missing', type: 'checkbox', defaultValue: false, admin: { ...ro, description: 'Item sudah tidak ada di Loyverse.' }, ...syncedOnly },
  ],
}
