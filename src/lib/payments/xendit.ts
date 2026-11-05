import { timingSafeEqual } from 'node:crypto'

import type { PaymentMethodType, PaymentProvider, PaymentWebhookEvent } from './provider'

const API = 'https://api.xendit.co'

/** Kode metode Xendit per jenis metode di CMS. Membatasi halaman bayar ke jenis yang dipilih pembeli. */
const CHANNELS: Record<PaymentMethodType, string[]> = {
  card: ['CREDIT_CARD'],
  virtual_account: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'BSI', 'CIMB', 'BJB'],
  qris: ['QRIS'],
  ewallet: ['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'],
}

export const xenditConfigured = (): boolean => !!process.env.XENDIT_SECRET_KEY

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

const auth = (key: string) => `Basic ${Buffer.from(`${key}:`).toString('base64')}`

/**
 * Xendit Invoice (halaman bayar milik Xendit). CMS hanya membuat invoice dan menerima webhook;
 * data kartu/rekening tidak pernah lewat CMS maupun frontend. Frontend membuka `instructions.url`
 * di jendela popup (atau modal), lalu polling `GET /orders/lookup` sampai status berubah.
 * Webhook: header `x-callback-token` harus sama dengan XENDIT_CALLBACK_TOKEN.
 */
export const xenditProvider: PaymentProvider = {
  id: 'xendit',

  async createPayment(input) {
    const key = process.env.XENDIT_SECRET_KEY
    if (!key) throw new Error('XENDIT_SECRET_KEY belum diisi')
    const seconds = Math.max(60, Math.floor((input.expiresAt.getTime() - Date.now()) / 1000))
    const body = {
      external_id: input.orderNumber,
      amount: input.total,
      currency: 'IDR',
      description: `Order ${input.orderNumber}`,
      payer_email: input.customer.email,
      customer: { given_names: input.customer.name || 'Customer', email: input.customer.email },
      invoice_duration: seconds,
      payment_methods: CHANNELS[input.methodType],
      ...(input.returnUrl ? { success_redirect_url: input.returnUrl, failure_redirect_url: input.returnUrl } : {}),
    }
    const res = await fetch(`${API}/v2/invoices`, {
      method: 'POST',
      headers: { Authorization: auth(key), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Xendit ${res.status}`) // detail sengaja tidak diteruskan ke pembeli
    const inv = (await res.json()) as { id?: string; invoice_url?: string }
    if (!inv.id || !inv.invoice_url) throw new Error('Xendit: respons invoice tidak lengkap')
    return {
      providerRef: inv.id,
      instructions: { type: 'redirect', url: inv.invoice_url, provider: 'xendit', invoiceId: inv.id, expiresAt: input.expiresAt.toISOString() },
    }
  },

  async cancelPayment(providerRef) {
    const key = process.env.XENDIT_SECRET_KEY
    if (!key) throw new Error('XENDIT_SECRET_KEY belum diisi')
    const res = await fetch(`${API}/invoices/${encodeURIComponent(providerRef)}/expire!`, {
      method: 'POST',
      headers: { Authorization: auth(key), 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`Xendit expire ${res.status}`)
  },

  parseWebhook(rawBody, headers) {
    const token = process.env.XENDIT_CALLBACK_TOKEN
    if (!token) return { error: 'XENDIT_CALLBACK_TOKEN belum diisi' }
    if (!safeEqual(token, headers.get('x-callback-token') ?? '')) return { error: 'invalid token' }
    try {
      const j = JSON.parse(rawBody) as {
        id?: string
        external_id?: string
        status?: string
        event?: string
        data?: { status?: string; invoice_id?: string; reference_id?: string; amount?: number }
      }
      // Refund (dibuat admin di dashboard Xendit): event "refund.succeeded". Gagal/pending diabaikan.
      if (typeof j.event === 'string' && j.event.startsWith('refund.')) {
        const d = j.data ?? {}
        const ref = d.invoice_id ?? d.reference_id
        if (!ref) return { error: 'refund tanpa referensi' }
        const ok = j.event === 'refund.succeeded' || d.status === 'SUCCEEDED'
        return { event: { providerRef: ref, status: ok ? 'refunded' : 'failed', amount: d.amount } }
      }
      const status: PaymentWebhookEvent['status'] | null =
        j.status === 'PAID' || j.status === 'SETTLED' ? 'paid' : j.status === 'EXPIRED' ? 'expired' : null
      if (!status) return { error: 'status tidak dikenal' }
      return { event: { orderNumber: j.external_id, providerRef: j.id, status } }
    } catch {
      return { error: 'body bukan JSON' }
    }
  },
}
