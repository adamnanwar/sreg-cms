import type { Access, CollectionAfterChangeHook, CollectionConfig, FieldAccess } from 'payload'

import { isAdmin, isAdminOrEditor, isAdminOrOps, isStaff } from '../access'
import { EMAIL_KEYS, frontendUrl, sendTemplateEmail } from '../lib/email/send'
import { recomputeRating } from '../lib/reviews'
import type { Order } from '../payload-types'

const never: FieldAccess = () => false
/** Data masuk lewat endpoint publik (rate limit + honeypot); staf mengelola lewat admin. */
const opsOnly = { read: isAdminOrOps, create: () => false, update: isAdminOrOps, delete: isAdmin }
const statusField = (options: string[], defaultValue: string) =>
  ({ name: 'status', type: 'select', defaultValue, options, index: true, admin: { position: 'sidebar' } }) as const

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  admin: { useAsTitle: 'subject', defaultColumns: ['name', 'email', 'subject', 'status', 'createdAt'], group: 'Form masuk' },
  defaultSort: '-createdAt',
  access: opsOnly,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'subject', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    statusField(['new', 'handled'], 'new'),
  ],
}

export const WholesaleInquiries: CollectionConfig = {
  slug: 'wholesale-inquiries',
  admin: { useAsTitle: 'company', defaultColumns: ['company', 'contactName', 'email', 'status', 'createdAt'], group: 'Form masuk' },
  defaultSort: '-createdAt',
  access: opsOnly,
  fields: [
    { name: 'company', type: 'text', required: true },
    { name: 'contactName', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'volume', type: 'text' },
    { name: 'message', type: 'textarea' },
    statusField(['new', 'contacted', 'closed'], 'new'),
  ],
}

export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'confirmedAt', 'source', 'createdAt'], group: 'Form masuk' },
  defaultSort: '-createdAt',
  access: opsOnly,
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'confirmToken', type: 'text', index: true, access: { read: never, create: never, update: never }, admin: { hidden: true } },
    { name: 'confirmedAt', type: 'date' },
    { name: 'source', type: 'text' },
  ],
}

export const StockAlerts: CollectionConfig = {
  slug: 'stock-alerts',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'product', 'notifiedAt', 'createdAt'], group: 'Form masuk' },
  access: opsOnly,
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    { name: 'variantId', type: 'text' },
    { name: 'email', type: 'email', required: true },
    { name: 'notifiedAt', type: 'date', index: true },
  ],
}

export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  admin: { useAsTitle: 'key', defaultColumns: ['key', 'subject', 'active'], group: 'Pengaturan' },
  versions: { drafts: true, maxPerDoc: 20 },
  access: { read: isStaff, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdmin },
  fields: [
    { name: 'key', type: 'select', required: true, unique: true, options: [...EMAIL_KEYS] },
    { name: 'subject', type: 'text', required: true, localized: true },
    {
      name: 'body',
      type: 'richText',
      required: true,
      localized: true,
      admin: {
        description:
          'Placeholder: {{orderNumber}} {{customerName}} {{total}} {{orderUrl}} {{trackingUrl}} {{invoiceUrl}} {{productName}} {{productUrl}} {{returnStatus}} {{resetUrl}} {{code}} {{minutes}} {{confirmUrl}}',
      },
    },
    { name: 'active', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar', description: 'Nonaktif → teks bawaan dipakai.' } },
  ],
}

// ---- Ulasan ----
const readReviews: Access = (args) => (isStaff(args) ? true : { status: { equals: 'approved' } })

const recompute: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  if (doc.status !== previousDoc?.status || (doc.status === 'approved' && doc.rating !== previousDoc?.rating)) {
    const productId = typeof doc.product === 'object' ? doc.product.id : doc.product
    await recomputeRating(req.payload, productId, req)
  }
  return doc
}

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: { useAsTitle: 'title', defaultColumns: ['product', 'customer', 'rating', 'status', 'verifiedPurchase', 'createdAt'], group: 'Pelanggan' },
  defaultSort: '-createdAt',
  access: { read: readReviews, create: () => false, update: isAdminOrOps, delete: isAdmin },
  hooks: {
    afterChange: [recompute],
    afterDelete: [
      async ({ doc, req }) => {
        const productId = typeof doc.product === 'object' ? doc.product.id : doc.product
        await recomputeRating(req.payload, productId, req)
      },
    ],
  },
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true, index: true },
    { name: 'customer', type: 'relationship', relationTo: 'customers', required: true, index: true, access: { read: isStaff } },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5 },
    { name: 'title', type: 'text', maxLength: 120 },
    { name: 'body', type: 'textarea', maxLength: 3000 },
    statusField(['pending', 'approved', 'rejected'], 'pending'),
    { name: 'verifiedPurchase', type: 'checkbox', defaultValue: false, admin: { readOnly: true }, access: { create: never, update: never } },
  ],
}

// ---- Retur ----
const notifyReturn: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update' || doc.status === previousDoc?.status) return doc
  const order = (typeof doc.order === 'object' ? doc.order : await req.payload.findByID({ collection: 'orders', id: doc.order, depth: 0, req })) as Order
  await sendTemplateEmail(
    req.payload,
    'return-update',
    order.contact.email,
    {
      orderNumber: order.orderNumber,
      customerName: order.address.firstName,
      returnStatus: doc.status,
      orderUrl: frontendUrl(`/order/${order.orderNumber}?token=${order.guestToken ?? ''}`),
    },
    order.lang === 'id' ? 'id' : 'en',
  )
  return doc
}

export const Returns: CollectionConfig = {
  slug: 'returns',
  admin: { useAsTitle: 'id', defaultColumns: ['order', 'status', 'reason', 'refundAmount', 'createdAt'], group: 'Pelanggan' },
  defaultSort: '-createdAt',
  access: { read: isAdminOrOps, create: () => false, update: isAdminOrOps, delete: isAdmin },
  hooks: { afterChange: [notifyReturn] },
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    {
      name: 'items',
      type: 'array',
      required: true,
      fields: [
        { name: 'slug', type: 'text', required: true },
        { name: 'name', type: 'text' },
        { name: 'qty', type: 'number', required: true, min: 1 },
      ],
    },
    { name: 'reason', type: 'select', required: true, options: ['damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other'] },
    { name: 'reasonText', type: 'textarea', maxLength: 2000 },
    { name: 'photos', type: 'array', maxRows: 5, fields: [{ name: 'photo', type: 'upload', relationTo: 'media', required: true }] },
    statusField(['requested', 'approved', 'rejected', 'received', 'refunded'], 'requested'),
    { name: 'refundAmount', type: 'number', min: 0 },
    { name: 'internalNotes', type: 'textarea' },
    { name: 'xeroCreditNoteId', type: 'text', admin: { readOnly: true }, access: { create: never, update: never } },
  ],
}
