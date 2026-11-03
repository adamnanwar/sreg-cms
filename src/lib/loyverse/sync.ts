import { randomBytes } from 'node:crypto'
import type { Payload } from 'payload'

import { scheduleRebuild } from '../../hooks/triggerRebuild'
import { notifyBackInStock } from '../stockAlerts'
import { loyverse, type LoyverseItem, type LoyverseTax } from './client'
import { syncMenu } from './menu'

type SyncedVariant = {
  variantId: string
  sku?: string
  optionLabel?: string
  price: number
  stock: number | null
  soldOut: boolean
}

type SyncedFields = {
  active: boolean
  price: number
  variants: SyncedVariant[]
  taxIncluded: boolean
  taxRate: number
  soldOut: boolean
  lowStock: boolean
}

export type SyncResult = { total: number; updated: number; deactivated: number; unprofiled: number; warnings: string[] }

const rupiah = (n: number | null | undefined, warnings: string[], label: string): number => {
  const v = n ?? 0
  if (!Number.isInteger(v)) warnings.push(`${label}: harga desimal ${v} dibulatkan`)
  return Math.round(v)
}

function computeFields(
  item: LoyverseItem,
  storeId: string,
  stock: Map<string, number | null>,
  taxes: Map<string, LoyverseTax>,
  lowThreshold: number,
  warnings: string[],
): SyncedFields {
  const tracked = item.track_stock !== false
  const variants: SyncedVariant[] = item.variants.map((v) => {
    const storePrice = v.stores?.find((s) => s.store_id === storeId)?.price
    const price = rupiah(storePrice ?? v.default_price, warnings, `${item.item_name}/${v.sku ?? v.variant_id}`)
    const level = stock.get(v.variant_id) ?? null
    // Stok tidak dilacak → selalu tersedia.
    const soldOut = tracked ? (level ?? 0) <= 0 : false
    return {
      variantId: v.variant_id,
      sku: v.sku ?? undefined,
      optionLabel: [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ') || undefined,
      price,
      stock: tracked ? level : null,
      soldOut,
    }
  })

  const tax = item.tax_ids?.map((id) => taxes.get(id)).find(Boolean)
  const allSoldOut = variants.length > 0 && variants.every((v) => v.soldOut)
  const anyLow = tracked && variants.some((v) => !v.soldOut && v.stock != null && v.stock <= lowThreshold)

  return {
    active: !item.deleted_at,
    price: variants.length ? Math.min(...variants.map((v) => v.price)) : 0,
    variants,
    taxIncluded: tax ? tax.type === 'INCLUDED' : true,
    taxRate: tax?.rate ?? 0,
    soldOut: allSoldOut,
    lowStock: anyLow,
  }
}

// Bandingkan tanpa `id` baris array dan tanpa null/undefined (DB mengembalikan null untuk kolom kosong).
const normalize = (v: unknown): string =>
  JSON.stringify(v, (key, val) => (key === 'id' || val === null ? undefined : val))
const same = (a: unknown, b: unknown): boolean => normalize(a) === normalize(b)

// Menulis lewat adapter DB melewati hook Payload yang biasanya membuat id baris array.
const rowId = (): string => randomBytes(12).toString('hex')

/** Sinkron penuh item/harga/pajak/stok dari Loyverse ke cache `products.loyverse`. */
export async function syncLoyverse(payload: Payload): Promise<SyncResult> {
  const result: SyncResult = { total: 0, updated: 0, deactivated: 0, unprofiled: 0, warnings: [] }

  const integrations = await payload.findGlobal({ slug: 'integrations', depth: 0 })
  const storeId = integrations.loyverse?.storeId || process.env.LOYVERSE_STORE_ID
  const lowThreshold = integrations.loyverse?.lowStockThreshold ?? 5

  try {
    if (!storeId) throw new Error('storeId Loyverse belum diisi (integrations.loyverse.storeId atau LOYVERSE_STORE_ID)')

    const [items, categories, taxList, levels] = await Promise.all([
      loyverse.items(),
      loyverse.categories(),
      loyverse.taxes(),
      loyverse.inventory(storeId),
    ])
    const taxes = new Map(taxList.map((t) => [t.id, t]))
    const stock = new Map(levels.map((l) => [l.variant_id, l.in_stock]))
    const byId = new Map(items.map((i) => [i.id, i]))
    result.total = items.length

    let listChanged = false
    const products = await payload.find({
      collection: 'products',
      limit: 1000,
      depth: 0,
      pagination: false,
      select: { loyverse: true, slug: true, name: true, _status: true },
    })
    // Cermin menu + produk draf untuk item yang dicentang "tampilkan di web".
    const menu = await syncMenu(payload, items, categories, storeId, products.docs)
    products.docs.push(...(menu.created as typeof products.docs))
    if (menu.created.length) listChanged = true
    const profiled = new Set<string>()
    const restocked: { id: number | string; slug: string; name: string }[] = []

    for (const product of products.docs) {
      const itemId = product.loyverse?.itemId
      if (!itemId) continue
      profiled.add(itemId)

      const item = byId.get(itemId)
      // Item hilang dari Loyverse → nonaktif (disembunyikan dari API publik, tidak dihapus).
      // Item yang tidak dicentang "tampilkan di web" juga disembunyikan, tetapi cache harga/stok tetap diperbarui.
      const next: SyncedFields | { active: false } = item
        ? { ...computeFields(item, storeId, stock, taxes, lowThreshold, result.warnings), active: menu.selected.has(itemId) && !item.deleted_at }
        : { active: false }

      const prev = product.loyverse ?? {}
      const changed = Object.entries(next).some(([k, v]) => !same((prev as Record<string, unknown>)[k], v))
      if (!changed) continue

      if (prev.active !== next.active) {
        listChanged = true
        if (!next.active) result.deactivated++
      }
      // Tulis langsung lewat adapter DB: tanpa validasi/hook dan tanpa membuat versi baru
      // (cache ini berubah tiap beberapa menit dan harus mengenai dokumen yang terbit).
      await payload.db.updateOne({
        collection: 'products',
        id: product.id,
        data: {
          loyverse: {
            ...prev,
            ...next,
            ...('variants' in next ? { variants: next.variants.map((v) => ({ ...v, id: rowId() })) } : {}),
            syncedAt: new Date().toISOString(),
          },
        },
        req: { payload } as never,
      })
      result.updated++
      // Stok kembali dari habis → kabari pendaftar notifikasi stok.
      if (prev.soldOut && 'soldOut' in next && !next.soldOut && product._status === 'published') {
        restocked.push({ id: product.id, slug: product.slug, name: product.name })
      }
    }
    for (const p of restocked) await notifyBackInStock(payload, p).catch((err) => result.warnings.push(`notifikasi stok ${p.slug}: ${err}`))

    const unprofiled = items.filter((i) => !i.deleted_at && menu.selected.has(i.id) && !profiled.has(i.id))
    result.unprofiled = unprofiled.length
    if (listChanged) scheduleRebuild()

    await payload.updateGlobal({
      slug: 'integrations',
      data: {
        loyverse: {
          ...integrations.loyverse,
          lastFullSyncAt: new Date().toISOString(),
          lastError: result.warnings.join('\n') || null,
          lastSummary: `${result.total} item, ${menu.selected.size} tampil di web, ${menu.created.length} produk draf baru, ${result.updated} diperbarui`,
          unprofiled: unprofiled.map((i) => ({ itemId: i.id, name: i.item_name })),
        },
      },
      context: { skipRebuild: true },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    payload.logger.error(`[loyverse] sinkron gagal: ${message}`)
    await payload.updateGlobal({
      slug: 'integrations',
      data: { loyverse: { ...integrations.loyverse, lastError: message } },
      context: { skipRebuild: true },
    })
    throw err
  }
  return result
}
