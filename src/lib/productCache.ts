import type { Payload, PayloadRequest } from 'payload'

/**
 * Menulis cache yang dihitung server (harga/stok Loyverse, rating) ke produk TANPA membuat versi baru.
 *
 * Produk memakai draf: API publik membaca tabel utama, tetapi form admin membaca VERSI TERBARU.
 * Menulis hanya ke tabel utama membuat form admin menampilkan harga kosong dan, saat editor menerbitkan,
 * menimpa cache di tabel utama dengan nilai lama dari versi sampai sinkron berikutnya.
 * Karena itu nilai yang sama ditulis juga ke versi terbaru.
 */
export async function writeProductCache(
  payload: Payload,
  productId: number | string,
  data: Record<string, unknown>,
  req?: PayloadRequest,
): Promise<void> {
  await payload.db.updateOne({ collection: 'products', id: productId, data, req })

  const latest = (
    await payload.findVersions({
      collection: 'products',
      where: { parent: { equals: productId } },
      sort: '-updatedAt',
      limit: 1,
      pagination: false,
      depth: 0,
      req,
    })
  ).docs[0]
  if (latest) {
    await payload.db.updateVersion({ collection: 'products', id: latest.id, versionData: { version: data } as never, req })
  }
}

/**
 * Menyalin cache `loyverse` di tabel utama ke versi terbaru bila versi itu tertinggal (mis. produk yang
 * tersinkron sebelum versi ikut diperbarui). Tidak melakukan apa pun bila sudah sama.
 */
export async function refreshVersionCache(
  payload: Payload,
  productId: number | string,
  loyverse: { syncedAt?: string | null } & Record<string, unknown>,
  req?: PayloadRequest,
): Promise<boolean> {
  if (!loyverse.syncedAt) return false
  const latest = (
    await payload.findVersions({ collection: 'products', where: { parent: { equals: productId } }, sort: '-updatedAt', limit: 1, pagination: false, depth: 0, req })
  ).docs[0]
  if (!latest) return false
  const seen = (latest.version as { loyverse?: { syncedAt?: string | null } }).loyverse?.syncedAt
  if (seen && new Date(seen).getTime() === new Date(loyverse.syncedAt).getTime()) return false
  await payload.db.updateVersion({ collection: 'products', id: latest.id, versionData: { version: { loyverse } } as never, req })
  return true
}
