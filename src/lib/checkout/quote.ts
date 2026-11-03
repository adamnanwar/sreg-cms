import type { Payload, PayloadRequest, Where } from 'payload'

import { ApiError } from '../http'

export type QuoteItemInput = { slug: string; variantId?: string; option?: string; qty: number }
export type QuoteInput = {
  items: QuoteItemInput[]
  shippingId?: string
  paymentId?: string
  discountCode?: string
  locale?: 'en' | 'id'
}

export type QuoteLine = {
  productId: number | string
  slug: string
  name: string
  variantId: string
  sku?: string
  variantLabel?: string
  option?: string
  unit?: string
  image?: string
  unitPrice: number
  qty: number
  lineTotal: number
  tax: number
  taxIncluded: boolean
  inStock: boolean
}

export type Quote = {
  lines: QuoteLine[]
  subtotal: number
  discount: { code: string; amount: number } | null
  discountCodeId?: number | string
  shipping: { id: string; name: string; price: number; etaDays: [number, number] } | null
  paymentFee: number
  paymentMethod: { id: string; type: string } | null
  tax: number
  taxIncluded: boolean
  total: number
}

/** Produk yang boleh dijual: terbit, tidak disembunyikan, aktif di Loyverse. */
export const sellableWhere = (extra: Where): Where => ({
  and: [
    extra,
    { _status: { equals: 'published' } },
    { hidden: { not_equals: true } },
    { 'loyverse.active': { not_equals: false } },
  ],
})

const MAX_LINES = 50
const MAX_QTY = 99

/** Jumlah per varian yang sedang dicadangkan atau sudah dibayar tetapi belum tercatat di Loyverse. */
export async function reservedByVariant(
  payload: Payload,
  variantIds: string[],
  req?: Partial<PayloadRequest>,
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!variantIds.length) return out
  const res = await payload.find({
    collection: 'stock-reservations',
    where: { and: [{ variantId: { in: variantIds } }, { status: { in: ['active', 'committed'] } }] },
    pagination: false,
    depth: 0,
    req: req as PayloadRequest,
  })
  for (const r of res.docs) out.set(r.variantId, (out.get(r.variantId) ?? 0) + r.qty)
  return out
}

/**
 * Hitung ulang semua angka dari server. Frontend hanya mengirim slug/varian/opsi/qty.
 * `liveStock` (opsional) menimpa stok cache dengan stok langsung dari Loyverse.
 */
