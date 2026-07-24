// ============================================================
// DEMO: datos MOCK del módulo Rendimiento (cockpit de agencia + ficha por cliente).
// En el producto real esto viene de /api/admin/rendimiento (Supabase + Meta Ads).
// Aquí todo es estático/derivado para que la pantalla se vea completa sin backend.
// ============================================================

// ---- Tipos compartidos (cockpit) ----
export type CapiRollup = {
  configurada: boolean
  activa: boolean
  estado: 'ok' | 'warn' | 'off' | 'unset'
  ev24: number
  ev7: number
  accepted7: number
  errors7: number
  acceptedPct: number | null
  lastEventAt: string | null
}
export type Cliente = {
  tenant_id: string
  nombre: string
  email: string
  leads: number
  citas: number
  ventas: number
  pipeline: number
  gasto: number
  cpl: number | null
  sparkline: number[]
  capi: CapiRollup
}
export type Totals = {
  clientes: number
  leads: number; leadsDelta: number
  pipeline: number; pipelineDelta: number
  ventas: number; ventasDelta: number
  cpl: number | null; cplDelta: number
  gasto: number
  capiActivas: number; capiConErrores: number
  series: { leads: number[]; ventas: number[]; pipeline: number[] }
}
export type Data = { clientes: Cliente[]; totals: Totals }

// ---- Tipos ficha por cliente ----
export type CapiHead = {
  estado: 'ok' | 'warn' | 'off' | 'unset'; activa: boolean; configurada: boolean
  pixelId: string | null; testMode: boolean
  ev24: number; ev7: number; accepted7: number; errors7: number; acceptedPct: number | null; lastEventAt: string | null
}
export type Evento = {
  id: string; created_at: string; lead_id: string | null; leadNombre: string
  event_name: string; value: number | null; estado: string
  events_received: number | null; fbtrace_id: string | null; error: string | null; reason: string | null
}
export type LeadRow = {
  id: string; nombre: string; estado: string; won: boolean; origen: string; valor: number; fbclid: string | null; created_at: string
  capi: { total: number; accepted: number; error: number; skipped: number }
}
export type Detail = {
  tenant_id: string; nombre: string; email: string; metaAdsActivo?: boolean
  kpis: { leads: number; leadsDelta: number; citas: number; citasDelta: number; ventas: number; ventasDelta: number; ventasAbiertas: number; ventasAbiertasDelta: number; cpl: number | null; cplDelta: number }
  capi: CapiHead
  capiDaily: { day: string; accepted: number; error: number }[]
  capiFlows: Record<string, { total: number; accepted: number; error: number; skipped: number; lastAt: string | null }>
  capiWorkflows: Record<string, { exists: boolean; live: boolean }>
  eventos: Evento[]
  leads: LeadRow[]
  atribucion: { nivel: number; nombre: string; leads: number; ventas: number; valor: number }[]
}
export type AdsRow = {
  id: string; nombre: string; status: string; effectiveStatus: string; objective: string
  dailyBudget: number | null; spend: number; impressions: number; clicks: number
  ctr: number; cpm: number; reach: number; results: number; costPerResult: number | null
}
export type AdsData = {
  configured: boolean; error?: string; level?: 'campaign' | 'adset' | 'ad'
  adAccountId?: string; accountName?: string | null; currency?: string
  account?: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number; cpm: number; reach: number; frequency: number; results: number; costPerResult: number | null }
  rows?: AdsRow[]
}

// ---- Helpers ----
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString()
const agoDays = (days: number, hour = 10) => {
  const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 0, 0, 0); return d.toISOString()
}
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

// ---- Fuente de verdad: 5 clientes de la agencia ----
type Seed = Cliente & {
  metaAds: boolean
  leadNames: string[]
  campaigns: { nombre: string; leads: number; ventas: number; valor: number; adsets: { nombre: string; leads: number; ventas: number; valor: number; ads: { nombre: string; leads: number; ventas: number; valor: number }[] }[] }[]
}

