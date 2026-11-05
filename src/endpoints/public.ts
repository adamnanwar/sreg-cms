import { randomBytes } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import { canAccessOrder, findOrderByNumber } from '../collections/Orders'
import { buildQuote, publicQuote, sellableWhere } from '../lib/checkout/quote'
import { frontendUrl, sendTemplateEmail } from '../lib/email/send'
import { ApiError, customerOf, email, handle, isHoneypotTripped, rateLimit, readJson, str } from '../lib/http'
import { applyPaymentEvent } from '../lib/payments/apply'
import { getProvider, providerById } from '../lib/payments/provider'
import { getRates, isProviderRateId, parseDestination, resolveRate } from '../lib/shipping'
import { searchAreas } from '../lib/shipping/biteship'

const MIN = 60_000
const accepted = () => Response.json({ ok: true }, { status: 202 })
const localeOf = (req: PayloadRequest): 'en' | 'id' => (req.searchParams.get('locale') === 'id' ? 'id' : 'en')

const requireCustomer = (req: PayloadRequest) => {
  const me = customerOf(req)
  if (!me) throw new ApiError(401, 'unauthorized', 'Silakan login.')
  return me
}

const findSellable = async (req: PayloadRequest, slug: string) => {
  const res = await req.payload.find({ collection: 'products', where: sellableWhere({ slug: { equals: slug } }), limit: 1, depth: 0, req })
  const p = res.docs[0]
  if (!p) throw new ApiError(404, 'not_found', 'Produk tidak ditemukan.')
  return p
}

// ---- Checkout ----
const quote: Endpoint = {
  path: '/checkout/quote',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'quote', 120, 10 * MIN)
    const b = await readJson(req)
    const shippingId = typeof b.shippingId === 'string' ? b.shippingId : undefined
    const shippingOverride = isProviderRateId(shippingId)
      ? await resolveRate(req.payload, { items: Array.isArray(b.items) ? (b.items as never) : [], shippingId: shippingId!, destination: parseDestination(b.destination) })
      : undefined
    const q = await buildQuote(
      req.payload,
      {
        items: b.items as never,
        shippingId,
        paymentId: typeof b.paymentId === 'string' ? b.paymentId : undefined,
        discountCode: typeof b.discountCode === 'string' && b.discountCode ? b.discountCode : undefined,
        locale: b.locale === 'id' ? 'id' : 'en',
      },
      { shippingOverride },
    )
    return Response.json(publicQuote(q))
  }),
}

// ---- Ongkir (Biteship untuk Indonesia, FedEx untuk luar negeri) ----
const shippingRates: Endpoint = {
  path: '/shipping/rates',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'shipping-rates', 60, 10 * MIN)
    const b = await readJson(req)
    const rates = await getRates(req.payload, { items: Array.isArray(b.items) ? (b.items as never) : [], destination: parseDestination(b.destination) })
    return Response.json({ rates: rates.map(({ id, provider, courier, service, name, price, etaDays }) => ({ id, provider, courier, service, name, price, etaDays })) })
  }),
}

/** Pencarian area (kelurahan/kecamatan + kode pos) untuk alamat dalam negeri. */
const shippingAreas: Endpoint = {
  path: '/shipping/areas',
  method: 'get',
  handler: handle(async (req) => {
    rateLimit(req, 'shipping-areas', 120, 10 * MIN)
    const q = (req.searchParams.get('q') ?? '').trim().slice(0, 80)
    if (q.length < 3) return Response.json({ areas: [] })
    const areas = await searchAreas(q)
    return Response.json({ areas: areas.slice(0, 20).map((a) => ({ id: a.id, name: a.name, postalCode: a.postal_code != null ? String(a.postal_code) : undefined })) })
  }),
}

// ---- Pembayaran ----
const paymentWebhook: Endpoint = {
  path: '/payments/webhook/:provider',
  method: 'post',
  handler: handle(async (req) => {
    const provider = providerById(String(req.routeParams?.provider ?? ''))
    if (!provider) throw new ApiError(404, 'not_found', 'Penyedia tidak dikenal.')
    const parsed = provider.parseWebhook(await req.text!(), req.headers)
    if ('error' in parsed) throw new ApiError(401, 'invalid_webhook', 'Webhook ditolak.')
    const result = await applyPaymentEvent(req.payload, parsed.event)
    // 200 juga untuk "ignored"/"not_found" agar gateway tidak mengulang tanpa henti.
    return Response.json({ ok: true, result })
  }),
}

