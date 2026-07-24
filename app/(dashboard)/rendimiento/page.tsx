'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, I } from '@/components/crm-icons'
import styles from './rendimiento.module.css'
import { PeriodSelector, type RangeKey } from './period'
import { buildCockpit, type CapiRollup, type Data } from './mock'

// ============================================================
// DEMO · Rendimiento de clientes — cockpit de agencia.
// Todos los clientes de un vistazo: KPIs (con delta + sparkline) + salud CAPI.
// Datos MOCK (ver ./mock.ts); en el producto real vienen de /api/admin/rendimiento.
// ============================================================

const AVATAR_COLORS = ['#0A8F66', '#3E7BFA', '#16A06A', '#7A2D9C', '#232B3D', '#E3A008', '#0EA5E9']
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(name: string): string {
  const w = name.trim().split(/\s+/)
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
const nf = (n: number) => n.toLocaleString('es-ES')
const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €'
const eur2 = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

function relTime(iso: string | null): string {
  if (!iso) return 'sin actividad'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

function Spark({ data, w = 78, h = 26 }: { data: number[]; w?: number; h?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / rng) * (h - 6)] as const)
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  const last = pts[pts.length - 1]
  const up = data[data.length - 1] >= data[0]
  const c = up ? 'var(--tide-ink)' : 'var(--err)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible', flex: '0 0 auto' }} aria-hidden="true">
      <polygon points={area} fill={c} opacity={0.1} />
      <polyline points={line} fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={c} />
    </svg>
  )
}