const CLIENTS: Seed[] = [
  {
    tenant_id: 't1', nombre: 'Clínica Dental Sonríe', email: 'hola@dentalsonrie.es',
    leads: 148, citas: 42, ventas: 38500, pipeline: 21000, gasto: 2960, cpl: 20.0,
    sparkline: [8, 12, 10, 15, 14, 19, 17, 22, 20, 25],
    capi: { configurada: true, activa: true, estado: 'ok', ev24: 34, ev7: 210, accepted7: 203, errors7: 0, acceptedPct: 97, lastEventAt: ago(8) },
    metaAds: true,
    leadNames: ['Marta Ovejero', 'Iker Landa', 'Nuria Cifuentes', 'Adrián Peña', 'Claudia Rojas', 'Gonzalo Vera'],
    campaigns: [
      { nombre: 'Implantes · Búsqueda', leads: 82, ventas: 24, valor: 22000, adsets: [
        { nombre: 'Bilbao 30-55', leads: 48, ventas: 15, valor: 14000, ads: [{ nombre: 'Vídeo testimonio', leads: 30, ventas: 10, valor: 9500 }, { nombre: 'Carrusel antes/después', leads: 18, ventas: 5, valor: 4500 }] },
        { nombre: 'Getxo 30-55', leads: 34, ventas: 9, valor: 8000, ads: [{ nombre: 'Imagen oferta', leads: 34, ventas: 9, valor: 8000 }] },
      ] },
      { nombre: 'Ortodoncia invisible', leads: 66, ventas: 18, valor: 16500, adsets: [
        { nombre: 'Interés estética', leads: 66, ventas: 18, valor: 16500, ads: [{ nombre: 'Reel resultados', leads: 40, ventas: 12, valor: 11000 }, { nombre: 'Historia oferta', leads: 26, ventas: 6, valor: 5500 }] },
      ] },
    ],
  },
  {
    tenant_id: 't2', nombre: 'Reformas Álvarez', email: 'info@reformasalvarez.com',
    leads: 96, citas: 27, ventas: 54000, pipeline: 33000, gasto: 3120, cpl: 32.5,
    sparkline: [12, 10, 14, 9, 13, 11, 15, 12, 10, 9],
    capi: { configurada: true, activa: true, estado: 'warn', ev24: 12, ev7: 88, accepted7: 71, errors7: 9, acceptedPct: 81, lastEventAt: ago(140) },
    metaAds: true,
    leadNames: ['Fernando Gil', 'Patricia Sáez', 'Ramón Ibáñez', 'Lucía Prieto', 'Óscar Nieto'],
    campaigns: [
      { nombre: 'Reforma integral · Leads', leads: 58, ventas: 16, valor: 36000, adsets: [
        { nombre: 'Propietarios 35-60', leads: 58, ventas: 16, valor: 36000, ads: [{ nombre: 'Antes/después piso', leads: 36, ventas: 11, valor: 25000 }, { nombre: 'Presupuesto gratis', leads: 22, ventas: 5, valor: 11000 }] },
      ] },
      { nombre: 'Cocinas y baños', leads: 38, ventas: 9, valor: 18000, adsets: [
        { nombre: 'Retargeting web', leads: 38, ventas: 9, valor: 18000, ads: [{ nombre: 'Carrusel cocinas', leads: 38, ventas: 9, valor: 18000 }] },
      ] },
    ],
  },
  {
    tenant_id: 't3', nombre: 'Gimnasio PowerFit', email: 'contacto@powerfit.es',
    leads: 210, citas: 63, ventas: 18900, pipeline: 12500, gasto: 1890, cpl: 9.0,
    sparkline: [20, 22, 25, 24, 28, 30, 27, 33, 36, 40],
    capi: { configurada: true, activa: false, estado: 'off', ev24: 0, ev7: 0, accepted7: 0, errors7: 0, acceptedPct: null, lastEventAt: null },
    metaAds: true,
    leadNames: ['Sergio Bravo', 'Alba Cano', 'Rubén Soto', 'Marina Gallego', 'Dídac Ferrer'],
    campaigns: [
      { nombre: 'Matrícula 0€ · Septiembre', leads: 140, ventas: 52, valor: 12500, adsets: [
        { nombre: 'Jóvenes 18-30', leads: 90, ventas: 34, valor: 8200, ads: [{ nombre: 'Reel clase colectiva', leads: 60, ventas: 24, valor: 5800 }, { nombre: 'Story oferta', leads: 30, ventas: 10, valor: 2400 }] },
        { nombre: 'Barrio 3km', leads: 50, ventas: 18, valor: 4300, ads: [{ nombre: 'Imagen instalaciones', leads: 50, ventas: 18, valor: 4300 }] },
      ] },
      { nombre: 'Entrenador personal', leads: 70, ventas: 14, valor: 6400, adsets: [
        { nombre: 'Interés fitness', leads: 70, ventas: 14, valor: 6400, ads: [{ nombre: 'Vídeo entrenador', leads: 70, ventas: 14, valor: 6400 }] },
      ] },
    ],
  },
  {
    tenant_id: 't4', nombre: 'Autoescuela Vía Rápida', email: 'admin@viarapida.es',
    leads: 74, citas: 19, ventas: 9800, pipeline: 6400, gasto: 0, cpl: null,
    sparkline: [6, 7, 5, 8, 6, 9, 7, 10, 8, 11],
    capi: { configurada: false, activa: false, estado: 'unset', ev24: 0, ev7: 0, accepted7: 0, errors7: 0, acceptedPct: null, lastEventAt: null },
    metaAds: false,
    leadNames: ['Jorge Antón', 'Elsa Marín', 'Pau Riera', 'Noa Herrero'],
    campaigns: [],
  },
  {
    tenant_id: 't5', nombre: 'Estudio Legal Márquez', email: 'despacho@marquezlegal.es',
    leads: 53, citas: 22, ventas: 71000, pipeline: 48000, gasto: 2650, cpl: 50.0,
    sparkline: [4, 5, 6, 5, 7, 8, 7, 9, 10, 9],
    capi: { configurada: true, activa: true, estado: 'ok', ev24: 9, ev7: 61, accepted7: 60, errors7: 1, acceptedPct: 98, lastEventAt: ago(50) },
    metaAds: true,
    leadNames: ['Beatriz Salas', 'Hugo Miralles', 'Carmen Ledesma', 'Víctor Pardo'],
    campaigns: [
      { nombre: 'Derecho laboral · Leads', leads: 30, ventas: 12, valor: 42000, adsets: [
        { nombre: 'Despidos 25-55', leads: 30, ventas: 12, valor: 42000, ads: [{ nombre: 'Vídeo abogado', leads: 18, ventas: 8, valor: 28000 }, { nombre: 'Primera consulta gratis', leads: 12, ventas: 4, valor: 14000 }] },
      ] },
      { nombre: 'Herencias y sucesiones', leads: 23, ventas: 8, valor: 29000, adsets: [
        { nombre: 'Interés legal', leads: 23, ventas: 8, valor: 29000, ads: [{ nombre: 'Imagen despacho', leads: 23, ventas: 8, valor: 29000 }] },
      ] },
    ],
  },
]

