import { timingSafeEqual } from 'node:crypto'
import type { Access, CollectionConfig, FieldAccess, PayloadRequest } from 'payload'

import { isAdmin, isAdminOrOps, isStaff } from '../access'
import { createOrder } from '../lib/orders/create'
import { cancelOrder, onOrderStatusChange, validateTransition } from '../lib/orders/lifecycle'
import { serializeOrder } from '../lib/orders/serialize'
import { ApiError, customerOf, handle, rateLimit, readJson } from '../lib/http'
import type { Order } from '../payload-types'

const never: FieldAccess = () => false

/** Pesanan tidak bisa dibaca publik; customer hanya pesanannya sendiri; ops/admin semua. */
const readOrders: Access = (args) => {
  if (isAdminOrOps(args)) return true
  const me = customerOf(args.req)
  return me ? { customer: { equals: me.id } } : false
}

export const tokenMatches = (given: string | null | undefined, actual: string | null | undefined): boolean => {
  if (!given || !actual) return false
  const a = Buffer.from(given)
  const b = Buffer.from(actual)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Pemilik (akun) atau pemegang guestToken. */
export const canAccessOrder = (req: PayloadRequest, order: Order, token?: string | null): boolean => {
  if (isStaff({ req })) return true
  const me = customerOf(req)
  const ownerId = typeof order.customer === 'object' && order.customer ? order.customer.id : order.customer
  if (me && ownerId != null && String(ownerId) === String(me.id)) return true
  return tokenMatches(token, order.guestToken)
}

export const findOrderByNumber = async (req: PayloadRequest, number: string): Promise<Order | null> => {
  const res = await req.payload.find({ collection: 'orders', where: { orderNumber: { equals: number } }, limit: 1, depth: 0, req })
  return res.docs[0] ?? null
}

const lockedMoney = { access: { create: never, update: never }, admin: { readOnly: true } } as const

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'status', 'total', 'contact.email', 'createdAt'],
    group: 'Pelanggan',
  },
  defaultSort: '-createdAt',
  access: {
    read: readOrders,
    create: () => false, // hanya lewat createOrder (Local API) setelah harga dihitung ulang
    update: isAdminOrOps,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation === 'update' && originalDoc && data.status && data.status !== originalDoc.status) {
          validateTransition(originalDoc.status, data.status)
          if (data.status === 'paid' && !data.payment?.paidAt && !originalDoc.payment?.paidAt) {
            data.payment = { ...originalDoc.payment, ...data.payment, paidAt: new Date().toISOString() }
          }
        }
        return data
      },
    ],
    afterChange: [onOrderStatusChange],
  },
  fields: [
    { name: 'orderNumber', type: 'text', required: true, unique: true, index: true, ...lockedMoney },
    { name: 'customer', type: 'relationship', relationTo: 'customers', ...lockedMoney },
    {
      name: 'guestToken',
      type: 'text',
      index: true,
      access: { create: never, update: never, read: isStaff },
      admin: { readOnly: true },
    },
    { name: 'idempotencyKey', type: 'text', unique: true, index: true, access: { create: never, update: never, read: isStaff }, admin: { hidden: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'awaiting_payment',
      index: true,
      options: ['awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'refunded'],
      admin: { position: 'sidebar' },
    },
    { name: 'needsRefund', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar', description: 'Dibayar tetapi dibatalkan/kedaluwarsa. Perlu refund manual.' } },
    { name: 'lang', type: 'select', defaultValue: 'en', options: ['en', 'id'], ...lockedMoney },
    {
      name: 'items',
      type: 'array',
      ...lockedMoney,
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products' },
        { name: 'loyverseVariantId', type: 'text' },
        { name: 'sku', type: 'text' },
        { name: 'slug', type: 'text' },
        { name: 'name', type: 'text', required: true },
        { name: 'variantLabel', type: 'text' },
        { name: 'variantOption', type: 'text' },
        { name: 'unit', type: 'text' },
        { name: 'image', type: 'text' },
        { name: 'unitPrice', type: 'number', required: true },
        { name: 'qty', type: 'number', required: true },
        { name: 'tax', type: 'number' },
      ],
    },
    { name: 'subtotal', type: 'number', required: true, ...lockedMoney },
    { name: 'discount', type: 'number', defaultValue: 0, ...lockedMoney },
    { name: 'discountCode', type: 'text', ...lockedMoney },
    { name: 'shipping', type: 'number', defaultValue: 0, ...lockedMoney },
    { name: 'shippingId', type: 'text', ...lockedMoney },
    { name: 'shippingName', type: 'text', ...lockedMoney },
    { name: 'paymentFee', type: 'number', defaultValue: 0, ...lockedMoney },
    { name: 'tax', type: 'number', defaultValue: 0, ...lockedMoney },
    { name: 'taxIncluded', type: 'checkbox', defaultValue: true, ...lockedMoney },
    { name: 'total', type: 'number', required: true, ...lockedMoney },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'newsletter', type: 'checkbox', defaultValue: false },
      ],
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text' },
        { name: 'phone', type: 'text', required: true },
        { name: 'country', type: 'text', defaultValue: 'Indonesia' },
        { name: 'street', type: 'text', required: true },
        { name: 'address2', type: 'text' },
        // Provinsi/kecamatan wajib hanya untuk Indonesia (divalidasi di parseAddress).
        { name: 'province', type: 'text' },
        { name: 'city', type: 'text', required: true },
        { name: 'district', type: 'text' },
        { name: 'postalCode', type: 'text', required: true },
      ],
    },
    { name: 'note', type: 'text' },
    {
      // Jangan simpan nomor kartu, CVV, atau expiry. Hanya brand + 4 digit terakhir.
      name: 'payment',
      type: 'group',
      fields: [
        { name: 'methodId', type: 'text' },
        { name: 'provider', type: 'text' },
        { name: 'providerRef', type: 'text', index: true },
        { name: 'cardBrand', type: 'text' },
        { name: 'cardLast4', type: 'text', maxLength: 4 },
        { name: 'instructions', type: 'json' },
        { name: 'expiresAt', type: 'date', index: true },
        { name: 'paidAt', type: 'date' },
      ],
    },
    {
      name: 'tracking',
      type: 'group',
      fields: [
        { name: 'carrier', type: 'text' },
        { name: 'number', type: 'text' },
        { name: 'url', type: 'text' },
        {
          name: 'events',
          type: 'array',
          fields: [
            { name: 'at', type: 'date' },
            { name: 'description', type: 'text' },
          ],
        },
      ],
    },
    {
      // Diisi integrasi Loyverse (receipt) — belum aktif.
      name: 'loyverse',
      type: 'group',
      admin: { readOnly: true },
      access: { create: never, update: never },
      fields: [
        { name: 'receiptNumber', type: 'text' },
        { name: 'receiptId', type: 'text' },
        { name: 'syncStatus', type: 'select', options: ['pending', 'done', 'failed'] },
        { name: 'lastError', type: 'textarea' },
        { name: 'reservedUntil', type: 'date' },
      ],
    },
    {
      // Diisi integrasi Xero (invoice) — belum aktif.
      name: 'xero',
      type: 'group',
      admin: { readOnly: true },
      access: { create: never, update: never },
      fields: [
        { name: 'invoiceId', type: 'text' },
        { name: 'invoiceNumber', type: 'text' },
        { name: 'invoiceUrl', type: 'text' },
        { name: 'status', type: 'select', options: ['pending', 'done', 'failed'] },
        { name: 'paymentId', type: 'text' },
        { name: 'creditNoteId', type: 'text' },
        { name: 'lastError', type: 'textarea' },
      ],
    },
    {
      name: 'emails',
      type: 'group',
      admin: { readOnly: true },
      access: { create: never, update: never },
      fields: [{ name: 'orderCreatedSentAt', type: 'date' }],
    },
    { name: 'internalNotes', type: 'textarea', access: { read: isStaff, create: isAdminOrOps, update: isAdminOrOps } },
  ],
  endpoints: [
    {
      // POST /api/orders/create
      path: '/create',
      method: 'post',
      handler: handle(async (req) => {
        rateLimit(req, 'order-create', 20, 10 * 60_000)
        const body = await readJson(req)
        const res = await createOrder(req.payload, body, {
          customer: customerOf(req),
          idempotencyKey: req.headers.get('idempotency-key') || undefined,
        })
        return Response.json(res.order, { status: res.created ? 201 : 200 })
      }),
    },
    {
      // GET /api/orders/lookup?number=…&token=…
      path: '/lookup',
      method: 'get',
      handler: handle(async (req) => {
        rateLimit(req, 'order-lookup', 60, 10 * 60_000)
        const number = req.searchParams.get('number') ?? ''
        const order = number ? await findOrderByNumber(req, number) : null
        // Tanggapan sama untuk "tidak ada" dan "token salah" agar nomor tidak bisa ditebak.
        if (!order || !canAccessOrder(req, order, req.searchParams.get('token'))) {
          throw new ApiError(404, 'not_found', 'Pesanan tidak ditemukan.')
        }
        return Response.json(serializeOrder(order))
      }),
    },
    {
      // POST /api/orders/:id/cancel  (id = nomor pesanan; tamu menyertakan {token})
      path: '/:id/cancel',
      method: 'post',
      handler: handle(async (req) => {
        rateLimit(req, 'order-cancel', 20, 10 * 60_000)
        const body = await readJson(req).catch(() => ({}) as Record<string, unknown>)
        const order = await findOrderByNumber(req, String(req.routeParams?.id ?? ''))
        const token = typeof body.token === 'string' ? body.token : req.searchParams.get('token')
        if (!order || !canAccessOrder(req, order, token)) throw new ApiError(404, 'not_found', 'Pesanan tidak ditemukan.')
        const updated = await cancelOrder(req.payload, order)
        return Response.json(serializeOrder(updated))
      }),
    },
  ],
}
