// @vitest-environment node
import { createHmac } from 'node:crypto'
import { getPayload, type Endpoint, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { Customers } from '@/collections/Customers'
import { Orders } from '@/collections/Orders'
import { publicEndpoints } from '@/endpoints/public'
import { buildQuote } from '@/lib/checkout/quote'
import { createOrder } from '@/lib/orders/create'
import { expireUnpaidOrders } from '@/lib/payments/apply'

const SECRET = 'mock-secret'
let payload: Payload
let categoryId: number | string
let mediaId: number | string
let beansId: number | string
let cakeId: number | string
let customerId: number | string

const ep = (path: string) => publicEndpoints.find((e) => e.path === path)!
const req = (o: { body?: unknown; headers?: Record<string, string>; query?: Record<string, string>; user?: unknown; params?: Record<string, string> } = {}) =>
  ({
    payload,
    user: o.user,
    headers: new Headers(o.headers),
    searchParams: new URLSearchParams(o.query),
    routeParams: o.params,
    json: async () => o.body,
    text: async () => (typeof o.body === 'string' ? o.body : JSON.stringify(o.body)),
  }) as never
const call = async (e: { handler: unknown }, r: unknown) => {
  const res = (await (e.handler as (r: unknown) => Promise<Response>)(r)) as Response
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}
const collEp = (c: { endpoints?: unknown }, path: string) => (c.endpoints as Endpoint[]).find((e) => e.path === path)!
let ipCounter = 0
const ip = () => ({ 'x-forwarded-for': `10.9.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}` })

const address = { firstName: 'Nadia', lastName: 'Putri', phone: '+62 812 3456 7890', street: 'Jl. Cipete Raya 18', province: 'DKI Jakarta', city: 'Jakarta Selatan', district: 'Cilandak', postalCode: '12410' }
const orderBody = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  items,
  contact: { email: 'buyer@test.local' },
  address,
  shippingId: 'test-ship',
  paymentId: 'test-pay-va',
  ...extra,
})
const beans = (qty: number, option = 'Filter') => ({ slug: 'test-c-beans', variantId: 'CV-1', option, qty })

const reservedFor = async (variantId: string) =>
  (await payload.find({ collection: 'stock-reservations', where: { and: [{ variantId: { equals: variantId } }, { status: { in: ['active', 'committed'] } }] }, pagination: false })).docs.reduce(
    (s, r) => s + r.qty,
    0,
  )