/**
 * Hanya dev/staging dengan penyedia tiruan: menggantikan tombol "Simulate payment" di frontend.
 * Di build produksi (server dev di VPS) harus dibuka eksplisit dengan ALLOW_MOCK_SIMULATE=1.
 */
const mockSimulate: Endpoint = {
  path: '/payments/mock/simulate',
  method: 'post',
  handler: handle(async (req) => {
    if ((process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_SIMULATE !== '1') || getProvider()?.id !== 'mock') throw new ApiError(404, 'not_found', 'Tidak tersedia.')
    rateLimit(req, 'mock-pay', 30, 10 * MIN)
    const b = await readJson(req)
    const order = await findOrderByNumber(req, str(b, 'orderNumber', { required: true }))
    if (!order || !canAccessOrder(req, order, typeof b.token === 'string' ? b.token : null)) throw new ApiError(404, 'not_found', 'Pesanan tidak ditemukan.')
    const status = b.status === 'expired' ? 'expired' : 'paid'
    return Response.json({ result: await applyPaymentEvent(req.payload, { orderNumber: order.orderNumber, status }) })
  }),
}

// ---- Form publik ----
const contact: Endpoint = {
  path: '/forms/contact',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'form-contact', 5, 10 * MIN)
    const b = await readJson(req)
    if (isHoneypotTripped(b)) return accepted()
    const data = { name: str(b, 'name', { required: true, max: 120 }), email: email(b), subject: str(b, 'subject', { max: 200 }), message: str(b, 'message', { required: true, max: 5000 }) }
    await req.payload.create({ collection: 'contact-messages', data })
    await sendTemplateEmail(req.payload, 'contact-received', data.email, { customerName: data.name })
    return accepted()
  }),
}

const wholesale: Endpoint = {
  path: '/forms/wholesale',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'form-wholesale', 5, 10 * MIN)
    const b = await readJson(req)
    if (isHoneypotTripped(b)) return accepted()
    await req.payload.create({
      collection: 'wholesale-inquiries',
      data: {
        company: str(b, 'company', { required: true, max: 160 }),
        contactName: str(b, 'contactName', { required: true, max: 120 }),
        email: email(b),
        phone: str(b, 'phone', { max: 30 }),
        volume: str(b, 'volume', { max: 120 }),
        message: str(b, 'message', { max: 5000 }),
      },
    })
    return accepted()
  }),
}

/** Double opt-in: simpan token, kirim tautan konfirmasi. Respons sama untuk email baru maupun lama. */
const newsletter: Endpoint = {
  path: '/forms/newsletter',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'form-newsletter', 5, 10 * MIN)
    const b = await readJson(req)
    if (isHoneypotTripped(b)) return accepted()
    const addr = email(b)
    const existing = (await req.payload.find({ collection: 'newsletter-subscribers', where: { email: { equals: addr } }, limit: 1, depth: 0 })).docs[0]
    if (existing?.confirmedAt) return accepted()
    const token = randomBytes(24).toString('hex')
    if (existing) await req.payload.update({ collection: 'newsletter-subscribers', id: existing.id, data: { confirmToken: token } })
    else await req.payload.create({ collection: 'newsletter-subscribers', data: { email: addr, confirmToken: token, source: str(b, 'source', { max: 60 }) } })
    await sendTemplateEmail(req.payload, 'newsletter-confirm', addr, { confirmUrl: frontendUrl(`/newsletter/confirm?token=${token}`) })
    return accepted()
  }),
}