function Delta({ value, goodUp }: { value: number; goodUp: boolean }) {
  const up = value >= 0
  const good = goodUp ? up : !up
  return (
    <span className={`${styles.delta} ${good ? styles.deltaUp : styles.deltaDown}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'none' : 'scaleY(-1)' }}>
        <path d="M4 18 L10 12 L14 15 L20 7" /><path d="M15 7 H20 V12" />
      </svg>
      {up ? '+' : ''}{value}%
    </span>
  )
}

const CAPI_LABEL: Record<CapiRollup['estado'], string> = { ok: 'Activa', warn: 'Con errores', off: 'Inactiva', unset: 'Sin configurar' }
const CAPI_CLASS: Record<CapiRollup['estado'], string> = { ok: styles.chipOk, warn: styles.chipWarn, off: styles.chipOff, unset: styles.chipUnset }

function CapiCell({ capi }: { capi: CapiRollup }) {
  let mini: ReactNode = null
  if (capi.estado === 'ok') mini = capi.ev7 === 0
    ? <span className={styles.mini}>activa · sin envíos aún</span>
    : <span className={styles.mini}><b>{capi.ev24}</b> ev · <b>{capi.acceptedPct}%</b> aceptados · {relTime(capi.lastEventAt)}</span>
  else if (capi.estado === 'warn') mini = <span className={`${styles.mini} ${styles.miniWarn}`}><b>{capi.errors7} errores</b> · {capi.acceptedPct}% aceptados</span>
  else if (capi.estado === 'off') mini = <span className={styles.mini}>desactivada por el cliente</span>
  else mini = <span className={styles.mini}>falta pixel + token</span>
  return (
    <div className={styles.capiCell}>
      <span className={`${styles.chip} ${CAPI_CLASS[capi.estado]}`}><span className={styles.dot} />{CAPI_LABEL[capi.estado]}</span>
      {mini}
    </div>
  )
}

export default function RendimientoPage() {
  const [data, setData] = useState<Data | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading')
  const [q, setQ] = useState('')
  const [range, setRange] = useState<RangeKey>('30d')
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo] = useState('')
  const router = useRouter()

  // DEMO: sin backend — construimos los datos mock en cliente (evita hydration mismatch).
  useEffect(() => {
    setData(buildCockpit())
    setStatus('ok')
  }, [range, cFrom, cTo])

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    return needle ? data.clientes.filter((c) => c.nombre.toLowerCase().includes(needle)) : data.clientes
  }, [data, q])

  if (status === 'loading') return <div className={styles.page}><div className={styles.state}><div className={styles.spinner} />Cargando rendimiento de clientes…</div></div>
  if (status === 'forbidden') return <div className={styles.page}><div className={styles.state}>Esta vista es solo para administradores de la agencia.</div></div>
  if (status === 'error' || !data) return <div className={styles.page}><div className={styles.state}>No se pudo cargar el rendimiento. Reintenta en un momento.</div></div>

  const t = data.totals
  const capiSub = t.capiConErrores > 0 ? `${t.capiActivas} activas · ${t.capiConErrores} con errores` : `${t.capiActivas} activas · sin errores`

  const metricTiles = [
    { k: 'Leads', v: nf(t.leads), delta: t.leadsDelta, goodUp: true, spark: t.series.leads },
    { k: 'Pipeline abierto', v: eur(t.pipeline), delta: t.pipelineDelta, goodUp: true, spark: t.series.pipeline },
    { k: 'Ventas cerradas', v: eur(t.ventas), delta: t.ventasDelta, goodUp: true, spark: t.series.ventas },
    { k: 'Coste por lead medio', v: t.cpl != null ? eur2(t.cpl) : '—', delta: t.cplDelta, goodUp: false, caption: 'gasto manual' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <span className={styles.count}>{t.clientes} {t.clientes === 1 ? 'cliente activo' : 'clientes activos'}</span>
        <span className={styles.spacer} />
        <label className={styles.search}>
          <Icon d={I.search} size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" />
        </label>
        <PeriodSelector range={range} onRange={setRange} from={cFrom} to={cTo} onCustom={(f, tt) => { setCFrom(f); setCTo(tt) }} />
      </div>

      <div className={styles.tiles}>
        {metricTiles.map((tile) => (
          <div key={tile.k} className={styles.tile}>
            <div className={styles.tileK}>{tile.k}</div>
            <div className={styles.tileV}>{tile.v}</div>
            <div className={styles.tileFoot}>
              <Delta value={tile.delta} goodUp={tile.goodUp} />
              {tile.spark ? <Spark data={tile.spark} /> : <span className={styles.tileCaption}>{tile.caption}</span>}
            </div>
          </div>
        ))}
        <div className={styles.tile}>
          <div className={styles.tileK}>Salud CAPI global</div>
          <div className={styles.tileV}>{t.capiActivas}/{t.clientes}</div>
          <div className={styles.tileFoot}>
            <span className={styles.tileCaption}>{capiSub}</span>
            {t.capiConErrores > 0 && <span className={`${styles.chip} ${styles.chipWarn}`}><span className={styles.dot} />{t.capiConErrores} con errores</span>}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardH}>
          <h2>Clientes</h2>
          <span className={styles.hint}>Ordenado por leads</span>
          <span className={styles.spacer} />
          <span className={styles.pill}><Icon d={I.target} size={13} />Salud CAPI en vivo</span>
        </div>
        <div className={styles.tscroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th className={styles.numR}>Leads</th>
                <th className={styles.numR}>Citas</th>
                <th className={styles.numR}>Ventas</th>
                <th className={styles.numR}>CPL</th>
                <th>Salud CAPI</th>
                <th aria-label="Detalle"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.tenant_id} className={styles.rowLink} onClick={() => router.push(`/rendimiento/${c.tenant_id}`)}>
                  <td>
                    <div className={styles.cli}>
                      <span className={styles.mk} style={{ background: avatarColor(c.nombre) }}>{initials(c.nombre)}</span>
                      <div><div className={styles.nm}>{c.nombre}</div><div className={styles.sc}>{c.email}</div></div>
                    </div>
                  </td>
                  <td className={styles.numR}>
                    <div className={styles.rowLeads}><span>{c.leads}</span><Spark data={c.sparkline} w={64} h={22} /></div>
                  </td>
                  <td className={styles.numR}>{c.citas}</td>
                  <td className={styles.numR}>{c.ventas ? eur(c.ventas) : '—'}</td>
                  <td className={styles.numR}>{c.cpl != null ? eur2(c.cpl) : '—'}</td>
                  <td><CapiCell capi={c.capi} /></td>
                  <td style={{ textAlign: 'right' }}><Icon d={I.chevronRight} size={16} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className={styles.state} style={{ padding: '32px' }}>{q ? 'Ningún cliente coincide con la búsqueda.' : 'Aún no hay clientes activos.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.note}>
        <Icon d={I.bulb} size={15} />
        <div>Datos de demostración. El CPL usa el gasto de campañas y la <b>Salud CAPI</b> refleja el estado de <code>capi_events</code>. Pulsa un cliente para ver su ficha completa con el recorrido por lead.</div>
      </div>
    </div>
  )
}
