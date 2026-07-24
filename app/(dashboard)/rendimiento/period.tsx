'use client'

import styles from './rendimiento.module.css'

// Selector de periodo compartido por el cockpit y la ficha de cliente.

export type RangeKey = 'hoy' | '7d' | '30d' | 'mes' | 'trimestre' | 'todo' | 'custom'
export type RangeParams = { from?: string; to?: string; all?: boolean }

const DAY = 86400000

export function rangeParams(range: RangeKey, from?: string, to?: string): RangeParams {
  const now = Date.now()
  const iso = (t: number) => new Date(t).toISOString()
  switch (range) {
    case 'hoy': { const d = new Date(); d.setHours(0, 0, 0, 0); return { from: d.toISOString(), to: iso(now) } }
    case '7d': return { from: iso(now - 7 * DAY), to: iso(now) }
    case '30d': return { from: iso(now - 30 * DAY), to: iso(now) }
    case 'mes': { const d = new Date(); return { from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(), to: iso(now) } }
    case 'trimestre': return { from: iso(now - 90 * DAY), to: iso(now) }
    case 'todo': return { all: true }
    case 'custom': return {
      from: from ? new Date(from + 'T00:00:00').toISOString() : undefined,
      to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
    }
  }
}

export function toQuery(p: RangeParams): string {
  const q = new URLSearchParams()
  if (p.all) q.set('all', '1')
  if (p.from) q.set('from', p.from)
  if (p.to) q.set('to', p.to)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const RANGE_LABEL: Record<RangeKey, string> = {
  hoy: 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', mes: 'Este mes',
  trimestre: 'Último trimestre', todo: 'Todo el histórico', custom: 'Personalizado',
}

const OPTIONS: { k: RangeKey; label: string }[] = [
  { k: 'hoy', label: 'Hoy' }, { k: '7d', label: '7 días' }, { k: '30d', label: '30 días' },
  { k: 'mes', label: 'Mes' }, { k: 'trimestre', label: 'Trimestre' }, { k: 'todo', label: 'Todo' }, { k: 'custom', label: 'Person.' },
]

export function PeriodSelector({ range, onRange, from, to, onCustom }: {
  range: RangeKey
  onRange: (r: RangeKey) => void
  from?: string
  to?: string
  onCustom?: (from: string, to: string) => void
}) {
  return (
    <div className={styles.periodWrap}>
      <div className={styles.seg} role="group" aria-label="Periodo">
        {OPTIONS.map((o) => (
          <button key={o.k} className={`${styles.segBtn} ${range === o.k ? styles.segOn : ''}`} onClick={() => onRange(o.k)}>{o.label}</button>
        ))}
      </div>
      {range === 'custom' && onCustom && (
        <div className={styles.customRange}>
          <input type="date" value={from ?? ''} max={to || undefined} onChange={(e) => onCustom(e.target.value, to ?? '')} aria-label="Desde" />
          <span>→</span>
          <input type="date" value={to ?? ''} min={from || undefined} onChange={(e) => onCustom(from ?? '', e.target.value)} aria-label="Hasta" />
        </div>
      )}
    </div>
  )
}
