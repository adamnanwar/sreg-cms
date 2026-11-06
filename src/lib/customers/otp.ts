import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { Payload } from 'payload'

import { sendTemplateEmail } from '../email/send'
import { ApiError } from '../http'

export const OTP_TTL_MS = 10 * 60_000
export const OTP_RESEND_MS = 60_000
export const OTP_MAX_ATTEMPTS = 5

/** Kode di-hash dengan kunci server dan id pelanggan, jadi hash yang bocor tidak bisa dipakai di akun lain. */
const hashCode = (customerId: number | string, code: string): string =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || '').update(`${customerId}:${code}`).digest('hex')

const same = (a: string, b: string): boolean => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Buat kode 6 angka dan kirim ke email pelanggan. Dibatasi satu kiriman per 60 detik. */
export async function sendEmailOtp(payload: Payload, customerId: number | string) {
  const c = await payload.findByID({ collection: 'customers', id: customerId, depth: 0 })
  if (c.emailVerified) throw new ApiError(409, 'already_verified', 'Email sudah terverifikasi.')

  const last = c.otpSentAt ? new Date(c.otpSentAt).getTime() : 0
  const wait = last + OTP_RESEND_MS - Date.now()
  if (wait > 0) {
    throw new ApiError(429, 'otp_cooldown', `Tunggu ${Math.ceil(wait / 1000)} detik sebelum meminta kode lagi.`, { retryAfter: String(Math.ceil(wait / 1000)) })
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await payload.update({
    collection: 'customers',
    id: customerId,
    data: {
      otpHash: hashCode(customerId, code),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      otpSentAt: new Date().toISOString(),
      otpAttempts: 0,
    },
    depth: 0,
  })
  const sent = await sendTemplateEmail(payload, 'verify-email', c.email, {
    customerName: c.name,
    code,
    minutes: OTP_TTL_MS / 60_000,
  })
  if (!sent) throw new ApiError(503, 'email_unavailable', 'Email belum bisa dikirim. Coba lagi nanti.')
  return { expiresInSeconds: OTP_TTL_MS / 1000, resendAfterSeconds: OTP_RESEND_MS / 1000 }
}

/** Periksa kode. Salah 5 kali, kode dihanguskan dan pelanggan harus meminta kode baru. */
export async function verifyEmailOtp(payload: Payload, customerId: number | string, code: string): Promise<void> {
  const c = await payload.findByID({ collection: 'customers', id: customerId, depth: 0 })
  if (c.emailVerified) return
  if (!c.otpHash || !c.otpExpiresAt) throw new ApiError(422, 'otp_invalid', 'Minta kode verifikasi terlebih dulu.')
  if (new Date(c.otpExpiresAt).getTime() < Date.now()) throw new ApiError(410, 'otp_expired', 'Kode kedaluwarsa. Minta kode baru.')

  const attempts = c.otpAttempts ?? 0
  if (attempts >= OTP_MAX_ATTEMPTS) throw new ApiError(429, 'otp_locked', 'Terlalu banyak percobaan. Minta kode baru.')

  if (!/^\d{6}$/.test(code) || !same(hashCode(customerId, code), c.otpHash)) {
    const left = OTP_MAX_ATTEMPTS - attempts - 1
    await payload.update({
      collection: 'customers',
      id: customerId,
      // Percobaan terakhir yang salah menghanguskan kode.
      data: left > 0 ? { otpAttempts: attempts + 1 } : { otpAttempts: attempts + 1, otpHash: null, otpExpiresAt: null },
      depth: 0,
    })
    throw new ApiError(422, 'otp_invalid', 'Kode salah.', { attemptsLeft: String(Math.max(0, left)) })
  }

  await payload.update({
    collection: 'customers',
    id: customerId,
    data: { emailVerified: true, otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
    depth: 0,
  })
}
