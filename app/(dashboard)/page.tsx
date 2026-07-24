'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, Legend
} from 'recharts'
import { usePipelineColumns } from '@/lib/hooks/usePipelineColumns'
import { Icon, I } from '@/components/crm-icons'
import DateRangeCalendar from '@/components/DateRangeCalendar'

const DEFAULT_COLUMNS = [
  { id: "nuevo", label: "Nuevo", color: "#14C8A4" },
  { id: "contactado", label: "Contactado", color: "#0ea5e9" },
  { id: "caliente", label: "Caliente", color: "#f59e0b" },
  { id: "negociacion", label: "Negociación", color: "#8b5cf6" },
  { id: "reunion", label: "Reunión", color: "#f97316" },
  { id: "cliente", label: "Cliente", color: "#10b981" },
]

const chartContainerStyle = { background: "var(--white)", borderRadius: "var(--r-lg)", padding: 24, border: "1px solid var(--border)" }
const chartTitleStyle = { fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 24, letterSpacing: "-0.01em" }

interface Lead {
  id: string
  nombre?: string
  nome?: string
  email?: string
  telefono?: string
  empresa?: string
  estado: string
  lead_score?: number
  valor_negociacion?: number
  motivo_perdida?: string
  canal?: string
  created_at: string
  updated_at?: string
}

type DateRange = 'hoy' | '7d' | '30d' | '90d' | 'ano' | 'todo' | 'custom'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'ano', label: 'Este año' },
  { value: 'todo', label: 'Todo' },
  { value: 'custom', label: 'Personalizado' },
]

const DAY_MS = 86400000
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const lastDayOfMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const rollingDays = (range: DateRange) => (range === 'hoy' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90)

/** Calcula [inicio, fin] del período activo. `offset` desplaza ventanas móviles y años (0 = actual, -1 = anterior). */
function computeRange(range: DateRange, offset: number, customStart: string, customEnd: string): { start: Date; end: Date } {
  const now = new Date()
  switch (range) {
    case 'hoy':
    case '7d':
    case '30d':
    case '90d': {
      const n = rollingDays(range)
      const anchor = startOfDay(now)
      anchor.setDate(anchor.getDate() + offset * n) // último día del bloque
      const s = new Date(anchor)
      s.setDate(s.getDate() - (n - 1))
      return { start: startOfDay(s), end: offset === 0 ? now : endOfDay(anchor) }
    }
    case 'ano': {
      const year = now.getFullYear() + offset
      return { start: new Date(year, 0, 1, 0, 0, 0, 0), end: offset === 0 ? now : new Date(year, 11, 31, 23, 59, 59, 999) }
    }
    case 'todo':
      return { start: new Date(2020, 0, 1), end: now }
    case 'custom': {
      if (!customStart) return { start: new Date(2020, 0, 1), end: now }
      const start = startOfDay(new Date(customStart + 'T00:00:00'))
      const end = customEnd ? endOfDay(new Date(customEnd + 'T00:00:00')) : now
      return { start, end }
    }
  }
}

