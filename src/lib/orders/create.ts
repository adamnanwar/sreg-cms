import { randomBytes, randomInt } from 'node:crypto'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload } from 'payload'

import type { Order } from '../../payload-types'
import { buildQuote, type Quote, type QuoteItemInput } from '../checkout/quote'
import { frontendUrl, sendTemplateEmail } from '../email/send'
import { ApiError, str } from '../http'
import { loyverse } from '../loyverse/client'
import { getProvider } from '../payments/provider'
import { cancelOrder } from './lifecycle'
import { withLock } from './mutex'
import { serializeOrder } from './serialize'

const EXPIRY_HOURS = Number(process.env.ORDER_EXPIRY_HOURS) || 24

type Address = NonNullable<Order['address']>

const ADDRESS_REQUIRED = ['firstName', 'phone', 'street', 'province', 'city', 'district', 'postalCode'] as const

function parseAddress(raw: unknown): Address {
  const a = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const fields: Record<string, string> = {}
  const out: Record<string, string> = {}
  for (const k of [...ADDRESS_REQUIRED, 'lastName', 'country', 'address2']) {
    const v = typeof a[k] === 'string' ? (a[k] as string).trim().slice(0, 200) : ''
    out[k] = v
    if (!v && (ADDRESS_REQUIRED as readonly string[]).includes(k)) fields[`address.${k}`] = 'Wajib diisi'
  }
  if (Object.keys(fields).length) throw new ApiError(422, 'validation_error', 'Alamat tidak lengkap.', fields)
  return { ...out, country: out.country || 'Indonesia' } as Address
}

/** Nomor SRG-YYMMDD-XXXX (tanggal WIB). Keacakan 4 digit; akses pesanan tamu tetap butuh guestToken. */
const makeOrderNumber = (): string => {
  const d = new Date(Date.now() + 7 * 3600_000)
  const yy = String(d.getUTCFullYear()).slice(2)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `SRG-${yy}${mm}${dd}-${String(randomInt(0, 10000)).padStart(4, '0')}`
}

/** Stok langsung dari Loyverse. Tanpa token (dev) dilewati; token ada tapi gagal → 503, jangan menebak stok. */
async function fetchLiveStock(payload: Payload): Promise<Map<string, number | null> | undefined> {
  if (!process.env.LOYVERSE_ACCESS_TOKEN) return undefined
  const integrations = await payload.findGlobal({ slug: 'integrations', depth: 0 })
  const storeId = integrations.loyverse?.storeId || process.env.LOYVERSE_STORE_ID
  if (!storeId) throw new ApiError(503, 'stock_unavailable', 'Stok belum dapat diperiksa. Coba lagi nanti.')
  try {
    const levels = await loyverse.inventory(storeId)
    return new Map(levels.map((l) => [l.variant_id, l.in_stock]))
  } catch (err) {
    payload.logger.error({ err }, '[orders] Loyverse tidak dapat dihubungi saat membuat pesanan')
    throw new ApiError(503, 'stock_unavailable', 'Stok belum dapat diperiksa. Coba lagi nanti.')
  }
}

export type CreateOrderResult = { order: ReturnType<typeof serializeOrder>; created: boolean }

