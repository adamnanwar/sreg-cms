import { APIError, type CollectionAfterChangeHook, type Payload, type PayloadRequest } from 'payload'

import type { Order } from '../../payload-types'
import { frontendUrl, sendTemplateEmail } from '../email/send'
import { ApiError } from '../http'

type Status = Order['status']

const ALLOWED: Record<Status, Status[]> = {
  awaiting_payment: ['paid', 'cancelled', 'expired'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  expired: [],
  refunded: [],
}

export function validateTransition(from: Status, to: Status): void {
  if (!ALLOWED[from]?.includes(to)) throw new APIError(`Transisi status ${from} → ${to} tidak diizinkan.`, 400)
}

const emailVars = (o: Order) => ({
  orderNumber: o.orderNumber,
  customerName: [o.address?.firstName, o.address?.lastName].filter(Boolean).join(' '),
  total: o.total,
  orderUrl: frontendUrl(`/order/${o.orderNumber}?token=${o.guestToken ?? ''}`),
  trackingUrl: o.tracking?.url ?? '',
  invoiceUrl: o.xero?.invoiceUrl ? frontendUrl(`/order/${o.orderNumber}`) : '',
})

async function setReservationStatus(
  payload: Payload,
  orderId: number | string,
  from: ('active' | 'committed')[],
  to: 'committed' | 'released',
  req: PayloadRequest,
) {
  await payload.update({
    collection: 'stock-reservations',
    where: { and: [{ order: { equals: orderId } }, { status: { in: from } }] },
    data: { status: to },
    req,
  })
}

async function releaseDiscount(payload: Payload, order: Order, req: PayloadRequest) {
  if (!order.discountCode) return
  const dc = (await payload.find({ collection: 'discount-codes', where: { code: { equals: order.discountCode } }, limit: 1, depth: 0, req })).docs[0]
  if (dc && (dc.usedCount ?? 0) > 0) {
    await payload.update({ collection: 'discount-codes', id: dc.id, data: { usedCount: (dc.usedCount ?? 0) - 1 }, req })
  }
}

/** Efek samping tiap perubahan status. Dipasang di afterChange, jadi berlaku untuk admin, webhook, dan job. */
export const onOrderStatusChange: CollectionAfterChangeHook<Order> = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== 'update' || !previousDoc || previousDoc.status === doc.status) return doc
  const { payload } = req
  const locale = doc.lang === 'id' ? 'id' : 'en'
  const to = doc.contact.email

  switch (doc.status) {
    case 'paid':
      await setReservationStatus(payload, doc.id, ['active'], 'committed', req)
      // Receipt Loyverse dan invoice Xero dibuat oleh integrasi (belum aktif); tandai antreannya.
      await payload.db.updateOne({
        collection: 'orders',
        id: doc.id,
        data: { loyverse: { ...doc.loyverse, syncStatus: 'pending' }, xero: { ...doc.xero, status: 'pending' } },
        req,
      })
      await sendTemplateEmail(payload, 'payment-received', to, emailVars(doc), locale)
      break
    case 'shipped':
      await sendTemplateEmail(payload, 'shipped', to, emailVars(doc), locale)
      break
    case 'cancelled':
    case 'expired':
      await setReservationStatus(payload, doc.id, ['active', 'committed'], 'released', req)
      await releaseDiscount(payload, doc, req)
      if (previousDoc.status === 'paid' || previousDoc.status === 'processing') {
        await payload.db.updateOne({ collection: 'orders', id: doc.id, data: { needsRefund: true }, req })
      }
      if (doc.status === 'cancelled') await sendTemplateEmail(payload, 'cancelled', to, emailVars(doc), locale)
      break
    case 'refunded':
      await setReservationStatus(payload, doc.id, ['active', 'committed'], 'released', req)
      break
  }
  return doc
}

/** Pembatalan oleh pelanggan: hanya selama belum diproses. */
export async function cancelOrder(payload: Payload, order: Order): Promise<Order> {
  if (order.status !== 'awaiting_payment' && order.status !== 'paid') {
    throw new ApiError(409, 'cannot_cancel', 'Pesanan tidak bisa dibatalkan pada status ini.')
  }
  return payload.update({ collection: 'orders', id: order.id, data: { status: 'cancelled' }, depth: 0 })
}
