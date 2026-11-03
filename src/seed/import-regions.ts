/**
 * Impor wilayah (provinsi → kota → kecamatan) dari berkas JSON.
 * Jalankan: pnpm import:regions <path-ke-json>      (idempotent berdasarkan `code`)
 *
 * Bentuk berkas:
 *   [{ "code": "31", "name": "DKI Jakarta",
 *      "cities": [{ "code": "3174", "name": "Jakarta Selatan",
 *                   "districts": [{ "code": "317410", "name": "Cilandak" }] }] }]
 * Dataset bisa dari data wilayah Kemendagri atau API ongkir.
 */
import { readFile } from 'node:fs/promises'
import { getPayload } from 'payload'

import config from '../payload.config'

type Region = { code: string; name: string }
type Dataset = (Region & { cities?: (Region & { districts?: Region[] })[] })[]

const file = process.argv.find((a) => a.endsWith('.json'))
if (!file) {
  console.error('Pemakaian: pnpm import:regions <berkas.json>')
  process.exit(1)
}

const data = JSON.parse(await readFile(file, 'utf8')) as Dataset
const payload = await getPayload({ config })

const upsert = async (collection: 'provinces' | 'cities' | 'districts', row: Region, parent?: Record<string, string | number>) => {
  const found = await payload.find({ collection, where: { code: { equals: row.code } }, limit: 1, depth: 0 })
  if (found.docs[0]) return found.docs[0].id
  return (await payload.create({ collection, data: { code: row.code, name: row.name, ...parent } as never })).id
}

let n = 0
for (const p of data) {
  const provinceId = await upsert('provinces', p)
  for (const c of p.cities ?? []) {
    const cityId = await upsert('cities', c, { province: provinceId })
    for (const d of c.districts ?? []) {
      await upsert('districts', d, { city: cityId })
      n++
    }
  }
}
payload.logger.info(`Impor wilayah selesai (${n} kecamatan).`)
process.exit(0)
