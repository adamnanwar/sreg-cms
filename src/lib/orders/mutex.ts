/**
 * Antrean serial di memori satu proses. Dipakai agar cek stok + reservasi tidak balapan
 * antar permintaan bersamaan. Cukup untuk satu instance; untuk multi-instance ganti dengan
 * pg_advisory_xact_lock di dalam transaksi.
 */
let tail: Promise<unknown> = Promise.resolve()

export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn)
  tail = run.catch(() => undefined)
  return run
}
