import { ValidationError, type Access, type CollectionConfig, type FieldAccess } from 'payload'

import { isAdmin, isAdminOrOps } from '../access'
import { sendEmailOtp, verifyEmailOtp } from '../lib/customers/otp'
import { frontendUrl, renderEmail } from '../lib/email/send'
import { ApiError, customerOf, handle, rateLimit, readJson, str } from '../lib/http'
import { serializeOrder } from '../lib/orders/serialize'

const never: FieldAccess = () => false

/** Customer hanya boleh melihat/mengubah dirinya; ops dan admin boleh melihat semua. */
const selfOrOps: Access = (args) => {
  if (isAdminOrOps(args)) return true
  const me = customerOf(args.req)
  return me ? { id: { equals: me.id } } : false
}

export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'name', 'createdAt'], group: 'Pelanggan' },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
    // Tanpa `verify`: pendaftar langsung bisa login. Verifikasi email dilakukan belakangan lewat kode OTP
    // (POST /customers/otp/send dan /customers/otp/verify), hasilnya di field `emailVerified`.
    forgotPassword: {
      generateEmailSubject: async (args) =>
        args?.req
          ? (await renderEmail(args.req.payload, 'password-reset', { customerName: (args.user as { name?: string } | undefined)?.name })).subject
          : 'Reset your sregcoffee password',
      generateEmailHTML: async (args) =>
        args?.req
          ? (
              await renderEmail(args.req.payload, 'password-reset', {
                customerName: (args.user as { name?: string } | undefined)?.name,
                resetUrl: frontendUrl(`/reset-password?token=${args.token}`),
              })
            ).html
          : '',
    },
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Aturan frontend diulang di server: minimal 8 karakter, mengandung huruf dan angka.
        const pw = data?.password
        if (typeof pw === 'string' && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw)) {
          throw new ValidationError({ errors: [{ path: 'password', message: 'Kata sandi minimal 8 karakter dan mengandung huruf serta angka.' }] })
        }
        return data
      },
    ],
  },
  access: {
    create: () => true, // pendaftaran terbuka
    read: selfOrOps,
    update: selfOrOps,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    { name: 'phone', type: 'text', maxLength: 30 },
    {
      name: 'addresses',
      type: 'array',
      maxRows: 20,
      fields: [
        { name: 'label', type: 'text' },
        { name: 'firstName', type: 'text', required: true },
        { name: 'lastName', type: 'text' },
        { name: 'phone', type: 'text', required: true },
        { name: 'country', type: 'text', defaultValue: 'Indonesia' },
        { name: 'street', type: 'text', required: true },
        { name: 'address2', type: 'text' },
        { name: 'province', type: 'text' },
        { name: 'city', type: 'text', required: true },
        { name: 'district', type: 'text' },
        { name: 'postalCode', type: 'text', required: true },
        { name: 'isDefault', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'newsletter', type: 'checkbox', defaultValue: false },
    // Diisi server saja, lewat kode OTP.
    { name: 'emailVerified', type: 'checkbox', defaultValue: false, admin: { readOnly: true }, access: { create: never, update: never } },
    { name: 'otpHash', type: 'text', admin: { hidden: true }, access: { read: never, create: never, update: never } },
    { name: 'otpExpiresAt', type: 'date', admin: { hidden: true }, access: { read: never, create: never, update: never } },
    { name: 'otpSentAt', type: 'date', admin: { hidden: true }, access: { read: never, create: never, update: never } },
    { name: 'otpAttempts', type: 'number', defaultValue: 0, admin: { hidden: true }, access: { read: never, create: never, update: never } },
    { name: 'wishlist', type: 'relationship', relationTo: 'products', hasMany: true },
    // Diisi server saja.
    { name: 'xeroContactId', type: 'text', admin: { readOnly: true }, access: { create: never, update: never } },
    { name: 'loyverseCustomerId', type: 'text', access: { create: never, update: never } },
  ],
  endpoints: [
    {
      // POST /api/customers/otp/send : kirim kode verifikasi 6 angka ke email pelanggan yang sedang login
      path: '/otp/send',
      method: 'post',
      handler: handle(async (req) => {
        const me = customerOf(req)
        if (!me) throw new ApiError(401, 'unauthorized', 'Silakan login.')
        rateLimit(req, 'otp-send', 10, 10 * 60_000)
        const r = await sendEmailOtp(req.payload, me.id)
        return Response.json({ ok: true, ...r }, { status: 202 })
      }),
    },
    {
      // POST /api/customers/otp/verify  { code }
      path: '/otp/verify',
      method: 'post',
      handler: handle(async (req) => {
        const me = customerOf(req)
        if (!me) throw new ApiError(401, 'unauthorized', 'Silakan login.')
        rateLimit(req, 'otp-verify', 20, 10 * 60_000)
        const body = await readJson(req)
        await verifyEmailOtp(req.payload, me.id, str(body, 'code', { required: true, max: 12 }))
        return Response.json({ ok: true, emailVerified: true })
      }),
    },
    {
      // GET /api/customers/me/orders
      path: '/me/orders',
      method: 'get',
      handler: handle(async (req) => {
        const me = customerOf(req)
        if (!me) throw new ApiError(401, 'unauthorized', 'Silakan login.')
        const page = Math.max(1, Number(req.searchParams.get('page')) || 1)
        const perPage = Math.min(50, Math.max(1, Number(req.searchParams.get('per_page')) || 10))
        const res = await req.payload.find({
          collection: 'orders',
          where: { customer: { equals: me.id } },
          sort: '-createdAt',
          page,
          limit: perPage,
          depth: 0,
        })
        return Response.json({
          data: res.docs.map((o) => serializeOrder(o)),
          meta: { page, per_page: perPage, total: res.totalDocs },
        })
      }),
    },
  ],
}
