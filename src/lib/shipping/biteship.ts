import { ApiError } from '../http'
import { isDomestic, type RateRequest, type ShippingProvider, type ShippingRate } from './types'

const BASE_URL = process.env.BITESHIP_API_URL || 'https://api.biteship.com'

/** Dari dokumentasi publik Biteship; belum diuji terhadap akun sungguhan. */
type BiteshipPricing = {
  courier_name?: string
  courier_code?: string
  courier_service_name?: string
  courier_service_code?: string
  duration?: string
  shipment_duration_range?: string
  shipment_duration_unit?: string
  price?: number
}

export type BiteshipArea = { id: string; name: string; postal_code?: number | string }

const key = (): string => {
  const k = process.env.BITESHIP_API_KEY
  if (!k) throw new ApiError(503, 'shipping_unavailable', 'Pengiriman belum dikonfigurasi.')
  return k
}

export const biteshipConfigured = (): boolean => Boolean(process.env.BITESHIP_API_KEY)

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: key(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(503, 'shipping_unavailable', 'Layanan pengiriman tidak dapat dihubungi.')
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`[biteship] ${method} ${path} -> HTTP ${res.status} ${detail.slice(0, 300)}`)
    // 4xx dari Biteship biasanya data tujuan tidak valid; selain itu anggap layanan bermasalah.
    if (res.status === 400 || res.status === 422) {
      throw new ApiError(422, 'shipping_unavailable', 'Tujuan pengiriman tidak dapat dihitung. Periksa kode pos.')
    }
    throw new ApiError(503, 'shipping_unavailable', 'Layanan pengiriman sedang bermasalah.')
  }
  return (await res.json()) as T
}

/** "1 - 2" + "days" menjadi [1, 2]; "2 days" menjadi [2, 2]. */
export function parseEta(range?: string, duration?: string): [number, number] {
  const nums = `${range || duration || ''}`.match(/\d+/g)?.map(Number) ?? []
  if (!nums.length) return [0, 0]
  const lo = nums[0]!
  const hi = nums[1] ?? lo
  return [Math.min(lo, hi), Math.max(lo, hi)]
}

export const biteshipProvider = (couriers: string): ShippingProvider => ({
  id: 'biteship',
  supports: (d) => isDomestic(d.country),
  async rates(req: RateRequest): Promise<ShippingRate[]> {
    const { origin, destination } = req
    const body: Record<string, unknown> = {
      couriers,
      items: [{ name: 'Sregcoffee order', value: Math.max(0, Math.round(req.valueIdr)), weight: Math.max(1, Math.round(req.weightGrams)), quantity: 1 }],
    }
    if (origin.areaId) body.origin_area_id = origin.areaId
    else if (origin.postalCode) body.origin_postal_code = Number(origin.postalCode)
    else throw new ApiError(503, 'shipping_unavailable', 'Alamat asal pengiriman belum diisi.')
    if (destination.areaId) body.destination_area_id = destination.areaId
    else if (destination.postalCode) body.destination_postal_code = Number(destination.postalCode)
    else throw new ApiError(422, 'validation_error', 'Kode pos tujuan wajib diisi.', { 'destination.postalCode': 'Wajib diisi' })

    const data = await call<{ pricing?: BiteshipPricing[] }>('POST', '/v1/rates/couriers', body)
    return (data.pricing ?? []).flatMap((p): ShippingRate[] => {
      if (!p.courier_code || !p.courier_service_code || typeof p.price !== 'number') return []
      return [
        {
          id: `biteship:${p.courier_code}:${p.courier_service_code}`,
          provider: 'biteship',
          courier: p.courier_code,
          service: p.courier_service_code,
          name: [p.courier_name, p.courier_service_name].filter(Boolean).join(' ') || `${p.courier_code} ${p.courier_service_code}`,
          price: Math.round(p.price),
          etaDays: parseEta(p.shipment_duration_range, p.duration),
        },
      ]
    })
  },
})

/** Pencarian area untuk dropdown alamat (menggantikan data provinsi/kota/kecamatan). */
export async function searchAreas(input: string): Promise<BiteshipArea[]> {
  const q = new URLSearchParams({ countries: 'ID', input, type: 'single' })
  const data = await call<{ areas?: BiteshipArea[] }>('GET', `/v1/maps/areas?${q}`)
  return data.areas ?? []
}
