import type { Access, CollectionConfig } from 'payload'

import { isAdmin, isAdminOrOps, isStaff } from '../access'
import { slugField } from '../fields/common'

/** Publik hanya melihat yang aktif; staf melihat semua. */
const activeOrStaff: Access = (args) => (isStaff(args) ? true : { active: { equals: true } })

export const ShippingMethods: CollectionConfig = {
  slug: 'shipping-methods',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'price', 'active'], group: 'Checkout' },
  defaultSort: 'order',
  access: { read: activeOrStaff, create: isAdminOrOps, update: isAdminOrOps, delete: isAdmin },
  fields: [
    slugField(),
    { name: 'name', type: 'text', required: true },
    { name: 'etaText', type: 'text', localized: true, admin: { description: 'Mis. Estimated delivery: 2–3 business days' } },
    { name: 'daysLabel', type: 'text', localized: true },
    { name: 'minDays', type: 'number', required: true, min: 0, admin: { description: 'Hari kerja' } },
    { name: 'maxDays', type: 'number', required: true, min: 0 },
    { name: 'price', type: 'number', required: true, min: 0, admin: { description: 'Rupiah bulat. Diganti API ongkir di fase berikutnya.' } },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}

export const PaymentMethods: CollectionConfig = {
  slug: 'payment-methods',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'type', 'fee', 'active'], group: 'Checkout' },
  defaultSort: 'order',
  access: { read: activeOrStaff, create: isAdminOrOps, update: isAdminOrOps, delete: isAdmin },
  fields: [
    slugField(),
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'detail', type: 'text', localized: true },
    { name: 'fee', type: 'number', defaultValue: 0, min: 0 },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: ['card', 'virtual_account', 'qris', 'ewallet'],
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}

/** Tidak bisa dibaca publik: validasi hanya lewat endpoint kuotasi. */
export const DiscountCodes: CollectionConfig = {
  slug: 'discount-codes',
  admin: { useAsTitle: 'code', defaultColumns: ['code', 'type', 'value', 'usedCount', 'active'], group: 'Checkout' },
  access: { read: isAdminOrOps, create: isAdminOrOps, update: isAdminOrOps, delete: isAdmin },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)] },
    },
    { name: 'type', type: 'select', required: true, defaultValue: 'percent', options: ['percent', 'fixed'] },
    { name: 'value', type: 'number', required: true, min: 1, admin: { description: 'Persen (1–100) atau rupiah' } },
    { name: 'minSubtotal', type: 'number', min: 0 },
    { name: 'maxUses', type: 'number', min: 1, admin: { description: 'Kosong = tak terbatas' } },
    { name: 'usedCount', type: 'number', defaultValue: 0, admin: { readOnly: true }, access: { create: () => false, update: () => false } },
    { name: 'startAt', type: 'date' },
    { name: 'endAt', type: 'date' },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.type === 'percent' && typeof data.value === 'number' && data.value > 100) {
          throw new Error('Diskon persen tidak boleh lebih dari 100.')
        }
        return data
      },
    ],
  },
}

// ---- Wilayah (diimpor dari dataset resmi, bukan diketik manual) ----
const publicRead = { read: () => true, create: isAdmin, update: isAdmin, delete: isAdmin }

export const Provinces: CollectionConfig = {
  slug: 'provinces',
  admin: { useAsTitle: 'name', group: 'Wilayah' },
  access: publicRead,
  defaultSort: 'name',
  fields: [
    { name: 'code', type: 'text', unique: true, index: true },
    { name: 'name', type: 'text', required: true },
  ],
}

export const Cities: CollectionConfig = {
  slug: 'cities',
  admin: { useAsTitle: 'name', group: 'Wilayah' },
  access: publicRead,
  defaultSort: 'name',
  fields: [
    { name: 'code', type: 'text', unique: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'province', type: 'relationship', relationTo: 'provinces', required: true, index: true },
  ],
}

export const Districts: CollectionConfig = {
  slug: 'districts',
  admin: { useAsTitle: 'name', group: 'Wilayah' },
  access: publicRead,
  defaultSort: 'name',
  fields: [
    { name: 'code', type: 'text', unique: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, index: true },
  ],
}