const newsletterConfirm: Endpoint = {
  path: '/forms/newsletter/confirm',
  method: 'get',
  handler: handle(async (req) => {
    rateLimit(req, 'newsletter-confirm', 20, 10 * MIN)
    const token = req.searchParams.get('token') ?? ''
    const sub = token.length >= 32 ? (await req.payload.find({ collection: 'newsletter-subscribers', where: { confirmToken: { equals: token } }, limit: 1, depth: 0 })).docs[0] : undefined
    if (!sub) throw new ApiError(404, 'not_found', 'Tautan tidak valid.')
    await req.payload.update({ collection: 'newsletter-subscribers', id: sub.id, data: { confirmedAt: new Date().toISOString(), confirmToken: null } })
    return Response.json({ ok: true })
  }),
}

const stockAlert: Endpoint = {
  path: '/forms/stock-alert',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'form-stock-alert', 10, 10 * MIN)
    const b = await readJson(req)
    if (isHoneypotTripped(b)) return accepted()
    const addr = email(b)
    const product = await findSellable(req, str(b, 'slug', { required: true }))
    const variantId = str(b, 'variantId', { max: 80 }) || undefined
    const dup = await req.payload.find({
      collection: 'stock-alerts',
      where: { and: [{ product: { equals: product.id } }, { email: { equals: addr } }, { notifiedAt: { exists: false } }] },
      limit: 1,
      depth: 0,
    })
    if (!dup.totalDocs) await req.payload.create({ collection: 'stock-alerts', data: { product: product.id, variantId, email: addr } })
    return accepted()
  }),
}

// ---- Pencarian ----
const search: Endpoint = {
  path: '/search',
  method: 'get',
  handler: handle(async (req) => {
    rateLimit(req, 'search', 120, 10 * MIN)
    const q = (req.searchParams.get('q') ?? '').trim().slice(0, 80)
    if (q.length < 2) return Response.json({ docs: [], totalDocs: 0 })
    const limit = Math.min(24, Math.max(1, Number(req.searchParams.get('limit')) || 12))
    const res = await req.payload.find({
      collection: 'products',
      overrideAccess: false, // pakai aturan akses publik: terbit, tidak disembunyikan, aktif
      locale: localeOf(req),
      fallbackLocale: 'en',
      depth: 1,
      limit,
      where: {
        or: [
          { name: { contains: q } },
          { eyebrow: { contains: q } },
          { 'notes.note': { contains: q } },
          { 'specs.value': { contains: q } },
          { 'detail.facts.value': { contains: q } },
        ],
      },
      select: { slug: true, name: true, eyebrow: true, category: true, image: true, isNew: true, loyverse: { price: true, soldOut: true } },
    })
    return Response.json({ docs: res.docs, totalDocs: res.totalDocs })
  }),
}

