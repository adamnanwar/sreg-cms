// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { Customers } from '@/collections/Customers'
import { OTP_MAX_ATTEMPTS, sendEmailOtp, verifyEmailOtp } from '@/lib/customers/otp'

let payload: Payload
let sent: { to: string; subject: string; html: string }[] = []
const lastCode = () => /\b(\d{6})\b/.exec(sent[sent.length - 1].html)![1]

const cleanup = () => payload.delete({ collection: 'customers', where: { email: { like: 'otp-' } } })

const newCustomer = async (tag: string) =>
  (await payload.create({ collection: 'customers', data: { email: `otp-${tag}@test.local`, password: 'Passw0rd!x', name: `Otp ${tag}` } })).id

const reject = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toMatchObject({ code })
}

describe('verifikasi email dengan OTP', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    await cleanup()
    vi.spyOn(payload, 'sendEmail').mockImplementation((async (m: { to: string; subject: string; html: string }) => {
      sent.push(m)
    }) as never)
  })
  afterAll(async () => {
    vi.restoreAllMocks()
    await cleanup()
    await payload.destroy()
  })

  it('pendaftar langsung bisa login tanpa verifikasi, emailVerified false', async () => {
    const id = await newCustomer('login')
    const res = await payload.login({ collection: 'customers', data: { email: 'otp-login@test.local', password: 'Passw0rd!x' } })
    expect(res.token).toBeTruthy()
    expect((await payload.findByID({ collection: 'customers', id })).emailVerified).toBe(false)
  })

  it('kode dikirim ke email, benar → emailVerified, kode dihanguskan', async () => {
    sent = []
    const id = await newCustomer('ok')
    const r = await sendEmailOtp(payload, id)
    expect(r.expiresInSeconds).toBe(600)
    expect(sent).toHaveLength(1)
    expect(sent[0].to).toBe('otp-ok@test.local')
    await verifyEmailOtp(payload, id, lastCode())
    const row = await payload.findByID({ collection: 'customers', id, showHiddenFields: true })
    expect(row.emailVerified).toBe(true)
    expect(row.otpHash).toBeFalsy()
    await reject(sendEmailOtp(payload, id), 'already_verified')
  })

  it('kode tidak pernah tampil di API pelanggan (hash tersembunyi)', async () => {
    const id = await newCustomer('hidden')
    await sendEmailOtp(payload, id)
    const asSelf = await payload.findByID({ collection: 'customers', id, overrideAccess: false, user: { id, collection: 'customers' } as never })
    expect(Object.keys(asSelf).filter((k) => k.startsWith('otp'))).toEqual([])
  })

  it('minta ulang sebelum 60 detik ditolak', async () => {
    const id = await newCustomer('cool')
    await sendEmailOtp(payload, id)
    await reject(sendEmailOtp(payload, id), 'otp_cooldown')
  })

  it('kode salah ditolak; salah 5 kali menghanguskan kode', async () => {
    sent = []
    const id = await newCustomer('wrong')
    await sendEmailOtp(payload, id)
    const real = lastCode()
    const bad = real === '000000' ? '111111' : '000000'
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) await reject(verifyEmailOtp(payload, id, bad), 'otp_invalid')
    // kode benar pun sudah tidak berlaku
    await reject(verifyEmailOtp(payload, id, real), 'otp_invalid')
    expect((await payload.findByID({ collection: 'customers', id })).emailVerified).toBe(false)
  })

  it('kode kedaluwarsa ditolak', async () => {
    sent = []
    const id = await newCustomer('exp')
    await sendEmailOtp(payload, id)
    await payload.update({ collection: 'customers', id, data: { otpExpiresAt: new Date(Date.now() - 1000).toISOString() } })
    await reject(verifyEmailOtp(payload, id, lastCode()), 'otp_expired')
  })

  it('verifikasi tanpa meminta kode ditolak; format bukan 6 angka ditolak', async () => {
    const id = await newCustomer('none')
    await reject(verifyEmailOtp(payload, id, '123456'), 'otp_invalid')
    await sendEmailOtp(payload, id)
    await reject(verifyEmailOtp(payload, id, 'abcdef'), 'otp_invalid')
  })

  it('endpoint wajib login', async () => {
    for (const path of ['/otp/send', '/otp/verify']) {
      const ep = (Customers.endpoints as { path: string; handler: unknown }[]).find((e) => e.path === path)!
      const res = (await (ep.handler as (r: unknown) => Promise<Response>)({
        payload,
        headers: new Headers(),
        searchParams: new URLSearchParams(),
        json: async () => ({ code: '123456' }),
        user: null,
      })) as Response
      expect(res.status).toBe(401)
    }
  })
})
