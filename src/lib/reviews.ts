import type { Payload, PayloadRequest } from 'payload'

import { writeProductCache } from './productCache'

/** Hitung ulang rata-rata dan jumlah ulasan `approved`. Tulis langsung ke DB (tanpa versi baru, tanpa rebuild). */
export async function recomputeRating(payload: Payload, productId: number | string, req?: PayloadRequest): Promise<void> {
  const res = await payload.find({
    collection: 'reviews',
    where: { and: [{ product: { equals: productId } }, { status: { equals: 'approved' } }] },
    pagination: false,
    depth: 0,
    select: { rating: true },
    req,
  })
  const count = res.docs.length
  const avg = count ? Math.round((res.docs.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0
  await writeProductCache(payload, productId, { ratingAvg: avg, ratingCount: count }, req)
}
