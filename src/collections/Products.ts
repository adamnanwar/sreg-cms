import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'

import { isAdminOrEditor, isStaff } from '../access'
import { labelValueArray, slugField } from '../fields/common'
import { triggerRebuild, triggerRebuildOnDelete } from '../hooks/triggerRebuild'

/** Hanya job sinkron (Local API, overrideAccess) yang boleh menulis field ini. */
const syncedOnly: { access: { create: FieldAccess; update: FieldAccess } } = {
  access: { create: () => false, update: () => false },
}
const ro = { readOnly: true } as const

/**
 * Publik: hanya yang terbit, tidak disembunyikan, dan masih aktif di Loyverse.
 * Staf melihat semuanya.
 */
const publicProducts: Where = {
  and: [
    { _status: { equals: 'published' } },
    { hidden: { not_equals: true } },
    { 'loyverse.active': { not_equals: false } },
  ],
}

const readProducts: Access = (args) => (isStaff(args) ? true : publicProducts)

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'loyverse.itemId', '_status', 'updatedAt'],
  },
  versions: { drafts: { autosave: true }, maxPerDoc: 25 },
  access: {
    read: readProducts,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: { afterChange: [triggerRebuild], afterDelete: [triggerRebuildOnDelete] },
  fields: [
    slugField(),
    { name: 'category', type: 'relationship', relationTo: 'product-categories', required: true },
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'eyebrow', type: 'text', localized: true, admin: { description: 'Baris kecil di atas nama, mis. GUJI, ETHIOPIA // 2000 MASL' } },
    { name: 'score', type: 'number', min: 0, max: 100, admin: { step: 0.5, description: 'Skor cupping (biji kopi saja)' } },
    labelValueArray('specs', 10),
    {
      name: 'notes',
      type: 'array',
      localized: true,
      fields: [{ name: 'note', type: 'text', required: true }],
    },
    {
      // Cache baca-saja dari Loyverse. itemId satu-satunya yang diisi manual.
      name: 'loyverse',
      type: 'group',
      admin: { description: 'Harga, pajak, dan stok berasal dari Loyverse dan tidak bisa diubah di sini.' },
      fields: [
        {
          name: 'itemId',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { description: 'ID item di Loyverse (kunci penaut).' },
        },
        { name: 'active', type: 'checkbox', defaultValue: true, admin: ro, ...syncedOnly },
        { name: 'price', type: 'number', admin: ro, ...syncedOnly },
        {
          name: 'variants',
          type: 'array',
          admin: ro,
          ...syncedOnly,
          fields: [
            { name: 'variantId', type: 'text', required: true },
            { name: 'sku', type: 'text' },
            { name: 'optionLabel', type: 'text' },
            { name: 'price', type: 'number' },
            // Stok mentah tidak boleh bocor ke publik; cukup soldOut/lowStock.
            { name: 'stock', type: 'number', access: { read: isStaff, create: () => false, update: () => false } },
            { name: 'soldOut', type: 'checkbox' },
          ],
        },
        { name: 'taxIncluded', type: 'checkbox', admin: ro, ...syncedOnly },
        { name: 'taxRate', type: 'number', admin: ro, ...syncedOnly },
        { name: 'soldOut', type: 'checkbox', admin: ro, ...syncedOnly },
        { name: 'lowStock', type: 'checkbox', admin: ro, ...syncedOnly },
        { name: 'syncedAt', type: 'date', admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } }, ...syncedOnly },
      ],
    },
    { name: 'ratingAvg', type: 'number', admin: ro, ...syncedOnly },
    { name: 'ratingCount', type: 'number', admin: ro, ...syncedOnly },
    { name: 'size', type: 'text', localized: true, admin: { description: 'Teks panjang, mis. 250G POUCH' } },
    { name: 'unit', type: 'text', localized: true, admin: { description: 'Dipakai di keranjang/pesanan, mis. 250 g' } },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'PNG transparan, bungkus saja, min. 1000 px.' },
    },
    {
      name: 'variantLabels',
      type: 'array',
      localized: true,
      admin: { description: 'Nama tampilan per varian Loyverse. Harga dan stok tetap dari Loyverse.' },
      fields: [
        { name: 'variantId', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'lineOptions',
      type: 'group',
      admin: { description: 'Pilihan yang tidak mengubah harga/stok, mis. Grind. Kosong untuk minuman dan roti.' },
      fields: [
        { name: 'label', type: 'text', localized: true },
        {
          name: 'choices',
          type: 'array',
          localized: true,
          fields: [{ name: 'label', type: 'text', required: true }],
        },
      ],
    },
    { name: 'weightGrams', type: 'number', min: 0, admin: { position: 'sidebar', description: 'Berat per unit (gram) untuk ongkir. Dipakai bila varian tidak punya berat sendiri.' } },
    {
      name: 'variantWeights',
      type: 'array',
      admin: { description: 'Berat per varian (gram), mis. 250 g dan 1 kg. Kosong → berat produk.' },
      fields: [
        { name: 'variantId', type: 'text', required: true },
        { name: 'weightGrams', type: 'number', required: true, min: 1 },
      ],
    },
    {
      // Hanya untuk pengiriman internasional (FedEx).
      name: 'customs',
      type: 'group',
      admin: { description: 'Data bea cukai untuk pengiriman internasional.' },
      fields: [
        { name: 'description', type: 'text', admin: { description: 'Deskripsi barang dalam bahasa Inggris, mis. Roasted coffee beans' } },
        { name: 'hsCode', type: 'text', admin: { description: 'Kode HS, mis. 0901.21' } },
        { name: 'countryOfOrigin', type: 'text', defaultValue: 'ID', maxLength: 2, admin: { description: 'Kode negara ISO-2' } },
      ],
    },
    { name: 'hidden', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Sembunyikan dari web walau terbit.' } },
    { name: 'isNew', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'featuredRank', type: 'number', admin: { position: 'sidebar' } },
    {
      name: 'related',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: { description: 'Opsional. Kosong → frontend memilih kategori yang sama.' },
    },
    {
      name: 'detail',
      type: 'group',
      fields: [
        { name: 'eyebrow', type: 'text', localized: true },
        { name: 'summary', type: 'textarea', localized: true },
        { name: 'caption', type: 'text', localized: true },
        { name: 'tagline', type: 'textarea', localized: true, admin: { description: 'Dua baris; baris baru dipertahankan.' } },
        { name: 'story', type: 'textarea', localized: true },
        labelValueArray('facts', 10),
      ],
    },
  ],
}