export async function createOrder(
  payload: Payload,
  body: Record<string, unknown>,
  ctx: { customer: { id: number | string } | null; idempotencyKey?: string },
): Promise<CreateOrderResult> {
  // ---- Validasi input ----
  const contact = (body.contact && typeof body.contact === 'object' ? body.contact : {}) as Record<string, unknown>
  const contactEmail = str(contact, 'email', { required: true, max: 254 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
    throw new ApiError(422, 'validation_error', 'Email tidak valid.', { 'contact.email': 'Email tidak valid' })
  }
  const address = parseAddress(body.address)
  const shippingId = str(body, 'shippingId', { required: true })
  const paymentId = str(body, 'paymentId', { required: true })
  const note = str(body, 'note', { max: 500 })
  const discountCode = str(body, 'discountCode', { max: 40 })
  const lang = body.locale === 'id' ? 'id' : 'en'
  const idemKey = ctx.idempotencyKey?.slice(0, 100)

  // ---- Idempotensi ----
  if (idemKey) {
    const prior = (await payload.find({ collection: 'orders', where: { idempotencyKey: { equals: idemKey } }, limit: 1, depth: 0 })).docs[0]
    if (prior) return { order: serializeOrder(prior, { includeToken: !ctx.customer }), created: false }
  }

  const provider = getProvider()
  if (!provider) throw new ApiError(503, 'payment_unavailable', 'Pembayaran belum tersedia.')

  const liveStock = await fetchLiveStock(payload)
  const items = (Array.isArray(body.items) ? body.items : []) as QuoteItemInput[]

  // ---- Cek stok + buat pesanan + reservasi dalam satu transaksi, serial ----
  const req = await createLocalReq({}, payload)
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 3600_000)
  const guestToken = randomBytes(24).toString('hex')

  const created = await withLock(async () => {
    const started = await initTransaction(req)
    try {
      if (idemKey) {
        const again = (await payload.find({ collection: 'orders', where: { idempotencyKey: { equals: idemKey } }, limit: 1, depth: 0, req })).docs[0]
        if (again) {
          if (started) await commitTransaction(req)
          return { order: again, existed: true }
        }
      }

      const quote: Quote = await buildQuote(payload, { items, shippingId, paymentId, discountCode: discountCode || undefined, locale: lang }, { liveStock, req })
      if (!quote.shipping || !quote.paymentMethod) throw new ApiError(422, 'validation_error', 'Pengiriman/pembayaran wajib.')

      let orderNumber = makeOrderNumber()
      for (let i = 0; i < 5; i++) {
        const clash = await payload.find({ collection: 'orders', where: { orderNumber: { equals: orderNumber } }, limit: 1, depth: 0, req })
        if (!clash.totalDocs) break
        orderNumber = makeOrderNumber()
      }

      const order = await payload.create({
        collection: 'orders',
        req,
        depth: 0,
        data: {
          orderNumber,
          customer: ctx.customer?.id as never,
          guestToken,
          idempotencyKey: idemKey,
          status: 'awaiting_payment',
          lang,
          items: quote.lines.map((l) => ({
            product: l.productId as never,
            loyverseVariantId: l.variantId,
            sku: l.sku,
            slug: l.slug,
            name: l.name,
            variantLabel: l.variantLabel,
            variantOption: l.option,
            unit: l.unit,
            image: l.image,
            unitPrice: l.unitPrice,
            qty: l.qty,
            tax: l.tax,
          })),
          subtotal: quote.subtotal,
          discount: quote.discount?.amount ?? 0,
          discountCode: quote.discount?.code,
          shipping: quote.shipping.price,
          shippingId: quote.shipping.id,
          shippingName: quote.shipping.name,
          paymentFee: quote.paymentFee,
          tax: quote.tax,
          taxIncluded: quote.taxIncluded,
          total: quote.total,
          contact: { email: contactEmail, newsletter: Boolean(contact.newsletter) },
          address,
          note: note || undefined,
          payment: { methodId: quote.paymentMethod.id, provider: provider.id, expiresAt: expiresAt.toISOString() },
          loyverse: { reservedUntil: expiresAt.toISOString() },
        },
      })

      for (const l of quote.lines) {
        await payload.create({
          collection: 'stock-reservations',
          req,
          depth: 0,
          data: { order: order.id, product: l.productId as never, variantId: l.variantId, qty: l.qty, expiresAt: expiresAt.toISOString(), status: 'active' },
        })
      }

      if (quote.discountCodeId != null) {
        const dc = await payload.findByID({ collection: 'discount-codes', id: quote.discountCodeId, depth: 0, req })
        await payload.update({ collection: 'discount-codes', id: dc.id, data: { usedCount: (dc.usedCount ?? 0) + 1 }, req })
      }

      if (started) await commitTransaction(req)
      return { order, existed: false, quote }
    } catch (err) {
      if (started) await killTransaction(req)
      throw err
    }
  })

  if (created.existed) return { order: serializeOrder(created.order, { includeToken: !ctx.customer }), created: false }
  let order = created.order

  // ---- Pembayaran (di luar transaksi; bila gagal, batalkan pesanan agar stok kembali) ----
  try {
    const methodType = created.quote!.paymentMethod!.type as 'card' | 'virtual_account' | 'qris' | 'ewallet'
    const pay = await provider.createPayment({
      orderNumber: order.orderNumber,
      total: order.total,
      methodSlug: paymentId,
      methodType,
      customer: { email: contactEmail, name: [address.firstName, address.lastName].filter(Boolean).join(' ') },
      expiresAt,
    })
    order = await payload.update({
      collection: 'orders',
      id: order.id,
      depth: 0,
      data: { payment: { ...order.payment, providerRef: pay.providerRef, instructions: pay.instructions } },
    })
  } catch (err) {
    payload.logger.error({ err, order: order.orderNumber }, '[orders] pembayaran gagal dibuat, pesanan dibatalkan')
    await cancelOrder(payload, order).catch(() => undefined)
    throw new ApiError(502, 'payment_failed', 'Pembayaran tidak dapat dibuat. Coba lagi.')
  }

  // ---- Alamat tersimpan & email ----
  if (ctx.customer && body.saveAddress) {
    try {
      const me = await payload.findByID({ collection: 'customers', id: ctx.customer.id, depth: 0 })
      const exists = me.addresses?.some((a) => a.street === address.street && a.postalCode === address.postalCode)
      if (!exists) {
        await payload.update({
          collection: 'customers',
          id: me.id,
          depth: 0,
          data: { addresses: [...(me.addresses ?? []), { ...address, isDefault: !me.addresses?.length }] },
        })
      }
    } catch (err) {
      payload.logger.warn({ err }, '[orders] gagal menyimpan alamat')
    }
  }

  const sent = await sendTemplateEmail(
    payload,
    'order-created',
    contactEmail,
    {
      orderNumber: order.orderNumber,
      customerName: [address.firstName, address.lastName].filter(Boolean).join(' '),
      total: order.total,
      orderUrl: frontendUrl(`/order/${order.orderNumber}?token=${guestToken}`),
    },
    lang,
  )
  if (sent) {
    const at = new Date().toISOString()
    await payload.db.updateOne({ collection: 'orders', id: order.id, data: { emails: { orderCreatedSentAt: at } } })
    order = { ...order, emails: { orderCreatedSentAt: at } }
  }

  return { order: serializeOrder(order, { includeToken: !ctx.customer }), created: true }
}
