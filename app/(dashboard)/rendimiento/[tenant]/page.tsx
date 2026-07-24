'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Icon, I } from '@/components/crm-icons'
import s from '../rendimiento.module.css'
import d from './detalle.module.css'
import { PeriodSelector, type RangeKey } from '../period'
import { buildDetail, buildAds, type CapiHead, type Detail, type AdsData } from '../mock'

// ============================================================
// DEMO · Ficha de cliente (/rendimiento/[tenant]) — tabs + salud CAPI + recorrido por lead.
// Datos MOCK (ver ../mock.ts). Sin backend, sin Meta Ads real, sin CapiConfigModal.
// ============================================================

const AVATAR_COLORS = ['#0A8F66', '#3E7BFA', '#16A06A', '#7A2D9C', '#232B3D', '#E3A008', '#0EA5E9']
const avatarColor = (name: string) => { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length] }
const initials = (name: string) => { const w = name.trim().split(/\s+/); return (w.length >= 2 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase() }
const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €'
const eur2 = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const trunc = (v: string, n = 22) => (v.length > n ? v.slice(0, n) + '…' : v)
function fmtTime(iso: string): string {
  const dt = new Date(iso), now = new Date()
  const hm = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const sameDay = dt.toDateString() === now.toDateString()
  if (sameDay) return `hoy ${hm}`
  const y = new Date(now.getTime() - 86400000)
  if (dt.toDateString() === y.toDateString()) return `ayer ${hm}`
  return dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' ' + hm
}
function relTime(iso: string | null): string {
  if (!iso) return 'sin actividad'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'ahora'; if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60); if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

const CAPI_LABEL: Record<CapiHead['estado'], string> = { ok: 'Activa', warn: 'Con errores', off: 'Inactiva', unset: 'Sin configurar' }
const CAPI_CLASS: Record<CapiHead['estado'], string> = { ok: s.chipOk, warn: s.chipWarn, off: s.chipOff, unset: s.chipUnset }

const CAPI_FLOWS: { key: string; wfKey: string; label: string; desc: string }[] = [
  { key: 'Lead', wfKey: 'Lead', label: 'Lead nuevo', desc: 'al entrar un lead' },
  { key: 'Schedule', wfKey: 'Schedule', label: 'Cita agendada', desc: 'al pasar a Reunión' },
  { key: 'Purchase', wfKey: 'Purchase', label: 'Venta cerrada', desc: 'al pasar a Cliente' },
  { key: 'LeadDisqualified', wfKey: 'lost', label: 'Lead perdido', desc: 'al pasar a Perdido' },
]

function Delta({ value, goodUp }: { value: number; goodUp: boolean }) {
  const up = value >= 0, good = goodUp ? up : !up
  return (
    <span className={`${s.delta} ${good ? s.deltaUp : s.deltaDown}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? 'none' : 'scaleY(-1)' }}>
        <path d="M4 18 L10 12 L14 15 L20 7" /><path d="M15 7 H20 V12" />
      </svg>
      {up ? '+' : ''}{value}%
    </span>
  )
}

function ChartBars({ daily }: { daily: Detail['capiDaily'] }) {
  const W = 320, H = 90, n = daily.length, gap = W / n, bw = gap * 0.6
  const max = Math.max(1, ...daily.map((x) => x.accepted + x.error))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={d.chartBars} aria-hidden="true">
      {daily.map((day, i) => {
        const x = i * gap + (gap - bw) / 2
        const ah = (day.accepted / max) * (H - 14), eh = (day.error / max) * (H - 14)
        return (
          <g key={i}>
            <rect x={x} y={H - ah} width={bw} height={ah} rx={2} fill="var(--tide-ink)" opacity={0.85} />
            {day.error > 0 && <rect x={x} y={H - ah - eh} width={bw} height={eh} rx={2} fill="var(--err)" />}
          </g>
        )
      })}
    </svg>
  )
}

function EstadoPill({ estado }: { estado: string }) {
  if (estado === 'accepted') return <span className={`${d.st} ${d.stAcc}`}><Icon d={I.check} size={14} />Aceptado</span>
  if (estado === 'error') return <span className={`${d.st} ${d.stErr}`}><Icon d={I.alert} size={14} />Error</span>
  return <span className={`${d.st} ${d.stSkip}`}><Icon d={I.close} size={14} />Omitido</span>
}

export default function ClienteDetallePage() {
  const params = useParams<{ tenant: string }>()
  const tenant = params?.tenant
  const router = useRouter()
  const [data, setData] = useState<Detail | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading')
  const [tab, setTab] = useState<'resumen' | 'metaads' | 'atribucion' | 'capi' | 'leads'>('resumen')
  const [openLead, setOpenLead] = useState<{ id: string; nombre: string } | null>(null)
  const [range, setRange] = useState<RangeKey>('30d')
  const [cFrom, setCFrom] = useState('')
  const [cTo, setCTo] = useState('')
  const [ads, setAds] = useState<AdsData | null>(null)
  const [adsStatus, setAdsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [adsLevel, setAdsLevel] = useState<'campaign' | 'adset' | 'ad'>('campaign')
  const [adsCrumb, setAdsCrumb] = useState<{ campaign?: { id: string; name: string }; adset?: { id: string; name: string } }>({})

  // DEMO: sin backend — construimos el detalle mock en cliente.
  useEffect(() => {
    if (!tenant) return
    const detail = buildDetail(tenant)
    if (!detail) { setStatus('error'); return }
    setData(detail); setStatus('ok')
  }, [tenant, range, cFrom, cTo])

  // Al cambiar de cliente, volver al nivel de campañas.
  useEffect(() => { setAdsLevel('campaign'); setAdsCrumb({}) }, [tenant])

  // Datos de Meta Ads (lazy + drill-down campaña → conjunto → anuncio) — mock local.
  useEffect(() => {
    if (tab !== 'metaads' || !tenant) return
    setAdsStatus('loading')
    const parent = adsLevel === 'adset' ? adsCrumb.campaign?.id : adsLevel === 'ad' ? adsCrumb.adset?.id : ''
    setAds(buildAds(tenant, adsLevel, parent))
    setAdsStatus('ok')
  }, [tab, tenant, range, cFrom, cTo, adsLevel, adsCrumb])

  const timeline = useMemo(() => {
    if (!data || !openLead) return []
    const lead = data.leads.find((l) => l.id === openLead.id)
    const nodes: { kind: 'info' | 'acc' | 'err' | 'skip'; title: string; time: string; sub: string; resp: [string, string][] }[] = []
    if (lead?.fbclid) nodes.push({ kind: 'info', title: 'Visita desde anuncio', time: lead.created_at, sub: 'clic del anuncio capturado', resp: [['fbclid', trunc(lead.fbclid, 20)]] })
    const evs = data.eventos.filter((e) => e.lead_id === openLead.id).slice().reverse()
    for (const e of evs) {
      const kind = e.estado === 'accepted' ? 'acc' : e.estado === 'error' ? 'err' : 'skip'
      const resp: [string, string][] = []
      if (e.events_received != null) resp.push(['events_received', String(e.events_received)])
      if (e.value != null) resp.push(['value', eur2(e.value)])
      if (e.fbtrace_id) resp.push(['fbtrace_id', trunc(e.fbtrace_id, 20)])
      if (e.error) resp.push(['error', e.error])
      if (e.reason) resp.push(['motivo', e.reason])
      const verb = e.estado === 'accepted' ? 'enviado a Meta' : e.estado === 'error' ? 'no llegó a Meta' : 'omitido'
      nodes.push({ kind, title: `${e.event_name} — ${verb}`, time: e.created_at, sub: '', resp })
    }
    return nodes
  }, [data, openLead])

  if (status === 'loading') return <div className={s.page}><div className={s.state}><div className={s.spinner} />Cargando cliente…</div></div>
  if (status === 'forbidden') return <div className={s.page}><div className={s.state}>Esta vista es solo para administradores de la agencia.</div></div>
  if (status === 'error' || !data) return <div className={s.page}><div className={s.state}>No se pudo cargar el cliente. Reintenta en un momento.</div></div>

  const c = data
  const capi = c.capi
  const nodeClass = (k: string) => k === 'acc' ? d.nodeAcc : k === 'err' ? d.nodeErr : k === 'info' ? d.nodeInfo : ''
  const nodeIcon = (k: string) => k === 'acc' ? I.check : k === 'err' ? I.alert : k === 'info' ? I.pin : I.close

  return (
    <div className={s.page}>
      <div className={s.headRow}>
        <div className={d.crumb}>
          <button className={d.crumbBtn} onClick={() => router.push('/rendimiento')}><Icon d={I.chevronLeft} size={15} />Rendimiento</button>
          <Icon d={I.chevronRight} size={13} />
          <span className={d.crumbNow}>{c.nombre}</span>
        </div>
        <span className={s.spacer} />
        <PeriodSelector range={range} onRange={setRange} from={cFrom} to={cTo} onCustom={(f, t) => { setCFrom(f); setCTo(t) }} />
      </div>

      <div className={d.chead}>
        <span className={d.cheadMk} style={{ background: avatarColor(c.nombre) }}>{initials(c.nombre)}</span>
        <div><h1 className={d.cheadName}>{c.nombre}</h1><div className={d.cheadMeta}>{c.email}</div></div>
        <span className={s.spacer} />
        <span className={`${s.chip} ${CAPI_CLASS[capi.estado]}`}><span className={s.dot} />{CAPI_LABEL[capi.estado]}</span>
      </div>

      <div className={s.tiles}>
        {[
          { k: 'Leads', v: c.kpis.leads.toLocaleString('es-ES'), delta: c.kpis.leadsDelta, goodUp: true },
          { k: 'Citas', v: String(c.kpis.citas), delta: c.kpis.citasDelta, goodUp: true },
          { k: 'Ventas abiertas', v: c.kpis.ventasAbiertas ? eur(c.kpis.ventasAbiertas) : '—', delta: c.kpis.ventasAbiertasDelta, goodUp: true },
          { k: 'Ventas cerradas', v: c.kpis.ventas ? eur(c.kpis.ventas) : '—', delta: c.kpis.ventasDelta, goodUp: true },
          { k: 'Coste por lead', v: c.kpis.cpl != null ? eur2(c.kpis.cpl) : '—', delta: c.kpis.cplDelta, goodUp: false },
        ].map((t) => (
          <div key={t.k} className={s.tile}>
            <div className={s.tileK}>{t.k}</div>
            <div className={s.tileV}>{t.v}</div>
            <div className={s.tileFoot}><Delta value={t.delta} goodUp={t.goodUp} /><span className={s.tileCaption}>vs. 30d previos</span></div>
          </div>
        ))}
      </div>

      <div className={d.subtabs} role="tablist">
        {([
          { id: 'resumen' as const, label: 'Resumen', icon: I.clipboard, show: true },
          { id: 'metaads' as const, label: 'Meta Ads', icon: I.campaigns, show: !!c.metaAdsActivo },
          { id: 'atribucion' as const, label: 'Atribución', icon: I.chart, show: true },
          { id: 'capi' as const, label: 'Salud CAPI', icon: I.target, show: true },
          { id: 'leads' as const, label: 'Leads', icon: I.team, show: true },
        ]).filter((t) => t.show).map((t) => (
          <button key={t.id} className={`${d.subtab} ${tab === t.id ? d.subtabOn : ''}`} onClick={() => setTab(t.id)}>
            <Icon d={t.icon} size={15} />{t.label}
            {t.id === 'capi' && capi.errors7 > 0 && <span className={d.badge}>{capi.errors7}</span>}
          </button>
        ))}
      </div>

      {/* RESUMEN */}
      {tab === 'resumen' && (
        <div className={d.panel}><div className={d.grid2}>
          <div className={s.card}><div className={s.cardH}><h2>Embudo</h2></div>
            <div className={`${d.pad} ${d.kv}`}>
              <div className={d.kvRow}><span className={d.lab}>Leads captados</span><span className={d.val}>{c.kpis.leads}</span></div>
              <div className={d.kvRow}><span className={d.lab}>Citas agendadas</span><span className={d.val}>{c.kpis.citas}</span></div>
              <div className={d.kvRow}><span className={d.lab}>Ventas abiertas</span><span className={d.val}>{c.kpis.ventasAbiertas ? eur(c.kpis.ventasAbiertas) : '—'}</span></div>
              <div className={d.kvRow}><span className={d.lab}>Ventas cerradas</span><span className={d.val}>{c.kpis.ventas ? eur(c.kpis.ventas) : '—'}</span></div>
              <div className={d.kvRow}><span className={d.lab}>Coste por lead</span><span className={d.val}>{c.kpis.cpl != null ? eur2(c.kpis.cpl) : '—'}</span></div>
            </div>
          </div>
          <div className={`${s.card} ${d.healthCard}`}>
            <div className={d.healthTop}><h2 style={{ margin: 0, fontSize: 15 }}>Salud del tracking</h2><span className={`${s.chip} ${CAPI_CLASS[capi.estado]}`}><span className={s.dot} />{CAPI_LABEL[capi.estado]}</span></div>
            <div className={d.gauge}><b>{capi.acceptedPct != null ? `${capi.acceptedPct}%` : '—'}</b><span>eventos aceptados (7d)</span></div>
            <div className={d.hbar}><i style={{ width: `${capi.acceptedPct ?? 0}%` }} /></div>
            <div className={d.kv}>
              <div className={d.kvRow}><span className={d.lab}>Eventos (24h)</span><span className={d.val}>{capi.ev24}</span></div>
              <div className={d.kvRow}><span className={d.lab}>Errores (7d)</span><span className={d.val}>{capi.errors7}</span></div>
              <div className={d.kvRow}><span className={d.lab}>Último evento</span><span className={d.val}>{relTime(capi.lastEventAt)}</span></div>
            </div>
            <button className={d.subtab} style={{ alignSelf: 'flex-start', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }} onClick={() => setTab('capi')}><Icon d={I.target} size={15} />Ver actividad CAPI</button>
          </div>
        </div></div>
      )}

      {/* META ADS */}
      {tab === 'metaads' && (
        <div className={d.panel}>
          {adsStatus === 'error' && <div className={s.card}><div className={s.state} style={{ padding: 40 }}>No se pudieron cargar los datos de Meta Ads.</div></div>}
          {adsStatus === 'ok' && ads?.configured === false && <div className={s.card}><div className={s.state} style={{ padding: 40 }}>Este cliente no tiene Meta Ads configurado.</div></div>}
          {adsStatus === 'ok' && ads?.error && <div className={s.card}><div className={s.state} style={{ padding: 40 }}>Meta devolvió un error: {ads.error}</div></div>}
          {(adsStatus === 'loading' || (adsStatus === 'ok' && ads && ads.configured !== false && !ads.error)) && (() => {
            const cur = ads?.currency || 'EUR'
            const money = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (cur === 'EUR' ? ' €' : ' ' + cur)
            const intl = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 })
            const acc = ads?.account
            const rows = ads?.rows ?? []
            const nivelSing = adsLevel === 'campaign' ? 'Campaña' : adsLevel === 'adset' ? 'Conjunto' : 'Anuncio'
            const nivelPlur = adsLevel === 'campaign' ? 'campañas' : adsLevel === 'adset' ? 'conjuntos' : 'anuncios'
            const canDrill = adsLevel !== 'ad'
            const cols = adsLevel === 'campaign' ? 8 : 7
            return (
              <>
                {adsLevel === 'campaign' && acc && (
                  <div className={s.card}>
                    <div className={s.cardH}><h2>Cuenta de anuncios</h2><span className={s.hint}>{ads?.accountName || ads?.adAccountId} · datos en vivo de Meta</span></div>
                    <div className={s.tiles} style={{ padding: 16 }}>
                      {[
                        { k: 'Gasto', v: money(acc.spend) },
                        { k: 'Resultados', v: intl(acc.results) },
                        { k: 'Coste / resultado', v: acc.costPerResult != null ? money(acc.costPerResult) : '—' },
                        { k: 'Impresiones', v: intl(acc.impressions) },
                        { k: 'Clics', v: intl(acc.clicks) },
                        { k: 'CTR', v: acc.ctr.toFixed(2) + ' %' },
                        { k: 'CPM', v: money(acc.cpm) },
                        { k: 'Alcance', v: intl(acc.reach) },
                      ].map((t) => (<div key={t.k} className={s.tile}><div className={s.tileK}>{t.k}</div><div className={s.tileV}>{t.v}</div></div>))}
                    </div>
                  </div>
                )}
                <div className={s.card}>
                  <div className={s.cardH}>
                    <div className={d.crumb} style={{ margin: 0 }}>
                      <button className={d.crumbBtn} disabled={adsLevel === 'campaign'} onClick={() => { setAdsLevel('campaign'); setAdsCrumb({}) }}>Campañas</button>
                      {adsCrumb.campaign && <><Icon d={I.chevronRight} size={13} /><button className={d.crumbBtn} disabled={adsLevel === 'adset'} onClick={() => { setAdsLevel('adset'); setAdsCrumb((cc) => ({ campaign: cc.campaign })) }}>{trunc(adsCrumb.campaign.name, 26)}</button></>}
                      {adsCrumb.adset && <><Icon d={I.chevronRight} size={13} /><span className={d.crumbNow}>{trunc(adsCrumb.adset.name, 26)}</span></>}
                    </div>
                    <span className={s.spacer} />
                    {canDrill && <span className={s.hint}>pulsa una fila para el desglose</span>}
                  </div>
                  <div className={s.tscroll}><table className={s.table}>
                    <thead><tr>
                      <th>{nivelSing}</th>
                      {adsLevel === 'campaign' && <th>Estado</th>}
                      <th className={s.numR}>Gasto</th><th className={s.numR}>Resultados</th><th className={s.numR}>Coste/res.</th>
                      <th className={s.numR}>CTR</th><th className={s.numR}>CPM</th><th className={s.numR}>Impresiones</th>
                    </tr></thead>
                    <tbody>
                      {adsStatus === 'loading' && <tr><td colSpan={cols} className={s.state} style={{ padding: 28 }}><div className={s.spinner} />Cargando {nivelPlur}…</td></tr>}
                      {adsStatus === 'ok' && rows.map((r) => {
                        const on = r.effectiveStatus === 'ACTIVE'
                        const drill = () => {
                          if (adsLevel === 'campaign') { setAdsCrumb({ campaign: { id: r.id, name: r.nombre } }); setAdsLevel('adset') }
                          else if (adsLevel === 'adset') { setAdsCrumb((cc) => ({ ...cc, adset: { id: r.id, name: r.nombre } })); setAdsLevel('ad') }
                        }
                        return (
                          <tr key={r.id} onClick={canDrill ? drill : undefined} style={{ cursor: canDrill ? 'pointer' : 'default' }}>
                            <td><span className={s.nm}>{r.nombre}</span></td>
                            {adsLevel === 'campaign' && <td><span className={`${s.chip} ${on ? s.chipOk : s.chipOff}`}><span className={s.dot} />{on ? 'Activa' : r.effectiveStatus === 'PAUSED' ? 'Pausada' : (r.effectiveStatus || '—')}</span></td>}
                            <td className={s.numR}>{money(r.spend)}</td>
                            <td className={s.numR}>{intl(r.results)}</td>
                            <td className={s.numR}>{r.costPerResult != null ? money(r.costPerResult) : '—'}</td>
                            <td className={s.numR}>{r.ctr.toFixed(2)} %</td>
                            <td className={s.numR}>{money(r.cpm)}</td>
                            <td className={s.numR}>{intl(r.impressions)}</td>
                          </tr>
                        )
                      })}
                      {adsStatus === 'ok' && rows.length === 0 && <tr><td colSpan={cols} className={s.state} style={{ padding: 28 }}>Sin {nivelPlur} en el periodo.</td></tr>}
                    </tbody>
                  </table></div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ATRIBUCION */}
      {tab === 'atribucion' && (
        <div className={d.panel}>
          <div className={s.card}>
            <div className={s.cardH}><h2>Atribución</h2><span className={s.hint}>Campaña → Conjunto → Anuncio · leads del CRM</span></div>
            <div className={s.tscroll}><table className={s.table}>
              <thead><tr><th>Campaña / Conjunto / Anuncio</th><th className={s.numR}>Leads</th><th className={s.numR}>Ventas</th><th className={s.numR}>Valor</th></tr></thead>
              <tbody>
                {c.atribucion.map((a, i) => (
                  <tr key={i}><td style={{ paddingLeft: 16 + a.nivel * 20, color: a.nivel === 2 ? 'var(--fg-muted)' : undefined }}>{a.nivel === 0 ? <b>{a.nombre}</b> : a.nombre}</td><td className={s.numR}>{a.leads}</td><td className={s.numR}>{a.ventas}</td><td className={s.numR}>{a.valor ? eur(a.valor) : '—'}</td></tr>
                ))}
                {c.atribucion.length === 0 && <tr><td colSpan={4} className={s.state} style={{ padding: 28 }}>Sin datos de atribución en el periodo.</td></tr>}
              </tbody>
            </table></div>
          </div>
          <div className={s.note}><Icon d={I.bulb} size={15} /><div>La jerarquía sale de las UTM del lead (<code>utm_term</code> = conjunto, <code>utm_content</code> = anuncio). Si el cliente no pone los parámetros dinámicos en Meta, cae en "(sin conjunto)".</div></div>
        </div>
      )}

      {/* SALUD CAPI */}
      {tab === 'capi' && (
        <div className={d.panel}>
          <div className={d.grid2}>
            <div className={s.card}><div className={s.cardH}><h2>Eventos por día (14d)</h2><span className={s.spacer} /><span className={s.hint}>aceptados vs. error</span></div>
              <div className={d.chart}>{c.eventos.length ? <ChartBars daily={c.capiDaily} /> : <div className={s.state} style={{ padding: 24 }}>Sin eventos en 14 días.</div>}</div>
            </div>
            <div className={`${s.card} ${d.healthCard}`}>
              <div className={d.healthTop}><h2 style={{ margin: 0, fontSize: 15 }}>Estado de la conexión</h2><span className={`${s.chip} ${CAPI_CLASS[capi.estado]}`}><span className={s.dot} />{CAPI_LABEL[capi.estado]}</span></div>
              <div className={d.kv}>
                <div className={d.kvRow}><span className={d.lab}>Pixel / Dataset</span><span className={`${d.val} ${d.mono}`}>{capi.pixelId ?? '—'}</span></div>
                <div className={d.kvRow}><span className={d.lab}>Configuración</span><span className={d.val}>{capi.configurada ? (capi.activa ? 'activa' : 'inactiva') : 'sin pixel/token'}</span></div>
                <div className={d.kvRow}><span className={d.lab}>Modo</span><span className={d.val}>{capi.testMode ? 'prueba (test_event_code)' : 'eventos reales'}</span></div>
                <div className={d.kvRow}><span className={d.lab}>Aceptados (7d)</span><span className={d.val}>{capi.acceptedPct != null ? `${capi.acceptedPct}%` : '—'}</span></div>
              </div>
            </div>
          </div>
          <div className={s.card}>
            <div className={s.cardH}><h2>Flujos CAPI</h2><span className={s.hint}>estado de cada flujo y cuántas veces se ha activado</span></div>
            <div className={d.flows}>
              {CAPI_FLOWS.map((fl) => {
                const st = c.capiFlows[fl.key] ?? { total: 0, accepted: 0, error: 0, skipped: 0, lastAt: null }
                const wf = c.capiWorkflows[fl.wfKey] ?? { exists: false, live: false }
                return (
                  <div key={fl.key} className={d.flowCard}>
                    <div className={d.flowTop}><span className={d.flowName}>{fl.label}</span><span className={d.flowTotal}>{st.total}</span></div>
                    <div className={d.flowDesc}>{fl.desc}</div>
                    {wf.live
                      ? <span className={`${s.chip} ${s.chipOk}`}><span className={s.dot} />Flujo activo</span>
                      : wf.exists
                        ? <span className={`${s.chip} ${s.chipOff}`}><span className={s.dot} />Flujo pausado</span>
                        : <span className={`${s.chip} ${s.chipWarn}`}><span className={s.dot} />Falta el flujo</span>}
                    <div className={d.flowStats}>
                      <span className={`${d.st} ${d.stAcc}`}><Icon d={I.check} size={13} />{st.accepted}</span>
                      {st.error > 0 && <span className={`${d.st} ${d.stErr}`}><Icon d={I.alert} size={13} />{st.error}</span>}
                      {st.skipped > 0 && <span className={`${d.st} ${d.stSkip}`}>{st.skipped} omit.</span>}
                    </div>
                    <div className={d.flowLast}>{st.lastAt ? `último: ${fmtTime(st.lastAt)}` : 'sin activaciones'}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className={s.card}>
            <div className={s.cardH}><h2>Actividad reciente</h2><span className={s.hint}>últimos envíos y la respuesta de Meta</span><span className={s.spacer} /><span className={s.pill}>Pulsa una fila para el recorrido del lead</span></div>
            <div className={s.tscroll}><table className={s.table}>
              <thead><tr><th>Hora</th><th>Lead</th><th>Evento</th><th className={s.numR}>Valor</th><th>Estado</th><th>Respuesta de Meta</th></tr></thead>
              <tbody>
                {c.eventos.map((e) => (
                  <tr key={e.id} style={{ cursor: e.lead_id ? 'pointer' : 'default' }} onClick={() => e.lead_id && setOpenLead({ id: e.lead_id, nombre: e.leadNombre })}>
                    <td style={{ color: 'var(--fg-subtle)' }}>{fmtTime(e.created_at)}</td>
                    <td><span className={s.nm}>{e.leadNombre}</span></td>
                    <td><span className={s.pill}>{e.event_name}</span></td>
                    <td className={s.numR}>{e.value != null ? eur(e.value) : '—'}</td>
                    <td><EstadoPill estado={e.estado} /></td>
                    <td className={d.mono}>{e.estado === 'error' ? <span className={d.respErrTxt}>{e.error ?? 'error'}</span> : e.estado === 'skipped' ? <span style={{ color: 'var(--fg-subtle)' }}>{e.reason ?? 'omitido'}</span> : `events_received: ${e.events_received ?? 0}`}</td>
                  </tr>
                ))}
                {c.eventos.length === 0 && <tr><td colSpan={6} className={s.state} style={{ padding: 28 }}>Sin actividad CAPI todavía.</td></tr>}
              </tbody>
            </table></div>
          </div>
        </div>
      )}

      {/* LEADS */}
      {tab === 'leads' && (
        <div className={d.panel}><div className={s.card}>
          <div className={s.cardH}><h2>Leads</h2><span className={s.hint}>estado, origen y si su conversión llegó a Meta</span></div>
          <div className={s.tscroll}><table className={s.table}>
            <thead><tr><th>Lead</th><th>Fecha y hora</th><th>Estado</th><th>Origen</th><th className={s.numR}>Valor</th><th>CAPI</th><th>Conversión</th></tr></thead>
            <tbody>
              {c.leads.map((l) => {
                const cap = l.capi
                const capiCell = cap.error > 0
                  ? <span className={`${s.chip} ${s.chipWarn}`}><span className={s.dot} />{cap.error} con error</span>
                  : cap.accepted > 0 ? <span className={`${s.chip} ${s.chipOk}`}><span className={s.dot} />{cap.accepted} enviados</span>
                  : cap.skipped > 0 ? <span className={`${s.chip} ${s.chipOff}`}><span className={s.dot} />omitido</span>
                  : <span className={s.mini}>sin eventos</span>
                return (
                  <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setOpenLead({ id: l.id, nombre: l.nombre })}>
                    <td><span className={s.nm}>{l.nombre}</span></td>
                    <td style={{ color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{fmtTime(l.created_at)}</td>
                    <td><span className={s.pill}>{l.estado}</span></td>
                    <td style={{ color: 'var(--fg-muted)' }}>{l.origen}</td>
                    <td className={s.numR}>{l.valor ? eur(l.valor) : '—'}</td>
                    <td>{capiCell}</td>
                    <td>{l.won ? <span className={`${s.chip} ${s.chipOk}`}><span className={s.dot} />Sí</span> : <span className={s.mini}>—</span>}</td>
                  </tr>
                )
              })}
              {c.leads.length === 0 && <tr><td colSpan={7} className={s.state} style={{ padding: 28 }}>Sin leads en el periodo.</td></tr>}
            </tbody>
          </table></div>
        </div></div>
      )}

      {/* DRAWER: recorrido del lead */}
      <div className={`${d.scrim} ${openLead ? d.scrimShow : ''}`} onClick={() => setOpenLead(null)} />
      <aside className={`${d.drawer} ${openLead ? d.drawerShow : ''}`} aria-label="Recorrido del lead">
        <div className={d.drawerH}>
          <Icon d={I.target} size={18} />
          <h3>{openLead?.nombre ?? 'Lead'}</h3>
          <button className={d.drawerX} onClick={() => setOpenLead(null)} aria-label="Cerrar"><Icon d={I.close} size={15} /></button>
        </div>
        <div className={d.drawerB}>
          {openLead && timeline.length === 0 && <div className={s.note}><Icon d={I.bulb} size={15} /><div>Este lead aún no tiene eventos CAPI registrados.</div></div>}
          {openLead && timeline.length > 0 && <>
            <div className={d.tlLabel}>Recorrido de tracking</div>
            <div className={d.tl}>
              {timeline.map((n, i) => (
                <div key={i} className={d.ev}>
                  <div className={`${d.node} ${nodeClass(n.kind)}`}><Icon d={nodeIcon(n.kind)} size={13} /></div>
                  <div className={d.evBody}>
                    <div className={d.evTop}><span className={d.evName}>{n.title}</span><span className={d.evTime}>{fmtTime(n.time)}</span></div>
                    {n.sub && <div className={d.evSub}>{n.sub}</div>}
                    {n.resp.length > 0 && (
                      <div className={`${d.resp} ${n.kind === 'err' ? d.respErr : ''}`}>
                        {n.resp.map((r, j) => (<div key={j} className={d.respRow}><span className="l">{r[0]}</span><span className={`r ${d.mono}`}>{r[1]}</span></div>))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={s.note}><Icon d={I.bulb} size={15} /><div>Cada punto es un envío server-side (CAPI) con la respuesta de Meta. Así sabes, lead a lead, que la conversión llegó — o por qué no.</div></div>
          </>}
        </div>
      </aside>
    </div>
  )
}
