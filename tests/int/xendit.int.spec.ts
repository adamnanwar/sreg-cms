// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { publicEndpoints } from '@/endpoints/public'
import { createOrder } from '@/lib/orders/create'
import { cancelOrder } from '@/lib/orders/lifecycle'

let payload: Payload
let categoryId: number | string
let mediaId: number | string
let xenditCalls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = []
let xenditStatus = 200
let invoiceSeq = 0

const webhook = publicEndpoints.find((e) => e.path === '/payments/webhook/:provider')!
const hook = async (body: unknown, token?: string) => {
  const res = (await (webhook.handler as (r: unknown) => Promise<Response>)({
    payload,
    headers: new Headers(token ? { 'x-callback-token': token } : {}),
    routeParams: { provider: 'xendit' },
    text: async () => JSON.stringify(body),
  })) as Response
  return { status: res.status, body: await res.json() }
}

const order = () =>
  createOrder(
    payload,
    {
      items: [{ slug: 'test-x-beans', variantId: 'XV-1', qty: 1 }],
      contact: { email: 'xendit@test.local' },
      address: { firstName: 'Nadia', phone: '+62 812', street: 'Jl. Cipete 18', province: 'DKI Jakarta', city: 'Jakarta Selatan', district: 'Cilandak', postalCode: '12410' },
      shippingId: 'test-x-fixed',
      paymentId: 'test-x-pay',
    },
    { customer: null },
  )

const statusOf = async (num: string) => (await payload.find({ collection: 'orders', where: { orderNumber: { equals: num } }, limit: 1, depth: 0 })).docs[0]!.status

