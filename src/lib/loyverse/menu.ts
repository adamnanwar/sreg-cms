import type { Payload } from 'payload'

import type { Product } from '../../payload-types'
import type { LoyverseCategory, LoyverseItem } from './client'

type ProductRef = Pick<Product, 'id' | 'slug' | 'name' | '_status' | 'loyverse'>

export type MenuSyncResult = {
  /** itemId item yang boleh tampil di web (item atau kategorinya dicentang). */
  selected: Set<string>
  created: ProductRef[]
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'

const minPrice = (item: LoyverseItem, storeId: string): number => {
  const prices = item.variants.map((v) => Math.round(v.stores?.find((s) => s.store_id === storeId)?.price ?? v.default_price ?? 0))
  return prices.length ? Math.min(...prices) : 0
}

/**
 * Menyamakan cermin `loyverse-categories` / `loyverse-items` dengan Loyverse (centang pengguna dipertahankan),
 * lalu membuat produk draf untuk item yang dicentang tetapi belum punya produk.
 * Item baru otomatis tercentang bila sudah punya produk, supaya produk lama tidak hilang dari web.
 */
export async function syncMenu(
  payload: Payload,
  items: LoyverseItem[],
  categories: LoyverseCategory[],
  storeId: string,
  products: ProductRef[],
): Promise<MenuSyncResult> {
  const ctx = { skipRebuild: true }
  const productByItem = new Map(products.flatMap((p) => (p.loyverse?.itemId ? [[p.loyverse.itemId, p] as const] : [])))

  // --- kategori
  const catDocs = (await payload.find({ collection: 'loyverse-categories', limit: 0, pagination: false, depth: 0 })).docs
  const catById = new Map(catDocs.map((c) => [c.categoryId, c]))
  for (const c of categories) {
    if (c.deleted_at) continue
    const existing = catById.get(c.id)
    if (!existing) {
      catById.set(c.id, await payload.create({ collection: 'loyverse-categories', data: { categoryId: c.id, name: c.name }, context: ctx }))
    } else if (existing.name !== c.name) {
      await payload.update({ collection: 'loyverse-categories', id: existing.id, data: { name: c.name }, context: ctx })
    }
  }

  // --- item
  const itemDocs = (await payload.find({ collection: 'loyverse-items', limit: 0, pagination: false, depth: 0 })).docs
  const itemById = new Map(itemDocs.map((d) => [d.itemId, d]))
  const seen = new Set<string>()
  const selected = new Set<string>()
  const created: ProductRef[] = []
  const slugs = new Set(products.map((p) => p.slug))

  for (const item of items) {
    if (item.deleted_at) continue
    seen.add(item.id)
    const cat = item.category_id ? catById.get(item.category_id) : undefined
    const synced = {
      name: item.item_name,
      categoryId: item.category_id ?? null,
      categoryName: cat?.name ?? null,
      minPrice: minPrice(item, storeId),
      variantCount: item.variants.length,
      missing: false,
    }
    const product = productByItem.get(item.id)

    let doc = itemById.get(item.id)
    if (!doc) {
      doc = await payload.create({
        collection: 'loyverse-items',
        data: { itemId: item.id, ...synced, showOnWeb: !!product, product: product?.id },
        context: ctx,
      })
    } else {
      const linked = typeof doc.product === 'object' ? doc.product?.id : doc.product
      const newLink = !!product && linked !== product.id
      const changed = newLink || (Object.keys(synced) as (keyof typeof synced)[]).some((k) => (doc![k] ?? null) !== synced[k])
      if (changed) {
        doc = await payload.update({
          collection: 'loyverse-items',
          id: doc.id,
          // Produk yang baru dibuat/ditautkan manual oleh editor langsung dianggap tampil.
          data: { ...synced, ...(product ? { product: product.id } : {}), ...(newLink && !linked ? { showOnWeb: true } : {}) },
          context: ctx,
        })
      }
    }

    if (!(doc.showOnWeb || cat?.showOnWeb)) continue
    selected.add(item.id)
    if (product) continue

    // Produk draf: foto dan teks dilengkapi editor sebelum terbit.
    let slug = slugify(item.item_name)
    if (slugs.has(slug)) slug = `${slug}-${item.id.slice(0, 6)}`
    slugs.add(slug)
    const webCategory = typeof cat?.webCategory === 'object' ? cat.webCategory?.id : cat?.webCategory
    const p = await payload.create({
      collection: 'products',
      draft: true,
      data: { slug, name: item.item_name, category: webCategory, loyverse: { itemId: item.id } } as never,
      context: ctx,
    })
    created.push(p)
    await payload.update({ collection: 'loyverse-items', id: doc.id, data: { product: p.id }, context: ctx })
  }

  // --- item yang sudah hilang dari Loyverse
  for (const d of itemDocs) {
    if (!seen.has(d.itemId) && !d.missing) {
      await payload.update({ collection: 'loyverse-items', id: d.id, data: { missing: true }, context: ctx })
    }
  }

  return { selected, created }
}