// ---- Cockpit ----
export function buildCockpit(): Data {
  const clientes: Cliente[] = CLIENTS.map((c) => ({
    tenant_id: c.tenant_id, nombre: c.nombre, email: c.email,
    leads: c.leads, citas: c.citas, ventas: c.ventas, pipeline: c.pipeline,
    gasto: c.gasto, cpl: c.cpl, sparkline: c.sparkline, capi: c.capi,
  })).sort((a, b) => b.leads - a.leads)

  const sum = (f: (c: Seed) => number) => CLIENTS.reduce((a, c) => a + f(c), 0)
  const gastoTot = sum((c) => c.gasto)
  const leadsTot = sum((c) => c.leads)
  return {
    clientes,
    totals: {
      clientes: CLIENTS.length,
      leads: leadsTot, leadsDelta: 14,
      pipeline: sum((c) => c.pipeline), pipelineDelta: 9,
      ventas: sum((c) => c.ventas), ventasDelta: 21,
      cpl: gastoTot > 0 ? Math.round((gastoTot / leadsTot) * 10) / 10 : null, cplDelta: -6,
      gasto: gastoTot,
      capiActivas: CLIENTS.filter((c) => c.capi.estado === 'ok' || c.capi.estado === 'warn').length,
      capiConErrores: CLIENTS.filter((c) => c.capi.estado === 'warn').length,
      series: {
        leads: [50, 60, 58, 71, 75, 88, 82, 101, 96, 110],
        ventas: [12000, 15000, 14000, 19000, 18000, 24000, 22000, 28000, 26000, 31000],
        pipeline: [9000, 11000, 10000, 13000, 12000, 15000, 14000, 18000, 16000, 19000],
      },
    },
  }
}

// ---- Ficha por cliente ----
const ESTADOS = ['nuevo', 'contactado', 'caliente', 'negociacion', 'reunion', 'cliente']
const ORIGENES = ['Meta Ads', 'Instagram', 'Landing', 'Referido']

