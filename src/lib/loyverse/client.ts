/**
 * Klien baca-saja untuk Loyverse API (https://developer.loyverse.com).
 * Bentuk respons ditulis dari dokumentasi publik dan belum diuji terhadap akun sungguhan.
 */

const BASE_URL = process.env.LOYVERSE_API_URL || 'https://api.loyverse.com/v1.0'

export type LoyverseVariant = {
  variant_id: string
  sku?: string | null
  option1_value?: string | null
  option2_value?: string | null
  option3_value?: string | null
  default_price?: number | null
  stores?: { store_id: string; price?: number | null; pricing_type?: string; available_for_sale?: boolean }[]
}

export type LoyverseItem = {
  id: string
  item_name: string
  category_id?: string | null
  track_stock?: boolean
  tax_ids?: string[]
  deleted_at?: string | null
  variants: LoyverseVariant[]
}

export type LoyverseCategory = { id: string; name: string; deleted_at?: string | null }
export type LoyverseTax = { id: string; name?: string; type: 'INCLUDED' | 'ADDED' | string; rate: number }
export type LoyverseInventoryLevel = { variant_id: string; store_id: string; in_stock: number | null }

export class LoyverseError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message)
  }
}

const token = (): string => {
  const t = process.env.LOYVERSE_ACCESS_TOKEN
  if (!t) throw new LoyverseError('LOYVERSE_ACCESS_TOKEN belum diisi')
  return t
}

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v))

  // Loyverse membatasi laju (429): coba ulang beberapa kali dengan jeda.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` }, signal: AbortSignal.timeout(20_000) })
    if (res.status === 429 && attempt < 3) {
      const wait = Number(res.headers.get('retry-after')) || 2 ** attempt
      await new Promise((r) => setTimeout(r, wait * 1000))
      continue
    }
    if (!res.ok) throw new LoyverseError(`Loyverse ${path} → HTTP ${res.status}`, res.status)
    return (await res.json()) as T
  }
}

/** Mengikuti `cursor` sampai habis. */
async function getAll<T>(path: string, key: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const out: T[] = []
  let cursor: string | undefined
  do {
    const page = await get<Record<string, unknown> & { cursor?: string }>(path, { limit: 250, ...params, cursor })
    out.push(...((page[key] as T[] | undefined) ?? []))
    cursor = page.cursor || undefined
  } while (cursor)
  return out
}

export const loyverse = {
  items: () => getAll<LoyverseItem>('/items', 'items'),
  categories: () => getAll<LoyverseCategory>('/categories', 'categories'),
  taxes: () => getAll<LoyverseTax>('/taxes', 'taxes'),
  inventory: (storeId: string) => getAll<LoyverseInventoryLevel>('/inventory', 'inventory_levels', { store_id: storeId }),
}
