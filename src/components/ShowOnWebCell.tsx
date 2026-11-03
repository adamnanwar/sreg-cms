'use client'
import { toast, useConfig } from '@payloadcms/ui'
import type { DefaultCellComponentProps } from 'payload'
import React, { useState } from 'react'

/**
 * Kotak centang langsung di tabel daftar: satu klik menyimpan `showOnWeb` tanpa membuka halaman detail.
 * Dipakai di Kategori Loyverse dan Menu Loyverse.
 */
export const ShowOnWebCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData, collectionSlug }) => {
  const { config } = useConfig()
  const [checked, setChecked] = useState(Boolean(cellData))
  const [busy, setBusy] = useState(false)

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked
    setChecked(next)
    setBusy(true)
    try {
      const res = await fetch(`${config.routes.api}/${collectionSlug}/${rowData.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnWeb: next }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setChecked(!next)
      toast.error('Gagal menyimpan. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: busy ? 'wait' : 'pointer' }}>
      <input type="checkbox" checked={checked} disabled={busy} onChange={onChange} style={{ width: 18, height: 18, cursor: 'inherit' }} />
      <span style={{ opacity: 0.7 }}>{checked ? 'Tampil' : 'Disembunyikan'}</span>
    </label>
  )
}
