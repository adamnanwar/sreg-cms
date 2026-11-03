import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

const DEBOUNCE_MS = 45_000

let timer: ReturnType<typeof setTimeout> | undefined

/**
 * Memanggil REBUILD_HOOK_URL setelah jeda, supaya banyak simpanan beruntun
 * (termasuk autosave) hanya menghasilkan satu build. Debounce ada di memori proses.
 */
export const scheduleRebuild = (): void => {
  const url = process.env.REBUILD_HOOK_URL
  if (!url) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    fetch(url, { method: 'POST' }).catch((err) => console.error('[rebuild] hook gagal:', err))
  }, DEBOUNCE_MS)
}

type Statusful = { _status?: string } | undefined | null

const touchesPublished = (doc: Statusful, previousDoc: Statusful): boolean =>
  doc?._status === 'published' || previousDoc?._status === 'published'

export const triggerRebuild: CollectionAfterChangeHook = ({ doc, previousDoc, context }) => {
  // Job sinkron Loyverse menulis tiap beberapa menit; harga/stok tidak memicu build.
  if (context?.skipRebuild) return doc
  if (touchesPublished(doc, previousDoc)) scheduleRebuild()
  return doc
}

export const triggerRebuildOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  scheduleRebuild()
  return doc
}

export const triggerRebuildGlobal: GlobalAfterChangeHook = ({ doc, previousDoc, context }) => {
  if (context?.skipRebuild) return doc
  if (touchesPublished(doc, previousDoc)) scheduleRebuild()
  return doc
}
