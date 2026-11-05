// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { publicEndpoints } from '@/endpoints/public'
import { createOrder } from '@/lib/orders/create'
import { parseEta } from '@/lib/shipping/biteship'

let payload: Payload
let categoryId: number | string
let mediaId: number | string
let integrationsBefore: unknown
let biteshipBodies: Record<string, unknown>[] = []

const ep = (path: string) => publicEndpoints.find((e) => e.path === path)!
let ipCounter = 0
const req = (body?: unknown, query?: Record<string, string>) =>
  ({
    payload,
    headers: new Headers({ 'x-forwarded-for': `10.8.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}` }),
    searchParams: new URLSearchParams(query),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as never
const call = async (path: string, r: unknown) => {
  const res = (await (ep(path).handler as (r: unknown) => Promise<Response>)(r)) as Response
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null }
}

const PRICING = {
  pricing: [
    { courier_name: 'SiCepat', courier_code: 'sicepat', courier_service_name: 'Regular', courier_service_code: 'reg', price: 24000, shipment_duration_range: '2 - 3', shipment_duration_unit: 'days', duration: '2 - 3 days' },
    { courier_name: 'JNE', courier_code: 'jne', courier_service_name: 'Reguler', courier_service_code: 'reg', price: 18500.4, shipment_duration_range: '1 - 2', shipment_duration_unit: 'days', duration: '1 - 2 days' },
    { courier_name: 'Broken', courier_code: 'x' }, // tanpa harga/layanan: dibuang
  ],
}

const stubBiteship = (status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      if (String(input).includes('api.biteship.com')) {
        biteshipBodies.push(init?.body ? JSON.parse(String(init.body)) : {})
        return status === 200 ? new Response(JSON.stringify(PRICING), { status }) : new Response('boom', { status })
      }
      return new Response('not found', { status: 404 })
    }),
  )

const cart = [
  { slug: 'test-s-beans', variantId: 'SV-250', qty: 2 },
  { slug: 'test-s-beans', variantId: 'SV-1K', qty: 1 },
]
const idAddress = { firstName: 'Nadia', phone: '+62 812', street: 'Jl. Cipete 18', province: 'DKI Jakarta', city: 'Jakarta Selatan', district: 'Cilandak', postalCode: '12410' }

