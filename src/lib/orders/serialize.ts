import type { Order } from '../../payload-types'

/**
 * Bentuk pesanan untuk publik/pemilik. Sengaja tidak menyertakan internalNotes,
 * data Loyverse/Xero mentah, idempotencyKey, atau kunci provider.
 */
export function serializeOrder(o: Order, opts: { includeToken?: boolean } = {}) {
  return {
    id: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    items: (o.items ?? []).map((i) => ({
      slug: i.slug,
      name: i.name,
      variant: [i.variantOption, i.variantLabel || i.unit].filter(Boolean).join(' / ') || undefined,
      image: i.image ?? undefined,
      unitPrice: i.unitPrice,
      qty: i.qty,
    })),
    subtotal: o.subtotal,
    discount: o.discount ?? 0,
    discountCode: o.discountCode ?? undefined,
    shipping: o.shipping ?? 0,
    shippingName: o.shippingName ?? undefined,
    paymentFee: o.paymentFee ?? 0,
    tax: o.tax ?? 0,
    taxIncluded: o.taxIncluded ?? true,
    total: o.total,
    contact: o.contact,
    address: o.address,
    note: o.note ?? undefined,
    payment: {
      methodId: o.payment?.methodId,
      instructions: o.payment?.instructions ?? undefined,
      expiresAt: o.payment?.expiresAt ?? undefined,
      paidAt: o.payment?.paidAt ?? undefined,
      cardBrand: o.payment?.cardBrand ?? undefined,
      cardLast4: o.payment?.cardLast4 ?? undefined,
    },
    tracking: o.tracking?.number
      ? { carrier: o.tracking.carrier, number: o.tracking.number, url: o.tracking.url, events: o.tracking.events ?? [] }
      : undefined,
    receiptEmailSent: Boolean(o.emails?.orderCreatedSentAt),
    ...(opts.includeToken ? { guestToken: o.guestToken } : {}),
  }
}