export function buildDetail(tenantId: string): Detail | null {
  const c = CLIENTS.find((x) => x.tenant_id === tenantId)
  if (!c) return null
  const h = hash(tenantId)
  const active = c.capi.estado === 'ok' || c.capi.estado === 'warn'

  // 14 días de eventos CAPI
  const capiDaily = Array.from({ length: 14 }, (_, i) => {
    if (!active) return { day: agoDays(13 - i), accepted: 0, error: 0 }
    const base = 6 + ((h >> (i % 8)) % 12)
    const error = c.capi.estado === 'warn' && i % 4 === 0 ? 1 + (i % 3) : 0
    return { day: agoDays(13 - i), accepted: base, error }
  })

  // Leads (filas)
  const leads: LeadRow[] = c.leadNames.map((nombre, i) => {
    const estado = ESTADOS[(h + i) % ESTADOS.length]
    const won = estado === 'cliente'
    const origen = ORIGENES[(h + i) % ORIGENES.length]
    const hasCapi = active && i % 3 !== 0
    const err = c.capi.estado === 'warn' && i % 4 === 1
    return {
      id: `${tenantId}-l${i}`, nombre, estado, won, origen,
      valor: won ? 800 + ((h + i * 7) % 40) * 100 : 0,
      fbclid: origen === 'Meta Ads' ? `fb.1.${1690000000 + i}.${(h % 100000)}` : null,
      created_at: agoDays((i + 1) * 2, 9 + i),
      capi: { total: hasCapi ? 3 : 0, accepted: hasCapi ? (err ? 1 : 3) : 0, error: err ? 1 : 0, skipped: hasCapi ? 0 : 0 },
    }
  })

  // Eventos recientes (derivados de leads con CAPI)
  const EVENTS = ['Lead', 'Schedule', 'Purchase']
  const eventos: Evento[] = active
    ? leads.flatMap((l, i) => {
        if (l.capi.total === 0) return []
        const estado = l.capi.error > 0 ? 'error' : 'accepted'
        const ev = EVENTS[i % EVENTS.length]
        return [{
          id: `${tenantId}-e${i}`, created_at: agoDays(i + 1, 12 + (i % 6)), lead_id: l.id, leadNombre: l.nombre,
          event_name: ev, value: ev === 'Purchase' ? (l.valor || 1200) : null, estado,
          events_received: estado === 'accepted' ? 1 : null,
          fbtrace_id: `A${(h + i).toString(36)}xQ${i}`,
          error: estado === 'error' ? 'Invalid pixel event (2804003)' : null,
          reason: null,
        }]
      })
    : []

  // Flujos CAPI
  const mkFlow = (mult: number) => active
    ? { total: Math.round(c.capi.ev7 * mult), accepted: Math.round(c.capi.accepted7 * mult), error: c.capi.estado === 'warn' ? Math.round(c.capi.errors7 * mult) : 0, skipped: 0, lastAt: c.capi.lastEventAt }
    : { total: 0, accepted: 0, error: 0, skipped: 0, lastAt: null }
  const capiFlows = { Lead: mkFlow(0.55), Schedule: mkFlow(0.25), Purchase: mkFlow(0.15), LeadDisqualified: mkFlow(0.05) }
  const wfState = c.capi.estado === 'ok' ? { exists: true, live: true }
    : c.capi.estado === 'warn' ? { exists: true, live: true }
    : c.capi.estado === 'off' ? { exists: true, live: false }
    : { exists: false, live: false }
  const capiWorkflows = { Lead: wfState, Schedule: wfState, Purchase: wfState, lost: wfState }

  // Atribución (jerarquía campaña→conjunto→anuncio)
  const atribucion: Detail['atribucion'] = []
  for (const camp of c.campaigns) {
    atribucion.push({ nivel: 0, nombre: camp.nombre, leads: camp.leads, ventas: camp.ventas, valor: camp.valor })
    for (const as of camp.adsets) {
      atribucion.push({ nivel: 1, nombre: as.nombre, leads: as.leads, ventas: as.ventas, valor: as.valor })
      for (const ad of as.ads) atribucion.push({ nivel: 2, nombre: ad.nombre, leads: ad.leads, ventas: ad.ventas, valor: ad.valor })
    }
  }

  return {
    tenant_id: c.tenant_id, nombre: c.nombre, email: c.email, metaAdsActivo: c.metaAds,
    kpis: {
      leads: c.leads, leadsDelta: 11 + (h % 9),
      citas: c.citas, citasDelta: 6 + (h % 7),
      ventas: c.ventas, ventasDelta: 15 + (h % 12),
      ventasAbiertas: c.pipeline, ventasAbiertasDelta: 4 + (h % 8),
      cpl: c.cpl, cplDelta: -(3 + (h % 6)),
    },
    capi: {
      estado: c.capi.estado, activa: c.capi.activa, configurada: c.capi.configurada,
      pixelId: c.capi.configurada ? String(700000000000000 + (h % 899999999)) : null,
      testMode: false,
      ev24: c.capi.ev24, ev7: c.capi.ev7, accepted7: c.capi.accepted7, errors7: c.capi.errors7,
      acceptedPct: c.capi.acceptedPct, lastEventAt: c.capi.lastEventAt,
    },
    capiDaily, capiFlows, capiWorkflows, eventos, leads, atribucion,
  }
}

