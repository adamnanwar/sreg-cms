import type { Payload } from 'payload'

import type { Product } from '../../payload-types'
import { sellableWhere, type QuoteItemInput } from '../checkout/quote'
import { ApiError } from '../http'
import { biteshipConfigured, biteshipProvider } from './biteship'
import { fedexConfigured, fedexProvider } from './fedex'
import { isDomestic, type Destination, type Origin, type ShippingProvider, type ShippingRate } from './types'

export type { Destination, ShippingRate } from './types'

const DEFAULT_COURIERS = 'jne,sicepat,anteraja'

type ShippingSettings = {
  origin: Origin
  couriers: string
  packagingGrams: number
  defaultItemGrams: number
}

async function settings(payload: Payload): Promise<ShippingSettings> {
  const s = (await payload.findGlobal({ slug: 'integrations', depth: 0 })).shipping
  return {
    origin: {
      name: s?.originName ?? undefined,
      phone: s?.originPhone ?? undefined,
      address: s?.originAddress ?? undefined,
      postalCode: s?.originPostalCode ?? undefined,
      areaId: s?.originAreaId ?? undefined,
      country: 'ID',
    },
    couriers: (s?.couriers || DEFAULT_COURIERS).replace(/\s+/g, ''),
    packagingGrams: s?.packagingGrams ?? 100,
    defaultItemGrams: s?.defaultItemGrams ?? 250,
  }
}

/** True bila ada penyedia yang bisa melayani tujuan ini (kunci API terpasang). */
export const shippingAvailable = (destination: Destination): boolean =>
  isDomestic(destination.country) ? biteshipConfigured() : fedexConfigured()

/** Berat (gram) dan nilai (Rupiah) isi keranjang. Varian, lalu produk, lalu bawaan. Produk tak dikenal dilewati (quote yang menolaknya). */
export async function cartParcel(payload: Payload, items: QuoteItemInput[]): Promise<{ weightGrams: number; valueIdr: number }> {
  const slugs = [...new Set(items.map((i) => i?.slug).filter((s): s is string => typeof s === 'string'))]
  if (!slugs.length) return { weightGrams: 0, valueIdr: 0 }
  const { defaultItemGrams, packagingGrams } = await settings(payload)
  const found = await payload.find({ collection: 'products', where: sellableWhere({ slug: { in: slugs } }), depth: 0, limit: slugs.length, pagination: false })
  const bySlug = new Map<string, Product>(found.docs.map((p) => [p.slug, p]))
  let weight = 0
  let value = 0
  for (const it of items) {
    if (!it) continue
    const p = bySlug.get(it.slug)
    const qty = Number(it.qty)
    if (!p || !Number.isInteger(qty) || qty < 1) continue
    const variants = p.loyverse?.variants ?? []
    const v = it.variantId ? variants.find((x) => x.variantId === it.variantId) : variants.length === 1 ? variants[0] : undefined
    const perUnit = (v && p.variantWeights?.find((w) => w.variantId === v.variantId)?.weightGrams) || p.weightGrams || defaultItemGrams
    weight += perUnit * qty
    value += (v?.price ?? 0) * qty
  }
  return { weightGrams: weight + packagingGrams, valueIdr: value }
}

/** Semua tarif yang tersedia untuk tujuan dan isi keranjang, termurah dulu. */
export async function getRates(payload: Payload, input: { items: QuoteItemInput[]; destination: Destination }): Promise<ShippingRate[]> {
  const { destination } = input
  const cfg = await settings(payload)
  const providers: ShippingProvider[] = [biteshipProvider(cfg.couriers), fedexProvider]
  const provider = providers.find((p) => p.supports(destination))
  if (!provider || !shippingAvailable(destination)) throw new ApiError(503, 'shipping_unavailable', 'Pengiriman ke tujuan ini belum tersedia.')
  const parcel = await cartParcel(payload, input.items)
  if (parcel.weightGrams <= 0) throw new ApiError(422, 'validation_error', 'Keranjang kosong.', { items: 'Minimal 1 item' })
  const rates = await provider.rates({ origin: cfg.origin, destination, ...parcel })
  return rates.sort((a, b) => a.price - b.price)
}

/** Tarif yang dipilih pembeli, dihitung ulang di server. Bukan harga dari frontend. */
export async function resolveRate(payload: Payload, input: { items: QuoteItemInput[]; destination: Destination; shippingId: string }): Promise<ShippingRate> {
  const rate = (await getRates(payload, input)).find((r) => r.id === input.shippingId)
  if (!rate) throw new ApiError(422, 'invalid_shipping', 'Metode pengiriman tidak tersedia lagi. Pilih ulang.', { shippingId: 'Tidak valid' })
  return rate
}

/** `biteship:jne:reg` dan sejenisnya = tarif penyedia; selain itu = metode tetap di koleksi shipping-methods. */
export const isProviderRateId = (id: string | undefined): boolean => !!id && /^(biteship|fedex):/.test(id)

export const parseDestination = (raw: unknown): Destination => {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string).trim().slice(0, 100) || undefined : undefined)
  return { country: s('country') ?? 'Indonesia', postalCode: s('postalCode'), city: s('city'), province: s('province'), areaId: s('areaId') }
}