/** Etiqueta legible del período activo (barra de flechas). */
function formatRangeLabel(range: DateRange, start: Date, end: Date): string {
  if (range === 'todo') return 'Histórico completo'
  if (range === 'ano') return String(start.getFullYear())
  // Rango de un solo día natural -> "Hoy" / "Ayer" / fecha suelta
  if (start.getDate() === end.getDate() && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const today = startOfDay(new Date())
    const diff = Math.round((today.getTime() - startOfDay(start).getTime()) / DAY_MS)
    if (diff === 0) return 'Hoy'
    if (diff === 1) return 'Ayer'
    const opts: Intl.DateTimeFormatOptions = start.getFullYear() === today.getFullYear()
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
    return start.toLocaleDateString('es-ES', opts)
  }
  // custom que es un mes natural completo -> "Mayo 2026"
  if (
    range === 'custom' &&
    start.getDate() === 1 && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear() &&
    end.getDate() === lastDayOfMonth(end.getFullYear(), end.getMonth())
  ) {
    const s = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const sameYear = start.getFullYear() === end.getFullYear()
  const short: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const long: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${start.toLocaleDateString('es-ES', short)} – ${end.toLocaleDateString('es-ES', sameYear ? short : long)}`
}

function StatCard({ label, value, icon, color, trend, suffix = "", isMoney = false }: {
  label: string; value: number; icon: string; color: string; trend?: number; suffix?: string; isMoney?: boolean
}) {
  const displayValue = isMoney ? value.toLocaleString('es-ES') : value
  return (
    <div className="crm-stat" style={{ overflow: "hidden" }}>
      <div className="crm-stat__kicker">{label}</div>
      <div className={`crm-stat__value${isMoney ? '' : ''}`}>
        {displayValue}<span className="unit">{suffix}</span>
      </div>
      {trend !== undefined && (
        <div className={`crm-stat__delta${trend < 0 ? ' is-down' : ''}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          <span className="crm-stat__delta-period">vs periodo anterior</span>
        </div>
      )}
      <div style={{
        position: "absolute", top: 16, right: 16, color,
        background: `color-mix(in srgb, ${color} 6%, transparent)`, width: 36, height: 36, borderRadius: "var(--r-sm)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon d={(I as Record<string, React.ReactNode>)[icon] ?? I.chart} size={19} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const { columns: dynamicColumns } = usePipelineColumns()
  const COLUMNS = dynamicColumns.length > 0 ? dynamicColumns : DEFAULT_COLUMNS.map(c => ({ ...c, es_ganado: c.id === 'cliente', es_perdido: false }))

  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [offset, setOffset] = useState(0)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => computeRange(dateRange, offset, customStart, customEnd),
    [dateRange, offset, customStart, customEnd]
  )
  const rangeLabel = useMemo(() => formatRangeLabel(dateRange, rangeStart, rangeEnd), [dateRange, rangeStart, rangeEnd])

  const selectRange = useCallback((r: DateRange) => {
    setDateRange(r)
    setOffset(0)
    setShowCalendar(r === 'custom')
  }, [])

  // Desplaza el período activo por su propia longitud. dir = -1 anterior, +1 siguiente.
  const shiftPeriod = useCallback((dir: -1 | 1) => {
    if (dateRange === 'custom') {
      if (!customStart || !customEnd) return
      const s = new Date(customStart + 'T00:00:00')
      const e = new Date(customEnd + 'T00:00:00')
      // Si el rango es un mes natural completo, saltar por meses (mismo período, mes anterior/siguiente).
      const wholeMonth = s.getDate() === 1 && e.getDate() === lastDayOfMonth(e.getFullYear(), e.getMonth())
      if (wholeMonth) {
        const months = (e.getFullYear() * 12 + e.getMonth()) - (s.getFullYear() * 12 + s.getMonth()) + 1
        const ns = new Date(s.getFullYear(), s.getMonth() + dir * months, 1)
        const neFirst = new Date(e.getFullYear(), e.getMonth() + dir * months, 1)
        const ne = new Date(neFirst.getFullYear(), neFirst.getMonth(), lastDayOfMonth(neFirst.getFullYear(), neFirst.getMonth()))
        setCustomStart(isoLocal(ns)); setCustomEnd(isoLocal(ne))
      } else {
        const spanDays = Math.round((startOfDay(e).getTime() - startOfDay(s).getTime()) / DAY_MS) + 1
        const ns = new Date(s); ns.setDate(ns.getDate() + dir * spanDays)
        const ne = new Date(e); ne.setDate(ne.getDate() + dir * spanDays)
        setCustomStart(isoLocal(ns)); setCustomEnd(isoLocal(ne))
      }
    } else {
      setOffset(o => Math.min(0, o + dir))
    }
  }, [dateRange, customStart, customEnd])

  const showNav = dateRange !== 'todo' && !(dateRange === 'custom' && (!customStart || !customEnd))
  const canForward = rangeEnd < startOfDay(new Date())

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false })
      if (error) throw error
      setAllLeads(data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const leads = useMemo(() => {
    return allLeads.filter(l => {
      const d = new Date(l.created_at)
      return d >= rangeStart && d <= rangeEnd
    })
  }, [allLeads, rangeStart, rangeEnd])

  const dashboardData = useMemo(() => {
    const rangeDurationMs = rangeEnd.getTime() - rangeStart.getTime()
    const prevStart = new Date(rangeStart.getTime() - rangeDurationMs)
    const prevEnd = new Date(rangeStart.getTime() - 1)

    const leadsPrevPeriod = allLeads.filter(l => {
      const d = new Date(l.created_at)
      return d >= prevStart && d <= prevEnd
    })

    const trend = leadsPrevPeriod.length === 0 ? 0 :
      Math.round(((leads.length - leadsPrevPeriod.length) / leadsPrevPeriod.length) * 100)

    const calientes = leads.filter(l => l.estado === "caliente").length
    const negociacion = leads.filter(l => l.estado === "negociacion").length

    const wonStates = COLUMNS.filter(c => c.es_ganado).map(c => c.id)
    const lostStates = COLUMNS.filter(c => c.es_perdido).map(c => c.id)
    const isWon = (estado: string) => wonStates.includes(estado)
    const isLost = (estado: string) => lostStates.includes(estado)

    const clientes = leads.filter(l => isWon(l.estado)).length
    const conversion = leads.length === 0 ? 0 : Math.round((clientes / leads.length) * 100)

    // AreaChart — daily data within range (max 30 days shown)
    const rangeDays = Math.ceil(rangeDurationMs / (1000 * 60 * 60 * 24))
    const chartDays = Math.min(rangeDays, 30)
    const chartData = []
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(rangeEnd)
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      const count = leads.filter(l => {
        const ld = new Date(l.created_at)
        return ld.getDate() === d.getDate() && ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear()
      }).length
      chartData.push({ name: dateStr, leads: count })
    }

    const statusData = COLUMNS.map(c => ({
      name: c.label,
      value: leads.filter(l => l.estado === c.id).length,
      color: c.color
    })).filter(d => d.value > 0)

    const scoreData = [
      { name: "0 (Nuevo)", count: leads.filter(l => (l.lead_score || 0) < 20).length },
      { name: "20 (Contact.)", count: leads.filter(l => (l.lead_score || 0) >= 20 && (l.lead_score || 0) < 40).length },
      { name: "40 (Caliente)", count: leads.filter(l => (l.lead_score || 0) >= 40 && (l.lead_score || 0) < 80).length },
      { name: "80+ (Negoc.)", count: leads.filter(l => (l.lead_score || 0) >= 80).length },
    ]

    const activeLeads = leads.filter(l => !isWon(l.estado) && !isLost(l.estado))
    const wonLeads = leads.filter(l => isWon(l.estado))
    const lostLeads = leads.filter(l => isLost(l.estado))
    const pipelineValue = activeLeads.reduce((s, l) => s + (l.valor_negociacion || 0), 0)
    const wonRevenue = wonLeads.reduce((s, l) => s + (l.valor_negociacion || 0), 0)
    const lostRevenue = lostLeads.reduce((s, l) => s + (l.valor_negociacion || 0), 0)
    const leadsWithValue = leads.filter(l => (l.valor_negociacion || 0) > 0)
    const avgDeal = leadsWithValue.length > 0 ? Math.round(leadsWithValue.reduce((s, l) => s + (l.valor_negociacion || 0), 0) / leadsWithValue.length) : 0
    const winRate = leads.length === 0 ? 0 : Math.round((wonLeads.length / leads.length) * 100)
    const lostRate = leads.length === 0 ? 0 : Math.round((lostLeads.length / leads.length) * 100)

    const hotLeads = leads.filter(l => (l.lead_score || 0) >= 80 && !isWon(l.estado) && !isLost(l.estado))
      .sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))

    return { total: leads.length, trend, calientes, negociacion, conversion, chartData, statusData, scoreData, pipelineValue, wonRevenue, avgDeal, winRate, lostLeads: lostLeads.length, lostRevenue, lostRate, lostLeadsList: lostLeads, hotLeads }
  }, [leads, allLeads, rangeStart, rangeEnd, COLUMNS])

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Cargando dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: "1500px", margin: "0 auto", paddingBottom: 40 }}>
      {/* Date Range Filter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <span className="crm-card__title" style={{ marginRight: 4 }}>Periodo:</span>
        <div className="crm-segmented">
          {DATE_RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => selectRange(opt.value)}
              className={dateRange === opt.value ? 'is-active' : ''}
            >{opt.label}</button>
          ))}
        </div>

        {/* Navegación entre períodos + calendario del personalizado */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {showNav && (
            <div className="period-nav">
              <button className="period-nav__btn" onClick={() => shiftPeriod(-1)} aria-label="Período anterior">
                <Icon d={I.chevronLeft} size={16} />
              </button>
              {dateRange === 'custom' ? (
                <button className="period-nav__label" onClick={() => setShowCalendar(s => !s)}>
                  <Icon d={I.cal} size={14} />{rangeLabel}
                </button>
              ) : (
                <span className="period-nav__label">{rangeLabel}</span>
              )}
              <button className="period-nav__btn" onClick={() => shiftPeriod(1)} disabled={!canForward} aria-label="Período siguiente">
                <Icon d={I.chevronRight} size={16} />
              </button>
            </div>
          )}

          {dateRange === 'custom' && (!customStart || !customEnd) && (
            <button
              className="period-nav__label"
              style={{ border: '1px solid var(--border)', background: 'var(--white)' }}
              onClick={() => setShowCalendar(s => !s)}
            >
              <Icon d={I.cal} size={14} />Elegir fechas
            </button>
          )}

          {dateRange === 'custom' && showCalendar && (
            <>
              <div onClick={() => setShowCalendar(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50 }}>
                <DateRangeCalendar
                  start={customStart}
                  end={customEnd}
                  onChange={(s, e) => { setCustomStart(s); setCustomEnd(e) }}
                  onClose={() => setShowCalendar(false)}
                />
              </div>
            </>
          )}
        </div>

        <span className="mt-meta" style={{ marginLeft: 'auto' }}>
          {leads.length} de {allLeads.length} leads
        </span>
      </div>

      {/* Stat Cards — 4 principales */}
      <div className="crm-grid-stats">
        <StatCard label="Leads cualificados" value={dashboardData.total} icon="team" color="var(--tide)" trend={dashboardData.trend} />
        <StatCard label="Pipeline abierto" value={dashboardData.pipelineValue} icon="money" color="var(--warn)" suffix=" €" isMoney />
        <StatCard label="Revenue cerrado" value={dashboardData.wonRevenue} icon="trophy" color="var(--ok)" suffix=" €" isMoney />
        <StatCard label="Win rate" value={dashboardData.winRate} icon="target" color="var(--tide)" suffix="%" />
      </div>

      {/* Charts Grid — area chart + funnel pipeline */}
      <div className="crm-grid-cols-2" style={{ marginBottom: 20 }}>
        <div style={chartContainerStyle}>
          <div className="crm-card__header" style={{ marginBottom: 8 }}>
            <div>
              <div className="crm-card__title">Captación de leads</div>
              <div className="crm-card__subtitle">ÚLTIMOS {dashboardData.chartData.length} DÍAS</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dashboardData.chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14C8A4" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#14C8A4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--paper)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--slate-2)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--slate-2)' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', boxShadow: 'var(--sh-2)', fontSize: 12 }} />
              <Area type="monotone" dataKey="leads" stroke="#14C8A4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={chartContainerStyle}>
          <div className="crm-card__header" style={{ marginBottom: 8 }}>
            <div>
              <div className="crm-card__title">Pipeline por etapa</div>
              <div className="crm-card__subtitle">EMBUDO DE CONVERSIÓN</div>
            </div>
          </div>
          {dashboardData.statusData.map((s, i) => {
            const maxVal = Math.max(...dashboardData.statusData.map(d => d.value), 1)
            return (
              <div key={i} className="crm-funnel-row">
                <div className="crm-funnel-label">{s.name}</div>
                <div className="crm-funnel-bar" style={{ '--w': `${(s.value / maxVal) * 100}%` } as React.CSSProperties}>
                </div>
                <div className="crm-funnel-val">{s.value}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom row — 3 columns like reference */}
      <div className="crm-dashboard-bottom">
        {/* Fuentes de lead */}
        <div style={chartContainerStyle}>
          <div className="crm-card__header" style={{ marginBottom: 8 }}>
            <div>
              <div className="crm-card__subtitle">FUENTES DE LEAD</div>
              <div className="crm-card__title">Por canal</div>
            </div>
          </div>
          {(() => {
            const canales: Record<string, number> = {}
            leads.forEach(l => { const c = l.canal || 'directo'; canales[c] = (canales[c] || 0) + 1 })
            const total = leads.length || 1
            return Object.entries(canales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([canal, count]) => (
              <div key={canal} className="crm-funnel-row">
                <div className="crm-funnel-label" style={{ textTransform: 'capitalize' }}>{canal.replace('_', ' ')}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', textAlign: 'right' }}>{count}</div>
                <span className="crm-badge--nodot crm-badge" style={{ fontSize: 9, height: 18 }}>{Math.round((count / total) * 100)}%</span>
              </div>
            ))
          })()}
        </div>

        {/* Actividad Setter IA */}
        <div style={chartContainerStyle}>
          <div className="crm-card__header" style={{ marginBottom: 8 }}>
            <div>
              <div className="crm-card__subtitle">SETTER IA · HOY</div>
              <div className="crm-card__title">Actividad automática</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="crm-stat__kicker">LEADS ACTIVOS</span>
              <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--tide)', letterSpacing: '-0.02em' }}>{dashboardData.total}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="crm-stat__kicker">CALIENTES</span>
              <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--warn)', letterSpacing: '-0.02em' }}>{dashboardData.calientes}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="crm-stat__kicker">CONVERSIÓN</span>
              <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{dashboardData.conversion}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="crm-stat__kicker">PERDIDOS</span>
              <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--err)', letterSpacing: '-0.02em' }}>{dashboardData.lostLeads}</span>
            </div>
          </div>
        </div>

        {/* Próxima acción — Card INK con lista de leads */}
        <div className="crm-card" style={{
          position: 'relative', overflow: 'hidden',
          background: 'var(--ink)', color: '#fff', borderColor: 'transparent',
        }}>
          <div className="mt-arc" style={{ borderColor: 'rgba(20,200,164,0.3)' }} />
          <div style={{ position: 'relative' }}>
            <div className="crm-card__subtitle" style={{ color: 'var(--tide)' }}>PRÓXIMA ACCIÓN</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500,
              letterSpacing: '-0.02em', marginTop: 8, marginBottom: 6, lineHeight: 1.2,
            }}>
              {dashboardData.hotLeads.length > 0
                ? `${dashboardData.hotLeads.length} lead${dashboardData.hotLeads.length > 1 ? 's' : ''} esperan tu llamada`
                : 'Sin leads urgentes'}
            </div>
            {dashboardData.hotLeads.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {dashboardData.hotLeads.slice(0, 5).map(l => {
                  const col = COLUMNS.find(c => c.id === l.estado)
                  return (
                    <a key={l.id} href={`/pipeline?lead=${l.id}`} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                      textDecoration: 'none', color: '#fff', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.nombre || l.nome || 'Sin nombre'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--mist)', marginTop: 1 }}>
                          {col?.label || l.estado}{l.empresa ? ` · ${l.empresa}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {(l.valor_negociacion || 0) > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tide)' }}>
                            {l.valor_negociacion!.toLocaleString('es-ES')}€
                          </span>
                        )}
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                          background: 'var(--tide)', color: 'var(--ink)',
                        }}>{l.lead_score}</span>
                      </div>
                    </a>
                  )
                })}
                {dashboardData.hotLeads.length > 5 && (
                  <a href="/pipeline" style={{ fontSize: 12, color: 'var(--tide)', textDecoration: 'none', textAlign: 'center', padding: '4px 0' }}>
                    +{dashboardData.hotLeads.length - 5} más en pipeline
                  </a>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--mist)', lineHeight: 1.5, marginTop: 8 }}>
                No hay leads con score &gt;80 en este periodo. El Setter IA sigue trabajando.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Leads Perdidos */}
      {dashboardData.lostLeadsList.length > 0 && (
        <div className="crm-card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <div className="crm-card__header" style={{ padding: '20px 24px', marginBottom: 0 }}>
            <div className="crm-card__title">Leads Perdidos</div>
          </div>
          <table className="crm-table">
            <thead>
              <tr>
                {['Lead', 'Valor', 'Motivo', 'Fecha'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboardData.lostLeadsList.map((l: Lead) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.nombre || l.nome || 'Sin nombre'}</td>
                  <td style={{ color: 'var(--err)', fontWeight: 600 }}>
                    {(l.valor_negociacion || 0) > 0 ? `${(l.valor_negociacion || 0).toLocaleString('es-ES')}€` : '—'}
                  </td>
                  <td style={{ color: 'var(--slate)' }}>{l.motivo_perdida || 'Sin motivo'}</td>
                  <td style={{ color: 'var(--slate-2)', fontSize: 12 }}>
                    {l.updated_at ? new Date(l.updated_at).toLocaleDateString('es-ES') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