// ---- Meta Ads (drill-down campaña → conjunto → anuncio) ----
function adRowFrom(id: string, nombre: string, leads: number, valor: number, on: boolean, i: number): AdsRow {
  const spend = Math.max(40, Math.round(valor * 0.14))
  const impressions = spend * (180 + (i * 37) % 120)
  const clicks = Math.round(impressions * (0.012 + (i % 5) * 0.002))
  const results = leads
  return {
    id, nombre, status: on ? 'ACTIVE' : 'PAUSED', effectiveStatus: on ? 'ACTIVE' : 'PAUSED',
    objective: 'OUTCOME_LEADS', dailyBudget: on ? 15 + (i % 4) * 10 : null,
    spend, impressions, clicks,
    ctr: Math.round((clicks / impressions) * 10000) / 100,
    cpm: Math.round((spend / impressions) * 100000) / 100,
    reach: Math.round(impressions * 0.72), results,
    costPerResult: results ? Math.round((spend / results) * 100) / 100 : null,
  }
}

export function buildAds(tenantId: string, level: 'campaign' | 'adset' | 'ad', parentId?: string): AdsData {
  const c = CLIENTS.find((x) => x.tenant_id === tenantId)
  if (!c || !c.metaAds) return { configured: false }

  let rows: AdsRow[] = []
  if (level === 'campaign') {
    rows = c.campaigns.map((camp, i) => adRowFrom(`${tenantId}-c${i}`, camp.nombre, camp.leads, camp.valor, i === 0, i))
  } else if (level === 'adset') {
    const ci = c.campaigns.findIndex((_, i) => `${tenantId}-c${i}` === parentId)
    const camp = c.campaigns[ci] ?? c.campaigns[0]
    rows = (camp?.adsets ?? []).map((as, i) => adRowFrom(`${parentId}-a${i}`, as.nombre, as.leads, as.valor, i === 0, i))
  } else {
    // ad level: parentId es un adset id `${tenantId}-c{ci}-a{ai}`
    let ads: { nombre: string; leads: number; valor: number }[] = []
    for (let ci = 0; ci < c.campaigns.length; ci++) {
      for (let ai = 0; ai < c.campaigns[ci].adsets.length; ai++) {
        if (`${tenantId}-c${ci}-a${ai}` === parentId) ads = c.campaigns[ci].adsets[ai].ads
      }
    }
    rows = ads.map((ad, i) => adRowFrom(`${parentId}-d${i}`, ad.nombre, ad.leads, ad.valor, i === 0, i))
  }

  const account = {
    spend: rows.reduce((a, r) => a + r.spend, 0) || c.gasto,
    impressions: rows.reduce((a, r) => a + r.impressions, 0),
    clicks: rows.reduce((a, r) => a + r.clicks, 0),
    ctr: 0, cpc: 0, cpm: 0,
    reach: rows.reduce((a, r) => a + r.reach, 0),
    frequency: 1.4,
    results: rows.reduce((a, r) => a + r.results, 0),
    costPerResult: null as number | null,
  }
  account.ctr = account.impressions ? Math.round((account.clicks / account.impressions) * 10000) / 100 : 0
  account.cpc = account.clicks ? Math.round((account.spend / account.clicks) * 100) / 100 : 0
  account.cpm = account.impressions ? Math.round((account.spend / account.impressions) * 100000) / 100 : 0
  account.costPerResult = account.results ? Math.round((account.spend / account.results) * 100) / 100 : null

  return {
    configured: true, level,
    adAccountId: `act_${100000000 + (hash(tenantId) % 899999999)}`,
    accountName: c.nombre, currency: 'EUR',
    account, rows,
  }
}
