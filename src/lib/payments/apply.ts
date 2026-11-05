import type { Payload, Where } from 'payload'

import type { Order } from '../../payload-types'
import { notifyRefundNeeded } from './refund'
import type { PaymentWebhookEvent } from './provider'

export async function findOrderForEvent(payload: Payload, event: PaymentWebhookEvent): Promise<Order | null> {
  const or: Where[] = [
    ...(event.orderNumber ? [{ orderNumber: { equals: event.orderNumber } }] : []),
    ...(event.providerRef ? [{ 'payment.providerRef': { equals: event.providerRef } }] : []),
  ]
  if (!or.length) return null
  return (await payload.find({ collection: 'orders', where: { or }, limit: 1, depth: 0 })).docs[0] ?? null
}

/**
 * Terapkan peristiwa pembayaran. Idempoten: gateway biasa mengirim ulang webhook.
 * Perubahan status memicu efek samping lewat hook afterChange di Orders.
 */
export async function applyPaymentEvent(payload: Payload, event: PaymentWebhookEvent): Promise<'applied' | 'ignored' | 'not_found'> {
  const order = await findOrderForEvent(payload, event)
  if (!order) return 'not_found'

  if (event.status === 'paid') {
    if (order.status === 'awaiting_payment') {
      await payload.update({ collection: 'orders', id: order.id, data: { status: 'paid' }, depth: 0 })
      return 'applied'
    }
    if (order.status === 'expired' || order.status === 'cancelled') {
      // Pembayaran telat: uang masuk tetapi pesanan sudah tutup. Tandai untuk refund manual.
      const flagged = await payload.update({
        collection: 'orders',
        id: order.id,
        depth: 0,
        data: {
          needsRefund: true,
          internalNotes: [order.internalNotes, `[${new Date().toISOString()}] Pembayaran diterima setelah pesanan ${order.status}. Perlu refund.`].filter(Boolean).join('\n'),
        },
      })
      await notifyRefundNeeded(payload, flagged, `Pembayaran diterima setelah pesanan ${order.status}.`)
      return 'applied'
    }
    return 'ignored'
  }

  if (event.status === 'refunded') {
    const refundable: Order['status'][] = ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'expired']
    if (!refundable.includes(order.status)) return 'ignored'
    const note = (line: string) => [order.internalNotes, `[${new Date().toISOString()}] ${line}`].filter(Boolean).join('\n')
    if (event.amount !== undefined && event.amount < order.total) {
      // Refund sebagian: hanya dicatat, status tetap (admin menentukan).
      await payload.update({ collection: 'orders', id: order.id, data: { internalNotes: note(`Refund sebagian Rp${event.amount} dari Rp${order.total} tercatat dari gateway.`) }, depth: 0 })
      return 'applied'
    }
    await payload.update({ collection: 'orders', id: order.id, data: { status: 'refunded', needsRefund: false, internalNotes: note('Refund penuh dikonfirmasi gateway.') }, depth: 0 })
    return 'applied'
  }

  if (event.status === 'expired' && order.status === 'awaiting_payment') {
    await payload.update({ collection: 'orders', id: order.id, data: { status: 'expired' }, depth: 0 })
    return 'applied'
  }
  return 'ignored'
}

/** Kedaluwarsakan pesanan yang belum dibayar melewati batas. Dijalankan job tiap menit. */
export async function expireUnpaidOrders(payload: Payload): Promise<number> {
  const due = await payload.find({
    collection: 'orders',
    where: { and: [{ status: { equals: 'awaiting_payment' } }, { 'payment.expiresAt': { less_than: new Date().toISOString() } }] },
    limit: 100,
    depth: 0,
  })
  for (const o of due.docs) {
    await payload.update({ collection: 'orders', id: o.id, data: { status: 'expired' }, depth: 0 })
  }
  return due.docs.length
}
