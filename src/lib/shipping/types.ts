export type Destination = {
  /** Kode negara ISO-2 ("ID") atau nama ("Indonesia"). */
  country: string
  postalCode?: string
  city?: string
  province?: string
  /** ID area Biteship (lebih akurat daripada kode pos). */
  areaId?: string
}

export type Origin = {
  name?: string
  phone?: string
  address?: string
  postalCode?: string
  areaId?: string
  country: string
}

export type ShippingRate = {
  /** Stabil dan unik: `<provider>:<kurir>:<layanan>`. Dipakai sebagai `shippingId` di quote/pesanan. */
  id: string
  provider: 'biteship' | 'fedex'
  courier: string
  service: string
  name: string
  price: number
  etaDays: [number, number]
}

export type RateRequest = {
  origin: Origin
  destination: Destination
  weightGrams: number
  /** Nilai barang (Rupiah), untuk asuransi/bea cukai. */
  valueIdr: number
}

export interface ShippingProvider {
  id: ShippingRate['provider']
  /** Apakah penyedia ini melayani tujuan tersebut. */
  supports(destination: Destination): boolean
  rates(req: RateRequest): Promise<ShippingRate[]>
}

export const isDomestic = (country: string | undefined): boolean => {
  const c = (country ?? 'Indonesia').trim().toLowerCase()
  return c === 'id' || c === 'indonesia'
}
