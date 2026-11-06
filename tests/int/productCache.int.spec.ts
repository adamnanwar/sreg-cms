// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { syncLoyverse } from '@/lib/loyverse/sync'

const STORE = 'store-1'
let payload: Payload
let adminId: number | string
let mediaId: number | string
let categoryId: number | string

const stub = (price: number) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: URL | string) => {
      const url = new URL(String(input))
      const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 })
      if (url.pathname.endsWith('/items'))
        return json({ items: [{ id: 'LV-PC', item_name: 'Cache Test', category_id: 'CAT-PC', track_stock: true, variants: [{ variant_id: 'VPC', sku: 'PC', default_price: price, stores: [{ store_id: STORE, price }] }] }] })
      if (url.pathname.endsWith('/categories')) return json({ categories: [{ id: 'CAT-PC', name: 'PC CAT' }] })
      if (url.pathname.endsWith('/taxes')) return json({ taxes: [] })
      if (url.pathname.endsWith('/inventory')) return json({ inventory_levels: [{ variant_id: 'VPC', store_id: STORE, in_stock: 5 }] })
      return new Response('nf', { status: 404 })
    }),
  )

const cleanup = async () => {
  await payload.delete({ collection: 'products', where: { 'loyverse.itemId': { equals: 'LV-PC' } } })
  await payload.delete({ collection: 'loyverse-items', where: { itemId: { equals: 'LV-PC' } } })
  await payload.delete({ collection: 'loyverse-categories', where: { categoryId: { equals: 'CAT-PC' } } })
}

describe('cache Loyverse di produk draf dan terbit', () => {
  beforeAll(async () => {
    process.env.LOYVERSE_ACCESS_TOKEN = 'test-token'
    process.env.LOYVERSE_STORE_ID = STORE
    payload = await getPayload({ config: await config })
    await cleanup()
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()
    mediaId = (await payload.create({ collection: 'media', data: { alt: 't' }, file: { data: png, mimetype: 'image/png', name: `pc-${Date.now()}.png`, size: png.length } })).id
    categoryId = (
      (await payload.find({ collection: 'product-categories', where: { slug: { equals: 'pc-cat' } }, limit: 1 })).docs[0] ??
      (await payload.create({ collection: 'product-categories', data: { slug: 'pc-cat', label: 'PC' } }))
    ).id
    adminId = (await payload.create({ collection: 'users', data: { email: `pc-${Date.now()}@t.local`, password: 'Passw0rd!x', role: 'admin' } as never })).id
  })
  afterAll(async () => {
    vi.unstubAllGlobals()
    await cleanup()
    await payload.delete({ collection: 'users', id: adminId }).catch(() => undefined)
    await payload.delete({ collection: 'media', id: mediaId }).catch(() => undefined)
    await payload.delete({ collection: 'product-categories', id: categoryId }).catch(() => undefined)
  })

  const draftOf = async () =>
    (await payload.find({ collection: 'products', where: { 'loyverse.itemId': { equals: 'LV-PC' } }, draft: true, limit: 1, depth: 0 })).docs[0]
  const mainOf = async (id: number | string) => payload.findByID({ collection: 'products', id, depth: 0 })
  const publicOf = async () =>
    (await payload.find({ collection: 'products', overrideAccess: false, where: { 'loyverse.itemId': { equals: 'LV-PC' } }, limit: 1, depth: 0 })).docs[0]
  const versionCount = async (id: number | string) =>
    (await payload.findVersions({ collection: 'products', where: { parent: { equals: id } }, limit: 0, pagination: false, depth: 0 })).docs.length

  it('harga tampil di versi draf (yang dibaca form admin), lewat penerbitan, dan di API publik', async () => {
    stub(32000)
    await syncLoyverse(payload) // cermin menu
    const row = (await payload.find({ collection: 'loyverse-items', where: { itemId: { equals: 'LV-PC' } }, limit: 1 })).docs[0]
    await payload.update({ collection: 'loyverse-items', id: row.id, data: { showOnWeb: true } })
    await syncLoyverse(payload) // buat produk draf + isi cache

    const draft = await draftOf()
    expect(draft.loyverse?.price).toBe(32000) // sebelumnya null: form admin membaca versi
    expect(draft.loyverse?.variants?.[0]?.variantId).toBe('VPC')
    expect(draft.loyverse?.syncedAt).toBeTruthy()
    const versions = await versionCount(draft.id)

    // admin mengisi kategori + foto lalu Publish, dengan data form yang dibaca dari versi terbaru
    const form = await payload.findByID({ collection: 'products', id: draft.id, draft: true, depth: 0 })
    await payload.update({
      collection: 'products',
      id: draft.id,
      draft: false,
      overrideAccess: false,
      user: { id: adminId, collection: 'users', role: 'admin' } as never,
      data: { ...form, category: categoryId, image: mediaId, _status: 'published' } as never,
      context: { skipRebuild: true },
    })
    expect((await mainOf(draft.id)).loyverse?.price).toBe(32000) // tidak jatuh ke null sampai sinkron berikutnya
    expect((await publicOf())?.loyverse?.price).toBe(32000)

    // harga berubah di Loyverse: sinkron memperbarui tabel utama dan versi, tanpa menambah versi
    const before = await versionCount(draft.id)
    stub(35000)
    await syncLoyverse(payload)
    expect((await mainOf(draft.id)).loyverse?.price).toBe(35000)
    expect((await draftOf()).loyverse?.price).toBe(35000)
    expect(await versionCount(draft.id)).toBe(before)
    expect(before).toBeGreaterThanOrEqual(versions)
  })
  it('versi draf yang tertinggal (data lama) dipulihkan oleh sinkron walau harga tidak berubah', async () => {
    const draft = await draftOf()
    const latest = (await payload.findVersions({ collection: 'products', where: { parent: { equals: draft.id } }, sort: '-updatedAt', limit: 1, depth: 0 })).docs[0]
    await payload.db.updateVersion({ collection: 'products', id: latest.id, versionData: { version: { loyverse: { itemId: 'LV-PC', price: null, syncedAt: null } } } as never })
    expect((await draftOf()).loyverse?.price ?? null).toBeNull()

    stub(35000) // sama dengan sinkron sebelumnya: tidak ada perubahan di tabel utama
    await syncLoyverse(payload)
    expect((await draftOf()).loyverse?.price).toBe(35000)
  })
})