// ---- Ulasan & wishlist ----
const createReview: Endpoint = {
  path: '/reviews',
  method: 'post',
  handler: handle(async (req) => {
    const me = requireCustomer(req)
    rateLimit(req, 'review', 10, 60 * MIN)
    const b = await readJson(req)
    const product = await findSellable(req, str(b, 'productSlug', { required: true }))
    const rating = Number(b.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(422, 'validation_error', 'Rating tidak valid.', { rating: 'Antara 1 dan 5' })

    const dup = await req.payload.find({ collection: 'reviews', where: { and: [{ product: { equals: product.id } }, { customer: { equals: me.id } }] }, limit: 1, depth: 0 })
    if (dup.totalDocs) throw new ApiError(409, 'already_reviewed', 'Anda sudah mengulas produk ini.')

    const purchased = await req.payload.find({
      collection: 'orders',
      where: { and: [{ customer: { equals: me.id } }, { status: { in: ['paid', 'processing', 'shipped', 'delivered'] } }, { 'items.slug': { equals: product.slug } }] },
      limit: 1,
      depth: 0,
    })
    const review = await req.payload.create({
      collection: 'reviews',
      data: {
        product: product.id,
        customer: me.id as never,
        rating,
        title: str(b, 'title', { max: 120 }),
        body: str(b, 'body', { max: 3000 }),
        status: 'pending',
        verifiedPurchase: purchased.totalDocs > 0,
      },
    })
    return Response.json({ id: review.id, status: review.status }, { status: 201 })
  }),
}

const wishlist: Endpoint = {
  path: '/wishlist',
  method: 'post',
  handler: handle(async (req) => {
    const me = requireCustomer(req)
    rateLimit(req, 'wishlist', 60, 10 * MIN)
    const b = await readJson(req)
    const product = await findSellable(req, str(b, 'productSlug', { required: true }))
    const customer = await req.payload.findByID({ collection: 'customers', id: me.id, depth: 0 })
    const ids = (customer.wishlist ?? []).map((w) => (typeof w === 'object' ? w.id : w))
    const has = ids.includes(product.id)
    const action = b.action === 'add' || b.action === 'remove' ? b.action : has ? 'remove' : 'add'
    const next = action === 'add' ? [...new Set([...ids, product.id])] : ids.filter((i) => i !== product.id)
    await req.payload.update({ collection: 'customers', id: me.id, data: { wishlist: next }, depth: 0 })
    return Response.json({ wishlist: next.length, inWishlist: action === 'add' })
  }),
}

// ---- Retur ----
const createReturn: Endpoint = {
  path: '/returns',
  method: 'post',
  handler: handle(async (req) => {
    rateLimit(req, 'return', 10, 60 * MIN)
    const b = await readJson(req)
    const order = await findOrderByNumber(req, str(b, 'orderNumber', { required: true }))
    if (!order || !canAccessOrder(req, order, typeof b.token === 'string' ? b.token : null)) throw new ApiError(404, 'not_found', 'Pesanan tidak ditemukan.')
    if (order.status !== 'shipped' && order.status !== 'delivered') throw new ApiError(409, 'not_returnable', 'Retur hanya untuk pesanan yang sudah dikirim.')

    const wanted = Array.isArray(b.items) ? (b.items as { slug?: unknown; qty?: unknown }[]) : []
    if (!wanted.length) throw new ApiError(422, 'validation_error', 'Pilih item yang diretur.', { items: 'Wajib diisi' })
    const items = wanted.map((w, i) => {
      const line = order.items?.find((l) => l.slug === w.slug)
      const qty = Number(w.qty)
      if (!line) throw new ApiError(422, 'validation_error', 'Item tidak ada di pesanan.', { [`items.${i}.slug`]: 'Tidak ditemukan' })
      if (!Number.isInteger(qty) || qty < 1 || qty > line.qty) throw new ApiError(422, 'validation_error', 'Jumlah tidak valid.', { [`items.${i}.qty`]: `Maksimal ${line.qty}` })
      return { slug: line.slug!, name: line.name, qty }
    })
    const reason = str(b, 'reason', { required: true })
    if (!['damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other'].includes(reason)) {
      throw new ApiError(422, 'validation_error', 'Alasan tidak valid.', { reason: 'Tidak valid' })
    }
    const ret = await req.payload.create({
      collection: 'returns',
      data: { order: order.id, items, reason: reason as never, reasonText: str(b, 'reasonText', { max: 2000 }), status: 'requested' },
    })
    return Response.json({ id: ret.id, status: ret.status }, { status: 201 })
  }),
}

const lookupReturns: Endpoint = {
  path: '/returns/lookup',
  method: 'get',
  handler: handle(async (req) => {
    rateLimit(req, 'return-lookup', 60, 10 * MIN)
    const order = await findOrderByNumber(req, req.searchParams.get('order') ?? '')
    if (!order || !canAccessOrder(req, order, req.searchParams.get('token'))) throw new ApiError(404, 'not_found', 'Pesanan tidak ditemukan.')
    const res = await req.payload.find({ collection: 'returns', where: { order: { equals: order.id } }, sort: '-createdAt', depth: 0 })
    return Response.json({
      docs: res.docs.map((r) => ({ id: r.id, status: r.status, reason: r.reason, items: r.items, refundAmount: r.refundAmount ?? undefined, createdAt: r.createdAt })),
    })
  }),
}

export const publicEndpoints: Endpoint[] = [
  quote,
  shippingRates,
  shippingAreas,
  paymentWebhook,
  mockSimulate,
  contact,
  wholesale,
  newsletter,
  newsletterConfirm,
  stockAlert,
  search,
  createReview,
  wishlist,
  createReturn,
  lookupReturns,
]
