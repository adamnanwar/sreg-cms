// @vitest-environment node
import { createHmac } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { loyverseWebhookEndpoint } from '@/endpoints/loyverse'
import { syncLoyverse } from '@/lib/loyverse/sync'

let PNG: Buffer

const STORE = 'store-1'
let payload: Payload
let categoryId: number | string
let mediaId: number | string
const created: { collection: 'products' | 'media' | 'product-categories'; id: number | string }[] = []

const loyverseItems = (overrides: { sold?: boolean } = {}) => ({
  items: [
    {
      id: 'LV-BEANS',
      item_name: 'Test Beans',
      category_id: 'CAT-1',
      track_stock: true,
      tax_ids: ['tax-1'],
      variants: [
        { variant_id: 'V-250', sku: 'B250', option1_value: '250 g', default_price: 195000, stores: [{ store_id: STORE, price: 195000 }] },
        { variant_id: 'V-1K', sku: 'B1K', option1_value: '1 kg', default_price: 650000.4 },
      ],
    },
  ],
  cursor: undefined,
})

const stubLoyverse = (opts: { items?: unknown; stock?: Record<string, number> } = {}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: URL | string) => {
      const url = new URL(String(input))
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
      if (url.pathname.endsWith('/items')) return json(opts.items ?? loyverseItems())
      if (url.pathname.endsWith('/categories')) return json({ categories: [{ id: 'CAT-1', name: 'TEST CAT' }] })
      if (url.pathname.endsWith('/taxes')) return json({ taxes: [{ id: 'tax-1', type: 'INCLUDED', rate: 11 }] })
      if (url.pathname.endsWith('/inventory')) {
        const stock = opts.stock ?? { 'V-250': 2, 'V-1K': 0 }
        return json({ inventory_levels: Object.entries(stock).map(([variant_id, in_stock]) => ({ variant_id, store_id: STORE, in_stock })) })
      }
      return new Response('not found', { status: 404 })
    }),
  )
}

const makeProduct = async (slug: string, data: Record<string, unknown>) => {
  const doc = await payload.create({
    collection: 'products',
    data: { slug, name: slug, category: categoryId, image: mediaId, _status: 'published', ...data } as never,
    context: { skipRebuild: true },
  })
  created.push({ collection: 'products', id: doc.id })
  return doc
}

const publicSlugs = async () =>
  (await payload.find({ collection: 'products', overrideAccess: false, where: { slug: { like: 'test-' } }, limit: 50, depth: 0 })).docs.map(
    (d) => d.slug,
  )

