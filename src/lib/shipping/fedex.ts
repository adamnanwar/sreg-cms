import { ApiError } from '../http'
import { isDomestic, type ShippingProvider } from './types'

/**
 * Tujuan internasional. Belum diimplementasikan: menunggu akun developer FedEx
 * (client id/secret, nomor akun) dan keputusan bea masuk/mata uang.
 * Saat jadi, `rates()` memetakan respons FedEx Rates API ke `ShippingRate[]` dengan id `fedex:<layanan>`.
 */
export const fedexConfigured = (): boolean =>
  Boolean(process.env.FEDEX_CLIENT_ID && process.env.FEDEX_CLIENT_SECRET && process.env.FEDEX_ACCOUNT_NUMBER)

export const fedexProvider: ShippingProvider = {
  id: 'fedex',
  supports: (d) => !isDomestic(d.country),
  async rates() {
    throw new ApiError(503, 'shipping_unavailable', 'Pengiriman internasional belum tersedia.')
  },
}