describe('commerce', () => {
  beforeAll(async () => {
    delete process.env.LOYVERSE_ACCESS_TOKEN
    process.env.PAYMENT_PROVIDER = 'mock'
    process.env.MOCK_PAYMENT_SECRET = SECRET
    payload = await getPayload({ config: await config })
    const skip = { context: { skipRebuild: true } }

    categoryId = (await payload.create({ collection: 'product-categories', data: { slug: 'test-c-cat', label: 'T' }, ...skip })).id
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()
    mediaId = (await payload.create({ collection: 'media', data: { alt: 't' }, file: { data: png, mimetype: 'image/png', name: `test-c-${Date.now()}.png`, size: png.length } })).id

    const base = { category: categoryId, image: mediaId, _status: 'published' as const }
    beansId = (
      await payload.create({
        collection: 'products',
        ...skip,
        data: {
          ...base,
          slug: 'test-c-beans',
          name: 'TEST BEANS',
          lineOptions: { label: 'Grind', choices: [{ label: 'Whole beans' }, { label: 'Filter' }] },
          loyverse: { itemId: 'T-C-1', active: true, price: 195000, taxIncluded: true, taxRate: 11, variants: [{ variantId: 'CV-1', sku: 'B', optionLabel: '250 g', price: 195000, stock: 5, soldOut: false }] },
        },
      })
    ).id
    cakeId = (
      await payload.create({
        collection: 'products',
        ...skip,
        data: { ...base, slug: 'test-c-cake', name: 'TEST CAKE', loyverse: { itemId: 'T-C-2', active: true, price: 30000, taxIncluded: false, taxRate: 10, variants: [{ variantId: 'CV-2', price: 30000, stock: null, soldOut: false }] } },
      })
    ).id

    await payload.create({ collection: 'shipping-methods', data: { slug: 'test-ship', name: 'TEST SHIP', minDays: 2, maxDays: 3, price: 20000 } })
    await payload.create({ collection: 'payment-methods', data: { slug: 'test-pay-va', name: 'VA', type: 'virtual_account', fee: 0 } })
    await payload.create({ collection: 'payment-methods', data: { slug: 'test-pay-fee', name: 'Fee', type: 'qris', fee: 2500 } })
    await payload.create({ collection: 'discount-codes', data: { code: 'TESTPCT10', type: 'percent', value: 10, maxUses: 1 } })
    await payload.create({ collection: 'discount-codes', data: { code: 'TESTEXPIRED', type: 'fixed', value: 5000, endAt: '2020-01-01T00:00:00.000Z' } })
    customerId = (await payload.create({ collection: 'customers', data: { email: 'cust@test.local', password: 'Passw0rd!x', name: 'Cust' } })).id
  })

  afterAll(async () => {
    const del = async (collection: string, where: object) => payload.delete({ collection: collection as never, where: where as never }).catch(() => undefined)
    const orders = await payload.find({ collection: 'orders', where: { 'contact.email': { equals: 'buyer@test.local' } }, pagination: false, depth: 0 })
    for (const o of orders.docs) await del('stock-reservations', { order: { equals: o.id } })
    await del('returns', { order: { in: orders.docs.map((o) => o.id) } })
    await del('orders', { 'contact.email': { equals: 'buyer@test.local' } })
    await del('reviews', { customer: { equals: customerId } })
    await del('contact-messages', { email: { like: 'test.local' } })
    await del('newsletter-subscribers', { email: { like: 'test.local' } })
    await del('stock-alerts', { email: { like: 'test.local' } })
    await del('customers', { email: { like: 'test.local' } })
    await del('discount-codes', { code: { like: 'TEST' } })
    await del('payment-methods', { slug: { like: 'test-' } })
    await del('shipping-methods', { slug: { like: 'test-' } })
    await del('products', { slug: { like: 'test-c-' } })
    await del('media', { id: { equals: mediaId } })
    await del('product-categories', { slug: { equals: 'test-c-cat' } })
  })

  describe('kuotasi', () => {
    it('menghitung subtotal, diskon, pajak, ongkir, dan total dari server', async () => {
      const q = await buildQuote(payload, {
        items: [beans(2), { slug: 'test-c-cake', qty: 1 }],
        shippingId: 'test-ship',
        paymentId: 'test-pay-va',
        discountCode: 'testpct10',
      })
      expect(q.subtotal).toBe(420000)
      expect(q.discount).toEqual({ code: 'TESTPCT10', amount: 42000 })
      expect(q.tax).toBe(34784 + 2700)
      expect(q.taxIncluded).toBe(false)
      // 420000 - 42000 + pajak tambahan 2700 + ongkir 20000
      expect(q.total).toBe(400700)
    })

    it('biaya pembayaran masuk total', async () => {
      const q = await buildQuote(payload, { items: [{ slug: 'test-c-cake', qty: 1 }], paymentId: 'test-pay-fee' })
      expect(q.paymentFee).toBe(2500)
      expect(q.total).toBe(30000 + 3000 + 2500)
    })

    it('menolak opsi hilang/salah, stok kurang, diskon tidak valid, dan produk tak dikenal', async () => {
      const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: { code?: string; status?: number }) => `${e.status}:${e.code}`)
      expect(await code(buildQuote(payload, { items: [{ slug: 'test-c-beans', variantId: 'CV-1', qty: 1 }] }))).toBe('422:option_required')
      expect(await code(buildQuote(payload, { items: [beans(1, 'Turkish')] }))).toBe('422:invalid_option')
      expect(await code(buildQuote(payload, { items: [beans(6)] }))).toBe('409:out_of_stock')
      expect(await code(buildQuote(payload, { items: [beans(1)], discountCode: 'NOPE' }))).toBe('422:invalid_discount')
      expect(await code(buildQuote(payload, { items: [beans(1)], discountCode: 'TESTEXPIRED' }))).toBe('422:invalid_discount')
      expect(await code(buildQuote(payload, { items: [{ slug: 'nope', qty: 1 }] }))).toBe('422:product_unavailable')
      expect(await code(buildQuote(payload, { items: [{ slug: 'test-c-cake', qty: 0 }] }))).toBe('422:validation_error')
    })

    it('endpoint quote tidak membocorkan stok mentah', async () => {
      const r = await call(ep('/checkout/quote'), req({ headers: ip(), body: { items: [beans(1)] } }))
      expect(r.status).toBe(200)
      expect(r.body.total).toBe(195000)
      expect(JSON.stringify(r.body)).not.toContain('"stock"')
    })
  })

  describe('pesanan', () => {
    let first: Awaited<ReturnType<typeof createOrder>>
    let winner: Awaited<ReturnType<typeof createOrder>>

    it('membuat pesanan, mencadangkan stok, dan idempoten', async () => {
      first = await createOrder(payload, orderBody([beans(3)], { discountCode: 'TESTPCT10' }), { customer: null, idempotencyKey: 'idem-1' })
      expect(first.created).toBe(true)
      expect(first.order.id).toMatch(/^SRG-\d{6}-\d{4}$/)
      expect(first.order.status).toBe('awaiting_payment')
      expect(first.order.total).toBe(3 * 195000 - 58500 + 20000)
      expect((first.order.payment.instructions as { type: string }).type).toBe('virtual_account')
      expect((first.order as { guestToken?: string }).guestToken).toHaveLength(48)
      expect(await reservedFor('CV-1')).toBe(3)

      const again = await createOrder(payload, orderBody([beans(3)]), { customer: null, idempotencyKey: 'idem-1' })
      expect(again.created).toBe(false)
      expect(again.order.id).toBe(first.order.id)
      expect(await reservedFor('CV-1')).toBe(3)
    })

    it('stok yang dicadangkan mengurangi ketersediaan; kuota diskon terpakai', async () => {
      await expect(buildQuote(payload, { items: [beans(3)] })).rejects.toMatchObject({ code: 'out_of_stock' })
      await expect(buildQuote(payload, { items: [beans(2)] })).resolves.toBeDefined()
      // maxUses 1 sudah terpakai oleh pesanan pertama
      await expect(buildQuote(payload, { items: [beans(1)], discountCode: 'TESTPCT10' })).rejects.toMatchObject({ code: 'invalid_discount' })
    })

    it('tidak oversell pada permintaan bersamaan', async () => {
      const results = await Promise.allSettled([
        createOrder(payload, orderBody([beans(2)]), { customer: null }),
        createOrder(payload, orderBody([beans(2)]), { customer: null }),
      ])
      const won = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createOrder>>> => r.status === 'fulfilled')
      expect(won).toHaveLength(1)
      expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { code: 'out_of_stock' } })
      expect(await reservedFor('CV-1')).toBe(5)
      winner = won[0]!.value
    })

    it('akses: publik tidak bisa membaca orders; lookup butuh token', async () => {
      await expect(payload.find({ collection: 'orders', overrideAccess: false })).rejects.toThrow()
      const lookup = collEp(Orders, '/lookup')
      const token = (first.order as { guestToken?: string }).guestToken!
      expect((await call(lookup, req({ headers: ip(), query: { number: first.order.id, token: 'salah' } }))).status).toBe(404)
      expect((await call(lookup, req({ headers: ip(), query: { number: first.order.id } }))).status).toBe(404)
      const ok = await call(lookup, req({ headers: ip(), query: { number: first.order.id, token } }))
      expect(ok.status).toBe(200)
      expect(JSON.stringify(ok.body)).not.toMatch(/internalNotes|idempotencyKey|guestToken/)
    })

    it('webhook: tanda tangan salah ditolak; sah → paid, reservasi committed; ulangan aman', async () => {
      const hook = ep('/payments/webhook/:provider')
      const body = JSON.stringify({ orderNumber: first.order.id, status: 'paid' })
      const sig = createHmac('sha256', SECRET).update(body).digest('hex')
      const send = (s: string) => call(hook, req({ body, headers: { 'x-mock-signature': s }, params: { provider: 'mock' } }))

      expect((await send('salah')).status).toBe(401)
      expect((await send(sig)).body.result).toBe('applied')
      const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: first.order.id } }, limit: 1 })).docs[0]!
      expect(order.status).toBe('paid')
      expect(order.payment?.paidAt).toBeTruthy()
      expect(order.loyverse?.syncStatus).toBe('pending')
      const resv = await payload.find({ collection: 'stock-reservations', where: { order: { equals: order.id } } })
      expect(resv.docs.every((r) => r.status === 'committed')).toBe(true)
      expect((await send(sig)).body.result).toBe('ignored')
    })

    it('transisi status tidak valid ditolak', async () => {
      const order = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: first.order.id } }, limit: 1 })).docs[0]!
      await expect(payload.update({ collection: 'orders', id: order.id, data: { status: 'awaiting_payment' } })).rejects.toThrow(/tidak diizinkan/)
      await payload.update({ collection: 'orders', id: order.id, data: { status: 'processing' } })
      await payload.update({ collection: 'orders', id: order.id, data: { status: 'shipped', tracking: { carrier: 'JNE', number: 'X1' } } })
    })

    it('pembatalan melepas reservasi stok; kedaluwarsa otomatis menutup pesanan', async () => {
      const cancelEp = collEp(Orders, '/:id/cancel')
      const token = (winner.order as { guestToken?: string }).guestToken
      expect(await reservedFor('CV-1')).toBe(5)
      expect((await call(cancelEp, req({ headers: ip(), params: { id: winner.order.id }, body: { token: 'salah' } }))).status).toBe(404)
      expect((await call(cancelEp, req({ headers: ip(), params: { id: winner.order.id }, body: { token } }))).body.status).toBe('cancelled')
      expect(await reservedFor('CV-1')).toBe(3)
      // Pesanan yang sudah dibatalkan tidak bisa dibatalkan lagi.
      expect((await call(cancelEp, req({ headers: ip(), params: { id: winner.order.id }, body: { token } }))).status).toBe(409)

      const o2 = await createOrder(payload, orderBody([{ slug: 'test-c-cake', qty: 1 }]), { customer: null })
      const row = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: o2.order.id } }, limit: 1 })).docs[0]!
      await payload.update({ collection: 'orders', id: row.id, data: { payment: { ...row.payment, expiresAt: '2020-01-01T00:00:00.000Z' } } })
      expect(await expireUnpaidOrders(payload)).toBeGreaterThanOrEqual(1)
      const after = await payload.findByID({ collection: 'orders', id: row.id })
      expect(after.status).toBe('expired')
    })

    it('pembayaran telat pada pesanan kedaluwarsa ditandai perlu refund', async () => {
      const row = (await payload.find({ collection: 'orders', where: { and: [{ status: { equals: 'expired' } }, { 'contact.email': { equals: 'buyer@test.local' } }] }, limit: 1 })).docs[0]!
      const body = JSON.stringify({ orderNumber: row.orderNumber, status: 'paid' })
      const sig = createHmac('sha256', SECRET).update(body).digest('hex')
      await call(ep('/payments/webhook/:provider'), req({ body, headers: { 'x-mock-signature': sig }, params: { provider: 'mock' } }))
      const after = await payload.findByID({ collection: 'orders', id: row.id })
      expect(after.status).toBe('expired')
      expect(after.needsRefund).toBe(true)
    })

    it('data tidak lengkap ditolak dengan format error seragam', async () => {
      await expect(createOrder(payload, orderBody([beans(1)], { address: { firstName: 'A' } }), { customer: null })).rejects.toMatchObject({ status: 422, code: 'validation_error' })
      await expect(createOrder(payload, { ...orderBody([beans(1)]), contact: { email: 'bukan-email' } }, { customer: null })).rejects.toMatchObject({ status: 422 })
    })
  })

  describe('retur', () => {
    it('hanya untuk pesanan terkirim; item dan jumlah divalidasi', async () => {
      const row = (await payload.find({ collection: 'orders', where: { and: [{ status: { equals: 'shipped' } }, { 'contact.email': { equals: 'buyer@test.local' } }] }, limit: 1 })).docs[0]!
      const token = row.guestToken!
      const ret = ep('/returns')
      const b = (items: unknown[], t = token) => ({ orderNumber: row.orderNumber, token: t, items, reason: 'damaged' })
      expect((await call(ret, req({ headers: ip(), body: b([{ slug: 'test-c-beans', qty: 1 }], 'salah') }))).status).toBe(404)
      expect((await call(ret, req({ headers: ip(), body: b([{ slug: 'test-c-beans', qty: 99 }]) }))).status).toBe(422)
      const ok = await call(ret, req({ headers: ip(), body: b([{ slug: 'test-c-beans', qty: 1 }]) }))
      expect(ok.status).toBe(201)
      const list = await call(ep('/returns/lookup'), req({ headers: ip(), query: { order: row.orderNumber, token } }))
      expect(list.body.docs).toHaveLength(1)
    })
  })

  describe('akun, ulasan, wishlist', () => {
    it('pendaftaran tidak bisa menetapkan emailVerified atau field internal', async () => {
      const c = await payload.create({
        collection: 'customers',
        overrideAccess: false,
        data: { email: 'new@test.local', password: 'Passw0rd!x', name: 'N', emailVerified: true, xeroContactId: 'hack' } as never,
      })
      const row = await payload.findByID({ collection: 'customers', id: c.id, showHiddenFields: true })
      expect(row.emailVerified).not.toBe(true)
      expect(row.xeroContactId).toBeFalsy()
    })

    it('kata sandi lemah ditolak server', async () => {
      for (const password of ['abc1', 'abcdefgh', '12345678']) {
        await expect(
          payload.create({ collection: 'customers', data: { email: 'weak@test.local', password, name: 'W' } }),
        ).rejects.toThrow()
      }
      expect((await payload.find({ collection: 'customers', where: { email: { equals: 'weak@test.local' } } })).totalDocs).toBe(0)
    })

    it('customer hanya membaca dirinya; /me/orders hanya milik sendiri', async () => {
      const mine = await createOrder(payload, orderBody([{ slug: 'test-c-cake', qty: 1 }]), { customer: { id: customerId } })
      expect((mine.order as { guestToken?: string }).guestToken).toBeUndefined()
      const me = { collection: 'customers', id: customerId }
      const list = await call(collEp(Customers, '/me/orders'), req({ user: me }))
      expect(list.body.data.map((o: { id: string }) => o.id)).toEqual([mine.order.id])
      expect((await call(collEp(Customers, '/me/orders'), req({}))).status).toBe(401)
      const all = await payload.find({ collection: 'customers', user: me as never, overrideAccess: false })
      expect(all.docs.map((d) => d.id)).toEqual([customerId])
    })

    it('ulasan: menunggu moderasi, lalu rating produk terhitung', async () => {
      const me = { collection: 'customers', id: customerId }
      const post = (rating: number) => call(ep('/reviews'), req({ user: me, headers: ip(), body: { productSlug: 'test-c-beans', rating, title: 'Mantap' } }))
      expect((await call(ep('/reviews'), req({ headers: ip(), body: {} }))).status).toBe(401)
      const r = await post(5)
      expect(r.status).toBe(201)
      expect((await post(4)).status).toBe(409)
      const publicBefore = await payload.find({ collection: 'reviews', overrideAccess: false, where: { product: { equals: beansId } } })
      expect(publicBefore.totalDocs).toBe(0)
      await payload.update({ collection: 'reviews', id: r.body.id, data: { status: 'approved' } })
      const product = await payload.findByID({ collection: 'products', id: beansId, depth: 0 })
      expect(product.ratingAvg).toBe(5)
      expect(product.ratingCount).toBe(1)
      const verified = await payload.findByID({ collection: 'reviews', id: r.body.id })
      expect(verified.verifiedPurchase).toBe(false) // pesanan beans milik customer ini belum ada
    })

    it('wishlist bisa ditambah dan dibuang', async () => {
      const me = { collection: 'customers', id: customerId }
      const w = (action?: string) => call(ep('/wishlist'), req({ user: me, headers: ip(), body: { productSlug: 'test-c-cake', action } }))
      expect((await w('add')).body.inWishlist).toBe(true)
      expect((await w('remove')).body.inWishlist).toBe(false)
      expect((await call(ep('/wishlist'), req({ headers: ip(), body: { productSlug: 'test-c-cake' } }))).status).toBe(401)
    })
  })

  describe('form publik dan pencarian', () => {
    it('kontak: honeypot diabaikan diam-diam, rate limit 5 per jendela', async () => {
      const h = ip()
      const body = { name: 'A', email: 'a@test.local', message: 'halo' }
      expect((await call(ep('/forms/contact'), req({ headers: h, body: { ...body, website: 'http://spam' } }))).status).toBe(202)
      expect((await payload.find({ collection: 'contact-messages', where: { email: { equals: 'a@test.local' } } })).totalDocs).toBe(0)
      for (let i = 0; i < 4; i++) expect((await call(ep('/forms/contact'), req({ headers: h, body }))).status).toBe(202)
      expect((await call(ep('/forms/contact'), req({ headers: h, body }))).status).toBe(429)
      expect((await payload.find({ collection: 'contact-messages', where: { email: { equals: 'a@test.local' } } })).totalDocs).toBe(4)
    })

    it('newsletter: double opt-in dan validasi email', async () => {
      const h = ip()
      expect((await call(ep('/forms/newsletter'), req({ headers: h, body: { email: 'bukan' } }))).status).toBe(422)
      expect((await call(ep('/forms/newsletter'), req({ headers: h, body: { email: 'n@test.local' } }))).status).toBe(202)
      const sub = (await payload.find({ collection: 'newsletter-subscribers', where: { email: { equals: 'n@test.local' } }, showHiddenFields: true })).docs[0]!
      expect(sub.confirmedAt).toBeFalsy()
      expect((await call(ep('/forms/newsletter/confirm'), req({ headers: h, query: { token: 'x'.repeat(48) } }))).status).toBe(404)
      expect((await call(ep('/forms/newsletter/confirm'), req({ headers: h, query: { token: sub.confirmToken! } }))).status).toBe(200)
      expect((await payload.findByID({ collection: 'newsletter-subscribers', id: sub.id })).confirmedAt).toBeTruthy()
    })

    it('notifikasi stok dan pencarian', async () => {
      const h = ip()
      expect((await call(ep('/forms/stock-alert'), req({ headers: h, body: { email: 's@test.local', slug: 'test-c-beans' } }))).status).toBe(202)
      expect((await call(ep('/forms/stock-alert'), req({ headers: h, body: { email: 's@test.local', slug: 'nope' } }))).status).toBe(404)

      const found = await call(ep('/search'), req({ headers: h, query: { q: 'TEST BEANS' } }))
      expect(found.body.docs.map((d: { slug: string }) => d.slug)).toContain('test-c-beans')
      expect(JSON.stringify(found.body)).not.toContain('"stock"')
      expect((await call(ep('/search'), req({ headers: h, query: { q: 'a' } }))).body.docs).toEqual([])
    })
  })
})
