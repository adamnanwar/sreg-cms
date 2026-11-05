import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import { xenditProvider } from './xendit'

export type PaymentMethodType = 'card' | 'virtual_account' | 'qris' | 'ewallet'

export type CreatePaymentInput = {
  orderNumber: string
  total: number
  methodSlug: string
  methodType: PaymentMethodType
  customer: { email: string; name: string }
  expiresAt: Date
  /** Halaman frontend tujuan setelah pembeli selesai di halaman bayar gateway. */
  returnUrl?: string
}

export type PaymentWebhookEvent = {
  providerRef?: string
  orderNumber?: string
  status: 'paid' | 'expired' | 'failed' | 'refunded'
  /** Jumlah yang dikembalikan (hanya untuk `refunded`). */
  amount?: number
}

/**
 * Antarmuka penyedia pembayaran. Gateway sungguhan (Midtrans/Xendit/…) cukup
 * menambah satu file yang mengimplementasikan ini dan mendaftarkannya di `getProvider`.
 * CMS tidak pernah menerima nomor kartu: kartu ditokenisasi/ditagih di sisi gateway.
 */
export interface PaymentProvider {
  id: string
  createPayment(input: CreatePaymentInput): Promise<{ providerRef: string; instructions: Record<string, unknown> }>
  /** Verifikasi tanda tangan lalu ubah payload gateway menjadi peristiwa seragam. */
  parseWebhook(rawBody: string, headers: Headers): { event: PaymentWebhookEvent } | { error: string }
  /** Tutup tagihan yang belum dibayar (pesanan dibatalkan). Opsional; kegagalan tidak fatal. */
  cancelPayment?(providerRef: string): Promise<void>
}

const frontend = () => (process.env.FRONTEND_ORIGIN || 'http://localhost:4321').replace(/\/$/, '')

/**
 * Penyedia tiruan untuk dev/staging. Tidak menagih apa pun.
 * Webhook: header `x-mock-signature` = HMAC-SHA256 hex dari body dengan MOCK_PAYMENT_SECRET.
 */
export const mockProvider: PaymentProvider = {
  id: 'mock',
  async createPayment(input) {
    const providerRef = `mock_${input.orderNumber}`
    const expiresAt = input.expiresAt.toISOString()
    switch (input.methodType) {
      case 'virtual_account':
        return {
          providerRef,
          instructions: {
            type: 'virtual_account',
            bank: 'BCA',
            number: `8808 ${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
            amount: input.total,
            expiresAt,
          },
        }
      case 'qris':
        return { providerRef, instructions: { type: 'qris', qrString: `MOCKQR|${input.orderNumber}|${input.total}`, expiresAt } }
      default:
        return {
          providerRef,
          instructions: { type: 'redirect', url: `${frontend()}/mock-pay?order=${encodeURIComponent(input.orderNumber)}`, expiresAt },
        }
    }
  },
  parseWebhook(rawBody, headers) {
    const secret = process.env.MOCK_PAYMENT_SECRET
    if (!secret) return { error: 'MOCK_PAYMENT_SECRET belum diisi' }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const given = headers.get('x-mock-signature') ?? ''
    const a = Buffer.from(expected)
    const b = Buffer.from(given)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: 'invalid signature' }
    try {
      const j = JSON.parse(rawBody) as { orderNumber?: string; providerRef?: string; status?: string }
      if (j.status !== 'paid' && j.status !== 'expired' && j.status !== 'failed') return { error: 'status tidak dikenal' }
      return { event: { orderNumber: j.orderNumber, providerRef: j.providerRef, status: j.status } }
    } catch {
      return { error: 'body bukan JSON' }
    }
  },
}

/**
 * Penyedia aktif dari env PAYMENT_PROVIDER. Default `mock` di luar produksi;
 * di produksi harus diisi eksplisit (mock di produksi hanya bila PAYMENT_PROVIDER=mock).
 */
export function getProvider(): PaymentProvider | null {
  const id = process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')
  if (id === 'mock') return mockProvider
  if (id === 'xendit') return xenditProvider
  return null
}

/** Penyedia menurut nama yang tersimpan di pesanan (bukan penyedia aktif sekarang), untuk refund/pembatalan. */
export const providerByName = (id: string | null | undefined): PaymentProvider | null =>
  id === 'xendit' ? xenditProvider : id === 'mock' ? mockProvider : null

export const providerById = (id: string): PaymentProvider | null => {
  const p = getProvider()
  return p && p.id === id ? p : null
}
