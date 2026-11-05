import type { Payload } from 'payload'

import type { Order } from '../../payload-types'
import { providerByName } from './provider'

/** Tutup tagihan gateway untuk pesanan yang dibatalkan sebelum dibayar. Gagal = diabaikan (tagihan kedaluwarsa sendiri). */
export async function closePendingPayment(payload: Payload, order: Order): Promise<void> {
  const provider = providerByName(order.payment?.provider)
  const ref = order.payment?.providerRef
  if (!provider?.cancelPayment || !ref) return
  try {
    await provider.cancelPayment(ref)
  } catch (err) {
    payload.logger.warn({ err, order: order.orderNumber }, '[payments] gagal menutup tagihan gateway')
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Beri tahu admin/ops bahwa pesanan yang sudah dibayar dibatalkan (atau dibayar setelah ditutup) dan perlu refund
 * manual dari dashboard gateway. Setelah refund selesai, webhook gateway mengubah status pesanan menjadi `refunded`.
 * Tidak pernah melempar error.
 */
export async function notifyRefundNeeded(payload: Payload, order: Order, why: string): Promise<void> {
  try {
    const staff = await payload.find({ collection: 'users', where: { role: { in: ['admin', 'ops'] } }, limit: 50, depth: 0, pagination: false })
    const to = staff.docs.map((u) => u.email).filter(Boolean)
    if (!to.length) return
    const base = (process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')
    const link = base ? `${base}/admin/collections/orders/${order.id}` : ''
    await payload.sendEmail({
      to,
      subject: `Perlu refund: pesanan ${order.orderNumber}`,
      html: [
        `<p>Pesanan <strong>${esc(order.orderNumber)}</strong> (Rp${order.total}) perlu refund manual.</p>`,
        `<p>${esc(why)}</p>`,
        `<p>Refund dari dashboard ${esc(order.payment?.provider ?? 'gateway')}${order.payment?.providerRef ? ` (ref ${esc(order.payment.providerRef)})` : ''}. Status pesanan akan berubah menjadi "refunded" otomatis setelah refund berhasil.</p>`,
        link ? `<p><a href="${esc(link)}">Buka pesanan</a></p>` : '',
      ].join(''),
    })
  } catch (err) {
    payload.logger.error({ err, order: order.orderNumber }, '[payments] gagal mengirim notifikasi refund')
  }
}
