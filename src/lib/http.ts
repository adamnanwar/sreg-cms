import type { PayloadRequest } from 'payload'

/** Error API dengan format konsisten: { error: { code, message, fields? } }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}

export const errorResponse = (e: unknown): Response => {
  if (e instanceof ApiError) {
    return Response.json(
      { error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } },
      { status: e.status },
    )
  }
  console.error('[api] error tak terduga:', e)
  return Response.json({ error: { code: 'internal_error', message: 'Terjadi kesalahan.' } }, { status: 500 })
}

/** Membungkus handler endpoint agar ApiError menjadi respons JSON yang rapi. */
export const handle =
  (fn: (req: PayloadRequest) => Promise<Response>) =>
  async (req: PayloadRequest): Promise<Response> => {
    try {
      return await fn(req)
    } catch (e) {
      return errorResponse(e)
    }
  }

export const readJson = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    const body = await req.json!()
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>
  } catch {
    /* jatuh ke error di bawah */
  }
  throw new ApiError(400, 'invalid_json', 'Body harus berupa objek JSON.')
}

export const clientIp = (req: PayloadRequest): string =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

// ---- Rate limit (jendela tetap, di memori satu proses) ----
const hits = new Map<string, { count: number; resetAt: number }>()

/**
 * Batasi `max` permintaan per `windowMs` per IP+nama. Di memori satu proses:
 * cukup untuk satu instance di VPS. Di belakang proxy, pastikan X-Forwarded-For dari proxy tepercaya.
 */
export const rateLimit = (req: PayloadRequest, name: string, max: number, windowMs: number): void => {
  const now = Date.now()
  if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k)
  const key = `${name}:${clientIp(req)}`
  const cur = hits.get(key)
  if (!cur || cur.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (++cur.count > max) throw new ApiError(429, 'rate_limited', 'Terlalu banyak permintaan. Coba lagi nanti.')
}

// ---- Validator kecil ----
export const str = (
  body: Record<string, unknown>,
  key: string,
  opts: { required?: boolean; max?: number } = {},
): string => {
  const v = body[key]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s && opts.required) throw new ApiError(422, 'validation_error', 'Data tidak valid.', { [key]: 'Wajib diisi' })
  if (opts.max && s.length > opts.max) throw new ApiError(422, 'validation_error', 'Data tidak valid.', { [key]: `Maksimal ${opts.max} karakter` })
  return s
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const email = (body: Record<string, unknown>, key = 'email'): string => {
  const s = str(body, key, { required: true, max: 254 }).toLowerCase()
  if (!EMAIL.test(s)) throw new ApiError(422, 'validation_error', 'Data tidak valid.', { [key]: 'Email tidak valid' })
  return s
}

/** Honeypot: field `website` harus kosong. Bot yang mengisinya diberi respons sukses palsu. */
export const isHoneypotTripped = (body: Record<string, unknown>): boolean =>
  typeof body.website === 'string' && body.website.trim() !== ''

export const customerOf = (req: PayloadRequest): { id: number | string; email?: string } | null =>
  req.user && (req.user as { collection?: string }).collection === 'customers'
    ? (req.user as unknown as { id: number | string; email?: string })
    : null
