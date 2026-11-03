import type { Payload } from 'payload'

import { frontendUrl, sendTemplateEmail } from './email/send'

/** Kirim email "kembali tersedia" ke pendaftar yang belum diberi tahu, lalu tandai. */
export async function notifyBackInStock(payload: Payload, product: { id: number | string; slug: string; name: string }): Promise<number> {
  const alerts = await payload.find({
    collection: 'stock-alerts',
    where: { and: [{ product: { equals: product.id } }, { notifiedAt: { exists: false } }] },
    limit: 500,
    depth: 0,
  })
  let sent = 0
  for (const a of alerts.docs) {
    const ok = await sendTemplateEmail(payload, 'back-in-stock', a.email, {
      productName: product.name,
      productUrl: frontendUrl(`/products/${product.slug}`),
    })
    if (ok) {
      await payload.update({ collection: 'stock-alerts', id: a.id, data: { notifiedAt: new Date().toISOString() }, depth: 0 })
      sent++
    }
  }
  return sent
}