export async function buildQuote(
  payload: Payload,
  input: QuoteInput,
  opts: { liveStock?: Map<string, number | null>; req?: Partial<PayloadRequest> } = {},
): Promise<Quote> {
  const locale = input.locale === 'id' ? 'id' : 'en'
  const req = opts.req as PayloadRequest | undefined

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError(422, 'validation_error', 'Keranjang kosong.', { items: 'Minimal 1 item' })
  }
  if (input.items.length > MAX_LINES) throw new ApiError(422, 'validation_error', 'Terlalu banyak item.', { items: `Maksimal ${MAX_LINES}` })

  // Gabungkan baris identik agar pengecekan stok memakai total.
  const wanted = new Map<string, QuoteItemInput>()
  for (const [i, it] of input.items.entries()) {
    const qty = Number(it?.qty)
    if (!it || typeof it.slug !== 'string' || !it.slug) {
      throw new ApiError(422, 'validation_error', 'Item tidak valid.', { [`items.${i}.slug`]: 'Wajib diisi' })
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new ApiError(422, 'validation_error', 'Jumlah tidak valid.', { [`items.${i}.qty`]: `Antara 1 dan ${MAX_QTY}` })
    }
    const key = `${it.slug}|${it.variantId ?? ''}|${(it.option ?? '').toLowerCase()}`
    const prev = wanted.get(key)
    wanted.set(key, { ...it, qty: (prev?.qty ?? 0) + qty })
  }

  const slugs = [...new Set([...wanted.values()].map((w) => w.slug))]
  const products = await payload.find({
    collection: 'products',
    where: sellableWhere({ slug: { in: slugs } }),
    depth: 1,
    limit: slugs.length,
    locale,
    fallbackLocale: 'en',
    req,
  })
  const bySlug = new Map(products.docs.map((p) => [p.slug, p]))

  // Pilih varian dulu agar reservasi bisa diambil sekali.
  type Resolved = { want: QuoteItemInput; product: (typeof products.docs)[number]; variant: NonNullable<NonNullable<(typeof products.docs)[number]['loyverse']>['variants']>[number] }
  const resolved: Resolved[] = []
  for (const want of wanted.values()) {
    const product = bySlug.get(want.slug)
    if (!product) throw new ApiError(422, 'product_unavailable', `Produk tidak tersedia: ${want.slug}`, { slug: want.slug })
    const variants = product.loyverse?.variants ?? []
    let variant = want.variantId ? variants.find((v) => v.variantId === want.variantId) : undefined
    if (!variant && !want.variantId) {
      if (variants.length === 1) variant = variants[0]
      else if (variants.length > 1) {
        throw new ApiError(422, 'variant_required', `Pilih varian untuk ${product.name}.`, { variantId: 'Wajib diisi' })
      }
    }
    if (!variant) throw new ApiError(422, 'product_unavailable', `Varian tidak tersedia: ${want.slug}`, { slug: want.slug })
    resolved.push({ want, product, variant })
  }

  const reserved = await reservedByVariant(payload, [...new Set(resolved.map((r) => r.variant.variantId))], opts.req)
  // Total qty per varian (beberapa baris bisa varian yang sama dengan opsi beda).
  const qtyByVariant = new Map<string, number>()
  for (const r of resolved) qtyByVariant.set(r.variant.variantId, (qtyByVariant.get(r.variant.variantId) ?? 0) + r.want.qty)

  const lines: QuoteLine[] = []
  let taxIncludedPart = 0
  let taxAddedPart = 0
  for (const { want, product, variant } of resolved) {
    // Opsi baris pesanan (mis. Grind) tidak mengubah harga/stok.
    const choices = (product.lineOptions?.choices ?? []).map((c) => c.label)
    let option: string | undefined
    if (choices.length) {
      if (!want.option) throw new ApiError(422, 'option_required', `Pilih ${product.lineOptions?.label ?? 'opsi'}.`, { option: 'Wajib diisi' })
      option = choices.find((c) => c.toLowerCase() === want.option!.toLowerCase())
      if (!option) throw new ApiError(422, 'invalid_option', 'Opsi tidak valid.', { option: `Pilihan: ${choices.join(', ')}` })
    } else if (want.option) {
      throw new ApiError(422, 'invalid_option', 'Produk ini tidak punya opsi.', { option: 'Tidak berlaku' })
    }

    // Stok: null = tidak dilacak = selalu tersedia.
    const live = opts.liveStock?.get(variant.variantId)
    const stock = opts.liveStock?.has(variant.variantId) ? live : variant.stock
    if (stock !== null && stock !== undefined) {
      const available = stock - (reserved.get(variant.variantId) ?? 0)
      const totalWanted = qtyByVariant.get(variant.variantId) ?? want.qty
      if (totalWanted > available) {
        throw new ApiError(409, 'out_of_stock', `Stok tidak cukup untuk ${product.name}.`, {
          qty: `Maksimal ${Math.max(0, available)}`,
        })
      }
    } else if (variant.soldOut) {
      throw new ApiError(409, 'out_of_stock', `${product.name} habis.`, { qty: 'Habis' })
    }

    const unitPrice = variant.price ?? 0
    const lineTotal = unitPrice * want.qty
    const rate = product.loyverse?.taxRate ?? 0
    const included = product.loyverse?.taxIncluded ?? true
    const tax = included ? Math.round((lineTotal * rate) / (100 + rate)) : Math.round((lineTotal * rate) / 100)
    if (included) taxIncludedPart += tax
    else taxAddedPart += tax

    const image = product.image && typeof product.image === 'object' ? (product.image.sizes?.thumb?.url ?? product.image.url ?? undefined) : undefined
    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantId: variant.variantId,
      sku: variant.sku ?? undefined,
      variantLabel: product.variantLabels?.find((l) => l.variantId === variant.variantId)?.label ?? variant.optionLabel ?? undefined,
      option,
      unit: product.unit ?? undefined,
      image,
      unitPrice,
      qty: want.qty,
      lineTotal,
      tax,
      taxIncluded: included,
      inStock: true,
    })
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)

  // ---- Diskon ----
  let discount: Quote['discount'] = null
  let discountCodeId: Quote['discountCodeId']
  if (input.discountCode) {
    const code = String(input.discountCode).trim().toUpperCase()
    const found = await payload.find({ collection: 'discount-codes', where: { code: { equals: code } }, limit: 1, depth: 0, req })
    const dc = found.docs[0]
    const now = Date.now()
    const bad = (msg: string) => new ApiError(422, 'invalid_discount', msg, { discountCode: msg })
    if (!dc || !dc.active) throw bad('Kode diskon tidak valid.')
    if (dc.startAt && Date.parse(dc.startAt) > now) throw bad('Kode diskon belum berlaku.')
    if (dc.endAt && Date.parse(dc.endAt) < now) throw bad('Kode diskon sudah berakhir.')
    if (dc.minSubtotal && subtotal < dc.minSubtotal) throw bad(`Minimal belanja IDR ${dc.minSubtotal}.`)
    if (dc.maxUses != null && (dc.usedCount ?? 0) >= dc.maxUses) throw bad('Kuota kode diskon habis.')
    const amount = dc.type === 'percent' ? Math.floor((subtotal * dc.value) / 100) : Math.min(dc.value, subtotal)
    discount = { code: dc.code, amount }
    discountCodeId = dc.id
  }
  const discountAmount = discount?.amount ?? 0

  // Pajak diskalakan proporsional dengan diskon.
  const ratio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1
  const taxIncludedFinal = Math.round(taxIncludedPart * ratio)
  const taxAddedFinal = Math.round(taxAddedPart * ratio)

  // ---- Ongkir & pembayaran ----
  let shipping: Quote['shipping'] = null
  if (input.shippingId) {
    const m = (await payload.find({ collection: 'shipping-methods', where: { and: [{ slug: { equals: input.shippingId } }, { active: { equals: true } }] }, limit: 1, depth: 0, req })).docs[0]
    if (!m) throw new ApiError(422, 'invalid_shipping', 'Metode pengiriman tidak valid.', { shippingId: 'Tidak valid' })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    const free = settings.freeShipping?.enabled && settings.freeShipping.threshold != null && subtotal >= settings.freeShipping.threshold
    shipping = { id: m.slug, name: m.name, price: free ? 0 : m.price, etaDays: [m.minDays, m.maxDays] }
  }

  let paymentFee = 0
  let paymentMethod: Quote['paymentMethod'] = null
  if (input.paymentId) {
    const m = (await payload.find({ collection: 'payment-methods', where: { and: [{ slug: { equals: input.paymentId } }, { active: { equals: true } }] }, limit: 1, depth: 0, req })).docs[0]
    if (!m) throw new ApiError(422, 'invalid_payment', 'Metode pembayaran tidak valid.', { paymentId: 'Tidak valid' })
    paymentFee = m.fee ?? 0
    paymentMethod = { id: m.slug, type: m.type }
  }

  const total = subtotal - discountAmount + taxAddedFinal + (shipping?.price ?? 0) + paymentFee
  return {
    lines,
    subtotal,
    discount,
    discountCodeId,
    shipping,
    paymentFee,
    paymentMethod,
    tax: taxIncludedFinal + taxAddedFinal,
    taxIncluded: taxAddedFinal === 0,
    total,
  }
}

/** Bentuk respons publik untuk POST /api/checkout/quote. */
export const publicQuote = (q: Quote) => ({
  items: q.lines.map((l) => ({
    slug: l.slug,
    name: l.name,
    variantId: l.variantId,
    option: l.option,
    qty: l.qty,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    inStock: l.inStock,
  })),
  subtotal: q.subtotal,
  discount: q.discount,
  shipping: q.shipping,
  paymentFee: q.paymentFee,
  tax: q.tax,
  taxIncluded: q.taxIncluded,
  total: q.total,
})