describe('catalog', () => {
  beforeAll(async () => {
    process.env.LOYVERSE_ACCESS_TOKEN = 'test-token'
    process.env.LOYVERSE_STORE_ID = STORE
    payload = await getPayload({ config: await config })
    PNG = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#ffffff' } }).png().toBuffer()

    const cat = await payload.create({ collection: 'product-categories', data: { slug: 'test-cat', label: 'TEST' }, context: { skipRebuild: true } })
    created.push({ collection: 'product-categories', id: cat.id })
    categoryId = cat.id
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'test' },
      file: { data: PNG, mimetype: 'image/png', name: `test-${Date.now()}.png`, size: PNG.length },
    })
    created.push({ collection: 'media', id: media.id })
    mediaId = media.id
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    for (const { collection, id } of created.reverse()) await payload.delete({ collection, id }).catch(() => undefined)
    await payload.delete({ collection: 'loyverse-items', where: { itemId: { in: ['LV-BEANS', 'LV-NEW'] } } }).catch(() => undefined)
    await payload.delete({ collection: 'loyverse-categories', where: { categoryId: { equals: 'CAT-1' } } }).catch(() => undefined)
    await payload.delete({ collection: 'products', where: { 'loyverse.itemId': { equals: 'LV-NEW' } } }).catch(() => undefined)
  })

  it('publik hanya melihat produk terbit, tidak disembunyikan, dan aktif', async () => {
    await makeProduct('test-visible', { loyverse: { itemId: 'T-1' } })
    await makeProduct('test-hidden', { loyverse: { itemId: 'T-2' }, hidden: true })
    await makeProduct('test-inactive', { loyverse: { itemId: 'T-3', active: false } })
    await makeProduct('test-draft', { loyverse: { itemId: 'T-4' }, _status: 'draft' })

    expect(await publicSlugs()).toEqual(['test-visible'])

    const staff = await payload.find({ collection: 'products', where: { slug: { like: 'test-' } }, draft: true, limit: 50, depth: 0 })
    expect(staff.docs.map((d) => d.slug).sort()).toEqual(['test-draft', 'test-hidden', 'test-inactive', 'test-visible'])
  })

  it('sinkron Loyverse mengisi harga, pajak, stok; stok mentah tidak bocor ke publik', async () => {
    const p = await makeProduct('test-sync', { loyverse: { itemId: 'LV-BEANS' } })
    stubLoyverse()

    const result = await syncLoyverse(payload)
    expect(result.updated).toBeGreaterThanOrEqual(1)
    expect(result.warnings.join()).toContain('dibulatkan')

    const staff = await payload.findByID({ collection: 'products', id: p.id, depth: 0 })
    expect(staff.loyverse).toMatchObject({ price: 195000, taxIncluded: true, taxRate: 11, soldOut: false, active: true })
    expect(staff.loyverse?.variants?.map((v) => [v.variantId, v.price, v.stock, v.soldOut])).toEqual([
      ['V-250', 195000, 2, false],
      ['V-1K', 650000, 0, true],
    ])

    const pub = await payload.findByID({ collection: 'products', id: p.id, depth: 0, overrideAccess: false })
    expect(pub.loyverse?.price).toBe(195000)
    expect(pub.loyverse?.variants?.[0]?.stock).toBeUndefined()
    expect(pub.loyverse?.variants?.[0]?.soldOut).toBe(false)
  })

  it('sinkron tidak membuat versi baru dan idempoten', async () => {
    const p = await payload.find({ collection: 'products', where: { slug: { equals: 'test-sync' } }, limit: 1, depth: 0 })
    const id = p.docs[0]!.id
    const before = (await payload.findVersions({ collection: 'products', where: { parent: { equals: id } }, limit: 1 })).totalDocs
    stubLoyverse()
    const r = await syncLoyverse(payload)
    expect(r.updated).toBe(0)
    const after = (await payload.findVersions({ collection: 'products', where: { parent: { equals: id } }, limit: 1 })).totalDocs
    expect(after).toBe(before)
  })

  it('stok habis → soldOut; item hilang di Loyverse → produk disembunyikan dari publik', async () => {
    stubLoyverse({ stock: { 'V-250': 0, 'V-1K': 0 } })
    await syncLoyverse(payload)
    const p = await payload.find({ collection: 'products', where: { slug: { equals: 'test-sync' } }, limit: 1, depth: 0 })
    expect(p.docs[0]!.loyverse?.soldOut).toBe(true)

    stubLoyverse({ items: { items: [] } })
    await syncLoyverse(payload)
    expect(await publicSlugs()).not.toContain('test-sync')
  })

  it('webhook menolak tanda tangan salah dan menerima yang benar', async () => {
    process.env.LOYVERSE_WEBHOOK_SECRET = 'whsec'
    stubLoyverse({ items: { items: [] } })
    const body = JSON.stringify({ type: 'inventory_levels.update' })
    const call = (sig: string) =>
      loyverseWebhookEndpoint.handler({
        payload,
        text: async () => body,
        headers: new Headers({ 'x-loyverse-signature': sig }),
      } as never) as Promise<Response>

    expect((await call('salah')).status).toBe(401)
    const good = createHmac('sha1', 'whsec').update(body).digest('base64')
    expect((await call(good)).status).toBe(202)
  })

  it('centang tampilkan di web: kategori/item dicentang → produk draf dibuat; dicabut → disembunyikan', async () => {
    const twoItems = {
      items: [
        ...loyverseItems().items,
        { id: 'LV-NEW', item_name: 'Test Menu Baru', category_id: 'CAT-1', track_stock: false, variants: [{ variant_id: 'V-N', default_price: 25000 }] },
      ],
    }
    stubLoyverse({ items: twoItems })
    // Produk lama (LV-BEANS) otomatis tercentang; menu baru belum → belum ada produk.
    await syncLoyverse(payload)
    const find = (itemId: string) => payload.find({ collection: 'products', where: { 'loyverse.itemId': { equals: itemId } }, limit: 1, depth: 0 })
    expect((await find('LV-NEW')).totalDocs).toBe(0)
    const mirror = await payload.find({ collection: 'loyverse-items', where: { itemId: { in: ['LV-BEANS', 'LV-NEW'] } }, limit: 5, depth: 0 })
    expect(mirror.docs.find((d) => d.itemId === 'LV-BEANS')?.showOnWeb).toBe(true)
    expect(mirror.docs.find((d) => d.itemId === 'LV-NEW')?.showOnWeb).toBe(false)

    // Centang kategori → menu baru dibuatkan produk draf, aktif; sinkron ulang tidak menduplikasi.
    const cat = (await payload.find({ collection: 'loyverse-categories', where: { categoryId: { equals: 'CAT-1' } }, limit: 1, depth: 0 })).docs[0]!
    await payload.update({ collection: 'loyverse-categories', id: cat.id, data: { showOnWeb: true } })
    await syncLoyverse(payload)
    await syncLoyverse(payload)
    const created1 = await find('LV-NEW')
    expect(created1.totalDocs).toBe(1)
    expect(created1.docs[0]).toMatchObject({ _status: 'draft', slug: 'test-menu-baru' })
    expect(created1.docs[0]!.loyverse).toMatchObject({ active: true, price: 25000 })

    // Cabut centang kategori → menu baru disembunyikan; BEANS tetap karena item-nya sendiri dicentang.
    await payload.update({ collection: 'loyverse-categories', id: cat.id, data: { showOnWeb: false } })
    await syncLoyverse(payload)
    expect((await find('LV-NEW')).docs[0]!.loyverse?.active).toBe(false)
    expect((await find('LV-BEANS')).docs[0]!.loyverse?.active).toBe(true)
  })
})