describe('xendit', () => {
  beforeAll(async () => {
    delete process.env.LOYVERSE_ACCESS_TOKEN
    process.env.PAYMENT_PROVIDER = 'xendit'
    process.env.XENDIT_SECRET_KEY = 'xnd_development_secret'
    process.env.XENDIT_CALLBACK_TOKEN = 'cb-token'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        if (String(input).startsWith('https://api.xendit.co')) {
          xenditCalls.push({ url: String(input), headers: init?.headers as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : {} })
          if (String(input).includes('/expire!')) return new Response('{}', { status: 200 })
          return xenditStatus === 200
            ? new Response(JSON.stringify({ id: `inv_${++invoiceSeq}`, invoice_url: `https://checkout.xendit.co/web/inv_${invoiceSeq}` }), { status: 200 })
            : new Response('{"message":"secret detail"}', { status: xenditStatus })
        }
        return new Response('not found', { status: 404 })
      }),
    )
    payload = await getPayload({ config: await config })
    const skip = { context: { skipRebuild: true } }
    categoryId = (await payload.create({ collection: 'product-categories', data: { slug: 'test-x-cat', label: 'T' }, ...skip })).id
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()
    mediaId = (await payload.create({ collection: 'media', data: { alt: 't' }, file: { data: png, mimetype: 'image/png', name: `test-x-${Date.now()}.png`, size: png.length } })).id
    await payload.create({
      collection: 'products',
      ...skip,
      data: {
        category: categoryId,
        image: mediaId,
        _status: 'published',
        slug: 'test-x-beans',
        name: 'TEST XENDIT BEANS',
        loyverse: { itemId: 'T-X-1', active: true, price: 100000, taxIncluded: true, taxRate: 0, variants: [{ variantId: 'XV-1', price: 100000, stock: null, soldOut: false }] },
      },
    })
    await payload.create({ collection: 'users', data: { email: 'ops@test.local', password: 'Passw0rd!x', role: 'ops' } as never })
    await payload.create({ collection: 'payment-methods', data: { slug: 'test-x-pay', name: 'Card', type: 'card', fee: 0 } })
    await payload.create({ collection: 'shipping-methods', data: { slug: 'test-x-fixed', name: 'FIXED', minDays: 1, maxDays: 2, price: 15000 } })
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    delete process.env.XENDIT_SECRET_KEY
    delete process.env.XENDIT_CALLBACK_TOKEN
    const del = async (collection: string, where: object) => payload.delete({ collection: collection as never, where: where as never }).catch(() => undefined)
    const orders = await payload.find({ collection: 'orders', where: { 'contact.email': { equals: 'xendit@test.local' } }, pagination: false, depth: 0 })
    for (const o of orders.docs) await del('stock-reservations', { order: { equals: o.id } })
    await del('orders', { 'contact.email': { equals: 'xendit@test.local' } })
    await del('users', { email: { equals: 'ops@test.local' } })
    await del('payment-methods', { slug: { like: 'test-x-' } })
    await del('shipping-methods', { slug: { like: 'test-x-' } })
    await del('products', { slug: { like: 'test-x-' } })
    await del('media', { id: { equals: mediaId } })
    await del('product-categories', { slug: { equals: 'test-x-cat' } })
  })

  it('membuat invoice Xendit: auth Basic, jumlah dari server, instruksi berupa URL', async () => {
    xenditCalls = []
    const res = await order()
    const call = xenditCalls[0]!
    expect(call.url).toBe('https://api.xendit.co/v2/invoices')
    expect(call.headers.Authorization).toBe(`Basic ${Buffer.from('xnd_development_secret:').toString('base64')}`)
    expect(call.body).toMatchObject({ external_id: res.order.id, amount: 115000, currency: 'IDR', payment_methods: ['CREDIT_CARD'], payer_email: 'xendit@test.local' })
    expect(String(call.body.success_redirect_url)).toContain(`/order/${res.order.id}?token=`)
    expect(res.order.payment?.instructions).toMatchObject({ type: 'redirect', url: expect.stringContaining('https://checkout.xendit.co/web/inv_'), provider: 'xendit', invoiceId: expect.stringMatching(/^inv_/) })
  })

  it('webhook: token salah ditolak; PAID menandai lunas; kirim ulang aman; EXPIRED tak membatalkan yang lunas', async () => {
    const num = (await order()).order.id
    expect((await hook({ id: 'inv_123', external_id: num, status: 'PAID' })).status).toBe(401)
    expect((await hook({ id: 'inv_123', external_id: num, status: 'PAID' }, 'salah')).status).toBe(401)
    expect((await hook({ id: 'inv_123', external_id: num, status: 'PAID' }, 'cb-token')).status).toBe(200)
    expect(await statusOf(num)).toBe('paid')
    expect((await hook({ id: 'inv_123', external_id: num, status: 'PAID' }, 'cb-token')).body.result).toBe('ignored')
    await hook({ id: 'inv_123', external_id: num, status: 'EXPIRED' }, 'cb-token')
    expect(await statusOf(num)).toBe('paid')

    const second = (await order()).order.id
    await hook({ id: 'inv_456', external_id: second, status: 'EXPIRED' }, 'cb-token')
    expect(await statusOf(second)).toBe('expired')
  })

  const fresh = async (num: string) => (await payload.find({ collection: 'orders', where: { orderNumber: { equals: num } }, limit: 1, depth: 0 })).docs[0]!
  const invoiceOf = async (num: string) => (await fresh(num)).payment?.providerRef as string
  const refundCalls = () => xenditCalls.filter((c) => c.url.endsWith('/refunds'))
  const paid = async () => {
    const num = (await order()).order.id
    await hook({ id: await invoiceOf(num), external_id: num, status: 'PAID' }, 'cb-token')
    return num
  }

  it('batal sebelum bayar: invoice Xendit di-expire; pelanggan tidak bisa membatalkan pesanan yang sudah dibayar', async () => {
    const num = (await order()).order.id
    const inv = await invoiceOf(num)
    xenditCalls = []
    await cancelOrder(payload, await fresh(num))
    expect(xenditCalls.map((c) => c.url)).toEqual([`https://api.xendit.co/invoices/${inv}/expire!`])
    expect((await fresh(num)).needsRefund).toBeFalsy()

    const p = await paid()
    await expect(cancelOrder(payload, await fresh(p))).rejects.toMatchObject({ status: 409, code: 'cannot_cancel' })
    expect(await statusOf(p)).toBe('paid')
  })

  it('admin membatalkan pesanan berbayar: perlu refund, admin diberi notifikasi, tidak ada refund otomatis', async () => {
    const sent = vi.spyOn(payload, 'sendEmail')
    const num = await paid()
    xenditCalls = []
    sent.mockClear()
    await payload.update({ collection: 'orders', id: (await fresh(num)).id, data: { status: 'cancelled' } })
    expect((await fresh(num)).needsRefund).toBe(true)
    expect(refundCalls()).toHaveLength(0)
    const mail = sent.mock.calls.map((c) => c[0] as { to: string[]; subject: string }).find((m) => m.subject.includes(num))!
    expect(mail.to).toContain('ops@test.local')
    sent.mockRestore()
  })

  it('refund dari dashboard Xendit → status pesanan otomatis refunded', async () => {
    const num = await paid()
    await payload.update({ collection: 'orders', id: (await fresh(num)).id, data: { status: 'cancelled' } })
    const inv = await invoiceOf(num)

    // Gagal/pending diabaikan; sebagian hanya dicatat.
    await hook({ event: 'refund.failed', data: { invoice_id: inv, status: 'FAILED', amount: 115000 } }, 'cb-token')
    expect(await statusOf(num)).toBe('cancelled')
    await hook({ event: 'refund.succeeded', data: { invoice_id: inv, status: 'SUCCEEDED', amount: 5000 } }, 'cb-token')
    expect(await statusOf(num)).toBe('cancelled')
    expect((await fresh(num)).needsRefund).toBe(true)

    expect((await hook({ event: 'refund.succeeded', data: { invoice_id: inv, status: 'SUCCEEDED', amount: 115000 } }, 'cb-token')).status).toBe(200)
    const done = await fresh(num)
    expect(done.status).toBe('refunded')
    expect(done.needsRefund).toBe(false)
    expect(done.internalNotes).toContain('Refund penuh dikonfirmasi')
    // Webhook ganda aman.
    expect((await hook({ event: 'refund.succeeded', data: { invoice_id: inv, status: 'SUCCEEDED', amount: 115000 } }, 'cb-token')).body.result).toBe('ignored')
    expect((await hook({ event: 'refund.succeeded', data: {} }, 'cb-token')).status).toBe(401)
  })

  it('refund pesanan yang sudah dikirim juga memperbarui status; token salah ditolak', async () => {
    const num = await paid()
    const inv = await invoiceOf(num)
    expect((await hook({ event: 'refund.succeeded', data: { invoice_id: inv, status: 'SUCCEEDED', amount: 115000 } }, 'salah')).status).toBe(401)
    await hook({ event: 'refund.succeeded', data: { invoice_id: inv, status: 'SUCCEEDED', amount: 115000 } }, 'cb-token')
    expect(await statusOf(num)).toBe('refunded')
  })

  it('bayar setelah pesanan kedaluwarsa: ditandai perlu refund dan admin diberi tahu', async () => {
    const sent = vi.spyOn(payload, 'sendEmail')
    const num = (await order()).order.id
    const inv = await invoiceOf(num)
    await hook({ id: inv, external_id: num, status: 'EXPIRED' }, 'cb-token')
    xenditCalls = []
    sent.mockClear()
    await hook({ id: inv, external_id: num, status: 'PAID' }, 'cb-token')
    expect(refundCalls()).toHaveLength(0)
    expect((await fresh(num)).needsRefund).toBe(true)
    expect(sent.mock.calls.some((c) => (c[0] as { subject: string }).subject.includes(num))).toBe(true)
    sent.mockRestore()
  })

  it('Xendit error → 502 payment_failed tanpa membocorkan detail', async () => {
    xenditStatus = 500
    await expect(order()).rejects.toMatchObject({ status: 502, code: 'payment_failed' })
    xenditStatus = 200
  })
})
