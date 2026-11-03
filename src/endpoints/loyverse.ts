import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Endpoint } from 'payload'

import { isAdmin } from '../access'
import { syncLoyverse } from '../lib/loyverse/sync'

/** Sinkron penuh manual (tombol "Sync sekarang"), admin saja. */
export const loyverseSyncEndpoint: Endpoint = {
  path: '/integrations/loyverse/sync',
  method: 'post',
  handler: async (req) => {
    if (!isAdmin({ req })) return Response.json({ error: 'Forbidden' }, { status: 403 })
    try {
      return Response.json(await syncLoyverse(req.payload))
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : 'sync failed' }, { status: 502 })
    }
  },
}

let running: Promise<unknown> | undefined

/**
 * Webhook Loyverse (item, stok, receipt). Tanda tangan diverifikasi dengan
 * HMAC-SHA1 (base64) dari body mentah memakai LOYVERSE_WEBHOOK_SECRET, header `X-Loyverse-Signature`.
 * Event cukup memicu sinkron penuh; beberapa event beruntun dipadatkan jadi satu proses.
 */
export const loyverseWebhookEndpoint: Endpoint = {
  path: '/integrations/loyverse/webhook',
  method: 'post',
  handler: async (req) => {
    const secret = process.env.LOYVERSE_WEBHOOK_SECRET
    if (!secret) return Response.json({ error: 'webhook not configured' }, { status: 503 })

    const raw = await req.text!()
    const expected = createHmac('sha1', secret).update(raw).digest('base64')
    const given = req.headers.get('x-loyverse-signature') ?? ''
    const a = Buffer.from(expected)
    const b = Buffer.from(given)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return Response.json({ error: 'invalid signature' }, { status: 401 })
    }

    if (!running) {
      running = syncLoyverse(req.payload)
        .catch(() => undefined)
        .finally(() => {
          running = undefined
        })
    }
    return Response.json({ ok: true }, { status: 202 })
  },
}