describe('shipping', () => {
  beforeAll(async () => {
    delete process.env.LOYVERSE_ACCESS_TOKEN
    process.env.PAYMENT_PROVIDER = 'mock'
    process.env.MOCK_PAYMENT_SECRET = 'mock-secret'
    process.env.BITESHIP_API_KEY = 'test-key'
    delete process.env.FEDEX_CLIENT_ID
    payload = await getPayload({ config: await config })
    const skip = { context: { skipRebuild: true } }

    integrationsBefore = (await payload.findGlobal({ slug: 'integrations', depth: 0 })).shipping
    await payload.updateGlobal({
      slug: 'integrations',
      data: { shipping: { originPostalCode: '29461', couriers: 'jne, sicepat', packagingGrams: 100, defaultItemGrams: 250 } },
      context: { skipRebuild: true },
    })

    categoryId = (await payload.create({ collection: 'product-categories', data: { slug: 'test-s-cat', label: 'T' }, ...skip })).id
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()
    mediaId = (await payload.create({ collection: 'media', data: { alt: 't' }, file: { data: png, mimetype: 'image/png', name: `test-s-${Date.now()}.png`, size: png.length } })).id
    await payload.create({
      collection: 'products',
      ...skip,
      data: {
        category: categoryId,
        image: mediaId,
        _status: 'published',
        slug: 'test-s-beans',
        name: 'TEST SHIP BEANS',
        variantWeights: [
          { variantId: 'SV-250', weightGrams: 300 },
          { variantId: 'SV-1K', weightGrams: 1100 },
        ],
        loyverse: {
          itemId: 'T-S-1',
          active: true,
          price: 100000,
          taxIncluded: true,
          taxRate: 0,
          variants: [
            { variantId: 'SV-250', price: 100000, stock: null, soldOut: false },
            { variantId: 'SV-1K', price: 350000, stock: null, soldOut: false },
          ],
        },
      },
    })
    await payload.create({ collection: 'payment-methods', data: { slug: 'test-s-pay', name: 'VA', type: 'virtual_account', fee: 0 } })
    await payload.create({ collection: 'shipping-methods', data: { slug: 'test-s-fixed', name: 'FIXED', minDays: 1, maxDays: 2, price: 15000 } })
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    delete process.env.BITESHIP_API_KEY
    const del = async (collection: string, where: object) => payload.delete({ collection: collection as never, where: where as never }).catch(() => undefined)
    const orders = await payload.find({ collection: 'orders', where: { 'contact.email': { equals: 'ship@test.local' } }, pagination: false, depth: 0 })
    for (const o of orders.docs) await del('stock-reservations', { order: { equals: o.id } })
    await del('orders', { 'contact.email': { equals: 'ship@test.local' } })
    await del('payment-methods', { slug: { like: 'test-s-' } })
    await del('shipping-methods', { slug: { like: 'test-s-' } })
    await del('products', { slug: { like: 'test-s-' } })
    await del('media', { id: { equals: mediaId } })
    await del('product-categories', { slug: { equals: 'test-s-cat' } })
    await payload.updateGlobal({ slug: 'integrations', data: { shipping: (integrationsBefore ?? {}) as never }, context: { skipRebuild: true } }).catch(() => undefined)
  })

  it('parseEta membaca rentang hari', () => {
    expect(parseEta('1 - 2', '1 - 2 days')).toEqual([1, 2])
    expect(parseEta(undefined, '3 days')).toEqual([3, 3])
    expect(parseEta(undefined, undefined)).toEqual([0, 0])
  })

  it('tarif Biteship: berat per varian + kemasan, urut termurah, data rusak dibuang', async () => {
    biteshipBodies = []
    stubBiteship()
    const r = await call('/shipping/rates', req({ items: cart, destination: { country: 'Indonesia', postalCode: '12410' } }))
    expect(r.status).toBe(200)
    expect(r.body.rates).toEqual([
      { id: 'biteship:jne:reg', provider: 'biteship', courier: 'jne', service: 'reg', name: 'JNE Reguler', price: 18500, etaDays: [1, 2] },
      { id: 'biteship:sicepat:reg', provider: 'biteship', courier: 'sicepat', service: 'reg', name: 'SiCepat Regular', price: 24000, etaDays: [2, 3] },
    ])
    // 2 x 300 + 1 x 1100 + kemasan 100
    expect(biteshipBodies[0]).toMatchObject({
      couriers: 'jne,sicepat',
      origin_postal_code: 29461,
      destination_postal_code: 12410,
      items: [{ weight: 1800, value: 550000, quantity: 1 }],
    })
  })

  it('tujuan wajib punya kode pos; kunci tidak terpasang atau luar negeri → 503 shipping_unavailable', async () => {
    stubBiteship()
    const noPostal = await call('/shipping/rates', req({ items: cart, destination: { country: 'Indonesia' } }))
    expect(noPostal.status).toBe(422)

    const intl = await call('/shipping/rates', req({ items: cart, destination: { country: 'Singapore', postalCode: '018956' } }))
    expect(intl.status).toBe(503)
    expect(intl.body.error.code).toBe('shipping_unavailable')

    delete process.env.BITESHIP_API_KEY
    const noKey = await call('/shipping/rates', req({ items: cart, destination: { country: 'Indonesia', postalCode: '12410' } }))
    expect(noKey.status).toBe(503)
    process.env.BITESHIP_API_KEY = 'test-key'
  })

  it('Biteship error 5xx → 503, tanpa membocorkan detail', async () => {
    stubBiteship(500)
    const r = await call('/shipping/rates', req({ items: cart, destination: { country: 'Indonesia', postalCode: '12410' } }))
    expect(r.status).toBe(503)
    expect(JSON.stringify(r.body)).not.toContain('boom')
  })

  it('quote memakai tarif server; id tidak dikenal ditolak; tanpa tujuan ditolak', async () => {
    stubBiteship()
    const dest = { country: 'Indonesia', postalCode: '12410' }
    const ok = await call('/checkout/quote', req({ items: cart, shippingId: 'biteship:jne:reg', paymentId: 'test-s-pay', destination: dest }))
    expect(ok.status).toBe(200)
    expect(ok.body.shipping).toMatchObject({ id: 'biteship:jne:reg', name: 'JNE Reguler', price: 18500, etaDays: [1, 2] })
    expect(ok.body.total).toBe(550000 + 18500)

    const bad = await call('/checkout/quote', req({ items: cart, shippingId: 'biteship:jne:nope', paymentId: 'test-s-pay', destination: dest }))
    expect(bad.status).toBe(422)
    expect(bad.body.error.code).toBe('invalid_shipping')

    // Harga dari frontend tidak berpengaruh: hanya id yang dipercaya.
    const sneaky = await call('/checkout/quote', req({ items: cart, shippingId: 'biteship:jne:reg', paymentId: 'test-s-pay', destination: dest, shipping: 1 }))
    expect(sneaky.body.shipping.price).toBe(18500)
  })

  it('buat pesanan dengan tarif Biteship menyimpan id, nama, dan harga dari server', async () => {
    stubBiteship()
    const res = await createOrder(
      payload,
      { items: cart, contact: { email: 'ship@test.local' }, address: idAddress, shippingId: 'biteship:sicepat:reg', paymentId: 'test-s-pay' },
      { customer: null },
    )
    expect(res.order).toMatchObject({ shipping: 24000, shippingName: 'SiCepat Regular', total: 550000 + 24000 })
    const stored = (await payload.find({ collection: 'orders', where: { orderNumber: { equals: res.order.id } }, limit: 1, depth: 0 })).docs[0]!
    expect(stored.shippingId).toBe('biteship:sicepat:reg')
  })

  it('alamat luar negeri tidak butuh provinsi/kecamatan; alamat Indonesia tetap butuh', async () => {
    const intl = { firstName: 'Lee', phone: '+65 8123', street: '1 Orchard Rd', city: 'Singapore', postalCode: '018956', country: 'Singapore' }
    const ok = await createOrder(
      payload,
      { items: [{ slug: 'test-s-beans', variantId: 'SV-250', qty: 1 }], contact: { email: 'ship@test.local' }, address: intl, shippingId: 'test-s-fixed', paymentId: 'test-s-pay' },
      { customer: null },
    )
    expect(ok.order.address).toMatchObject({ country: 'Singapore', city: 'Singapore' })

    const { district: _d, ...noDistrict } = idAddress
    await expect(
      createOrder(
        payload,
        { items: [{ slug: 'test-s-beans', variantId: 'SV-250', qty: 1 }], contact: { email: 'ship@test.local' }, address: noDistrict, shippingId: 'test-s-fixed', paymentId: 'test-s-pay' },
        { customer: null },
      ),
    ).rejects.toMatchObject({ status: 422 })
  })
})
