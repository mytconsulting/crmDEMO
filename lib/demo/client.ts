/**
 * Mock del cliente de Supabase para la DEMO.
 *
 * Imita la parte de la API de @supabase/supabase-js que usa el CRM:
 *   .from(tabla).select/insert/update/upsert/delete + .eq/.order/.single...
 *   .auth.getUser/getSession/signOut/onAuthStateChange
 *   .storage.from(...).upload/getPublicUrl/remove
 *   .channel(...).on(...).subscribe()  +  .removeChannel(...)
 *
 * Todo se resuelve contra localStorage (lib/demo/store). No hay red.
 */

import { DEMO_USER, getTable, persist, uid, type DemoDB } from './store'

type Row = Record<string, unknown>
type Filter = ['eq' | 'neq', string, unknown] | ['in', string, unknown[]] | ['gte' | 'lte', string, unknown]
type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Result<T = any> { data: T; error: { message: string; code?: string } | null }

const PGRST116 = { code: 'PGRST116', message: 'No rows found' }

class Query<T = any> implements PromiseLike<Result<T>> {
  private _table: keyof DemoDB
  private _op: Op = 'select'
  private _cols = '*'
  private _filters: Filter[] = []
  private _order: { col: string; ascending: boolean } | null = null
  private _limit: number | null = null
  private _single = false
  private _maybeSingle = false
  private _returnRows = false
  private _payload: Row | Row[] | null = null
  private _onConflict: string | null = null

  constructor(table: string) {
    this._table = table as keyof DemoDB
  }

  select(cols = '*'): this {
    this._cols = cols
    if (this._op !== 'select') this._returnRows = true
    return this
  }
  insert(data: Row | Row[]): this { this._op = 'insert'; this._payload = data; return this }
  update(data: Row): this { this._op = 'update'; this._payload = data; return this }
  upsert(data: Row | Row[], opts?: { onConflict?: string }): this {
    this._op = 'upsert'; this._payload = data; this._onConflict = opts?.onConflict ?? null; return this
  }
  delete(): this { this._op = 'delete'; return this }

  eq(col: string, val: unknown): this { this._filters.push(['eq', col, val]); return this }
  neq(col: string, val: unknown): this { this._filters.push(['neq', col, val]); return this }
  in(col: string, vals: unknown[]): this { this._filters.push(['in', col, vals]); return this }
  gte(col: string, val: unknown): this { this._filters.push(['gte', col, val]); return this }
  lte(col: string, val: unknown): this { this._filters.push(['lte', col, val]); return this }
  order(col: string, opts?: { ascending?: boolean }): this {
    this._order = { col, ascending: opts?.ascending !== false }; return this
  }
  limit(n: number): this { this._limit = n; return this }
  single(): this { this._single = true; return this }
  maybeSingle(): this { this._maybeSingle = true; return this }

  // ── ejecución ───────────────────────────────────────────────────────
  private match(row: Row): boolean {
    return this._filters.every((f) => {
      const v = row[f[1]]
      switch (f[0]) {
        case 'eq': return v === f[2]
        case 'neq': return v !== f[2]
        case 'in': return (f[2] as unknown[]).includes(v)
        case 'gte': return (v as number) >= (f[2] as number)
        case 'lte': return (v as number) <= (f[2] as number)
        default: return true
      }
    })
  }

  private resolveJoins(rows: Row[]): Row[] {
    // leads -> team_member (por asignado_a)
    if (this._table === 'leads' && this._cols.includes('team_member')) {
      const members = getTable('team_members')
      rows = rows.map((r) => ({ ...r, team_member: members.find((m) => m.id === r.asignado_a) || null }))
    }
    // lead_etiquetas -> etiquetas (por etiqueta_id)
    if (this._table === 'lead_etiquetas' && this._cols.includes('etiquetas')) {
      const tags = getTable('etiquetas')
      rows = rows.map((r) => ({ ...r, etiquetas: tags.find((e) => e.id === r.etiqueta_id) || null }))
    }
    return rows
  }

  private finalizeRead(rows: Row[]): Result<T> {
    if (this._order) {
      const { col, ascending } = this._order
      rows = [...rows].sort((a, b) => {
        const av = a[col], bv = b[col]
        if (av === bv) return 0
        if (av === undefined || av === null) return 1
        if (bv === undefined || bv === null) return -1
        const cmp = av < bv ? -1 : 1
        return ascending ? cmp : -cmp
      })
    }
    if (this._limit != null) rows = rows.slice(0, this._limit)
    rows = this.resolveJoins(rows)

    if (this._single) {
      if (rows.length === 0) return { data: null as T, error: PGRST116 }
      return { data: rows[0] as T, error: null }
    }
    if (this._maybeSingle) {
      return { data: (rows[0] ?? null) as T, error: null }
    }
    return { data: rows as T, error: null }
  }

  private run(): Result<T> {
    const table = getTable(this._table)

    if (this._op === 'select') {
      return this.finalizeRead(table.filter((r) => this.match(r)))
    }

    if (this._op === 'insert' || this._op === 'upsert') {
      const items = Array.isArray(this._payload) ? this._payload : [this._payload as Row]
      const written: Row[] = []
      for (const item of items) {
        if (this._op === 'upsert' && this._onConflict) {
          const key = this._onConflict
          const existing = table.find((r) => r[key] === item[key])
          if (existing) {
            Object.assign(existing, item, { updated_at: new Date().toISOString() })
            written.push(existing)
            continue
          }
        }
        const row: Row = {
          id: item.id ?? uid(),
          created_at: item.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item,
        }
        table.push(row)
        written.push(row)
      }
      persist()
      if (!this._returnRows) return { data: null as T, error: null }
      return this._single ? { data: written[0] as T, error: null } : { data: written as T, error: null }
    }

    if (this._op === 'update') {
      const matched = table.filter((r) => this.match(r))
      for (const r of matched) Object.assign(r, this._payload, { updated_at: new Date().toISOString() })
      persist()
      if (!this._returnRows) return { data: null as T, error: null }
      return this._single ? { data: (matched[0] ?? null) as T, error: null } : { data: matched as T, error: null }
    }

    if (this._op === 'delete') {
      const matched = table.filter((r) => this.match(r))
      const matchedSet = new Set(matched)
      const remaining = table.filter((r) => !matchedSet.has(r))
      const db = getTable(this._table)
      db.length = 0
      db.push(...remaining)
      persist()
      if (!this._returnRows) return { data: null as T, error: null }
      return this._single ? { data: (matched[0] ?? null) as T, error: null } : { data: matched as T, error: null }
    }

    return { data: null as T, error: null }
  }

  then<R1 = Result<T>, R2 = never>(
    onfulfilled?: ((value: Result<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    let res: Result<T>
    try {
      res = this.run()
    } catch (e) {
      res = { data: null as T, error: { message: e instanceof Error ? e.message : String(e) } }
    }
    return Promise.resolve(res).then(onfulfilled, onrejected)
  }
}

// ── Auth / Storage / Realtime stubs ───────────────────────────────────
const auth = {
  getUser: async () => ({ data: { user: { ...DEMO_USER } }, error: null }),
  getSession: async () => ({ data: { session: { user: { ...DEMO_USER } } }, error: null }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: { user: { ...DEMO_USER } }, error: null }),
  signUp: async () => ({ data: { user: { ...DEMO_USER } }, error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
  updateUser: async () => ({ data: { user: { ...DEMO_USER } }, error: null }),
  setSession: async () => ({ data: { session: null }, error: null }),
  verifyOtp: async () => ({ data: {}, error: null }),
  exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
}

function storageBucket() {
  return {
    upload: async () => ({ data: { path: '' }, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: async () => ({ data: [], error: null }),
    download: async () => ({ data: null, error: null }),
  }
}

interface FakeChannel {
  on: () => FakeChannel
  subscribe: () => FakeChannel
  unsubscribe: () => void
}
function fakeChannel(): FakeChannel {
  const ch: FakeChannel = {
    on: () => ch,
    subscribe: () => ch,
    unsubscribe: () => {},
  }
  return ch
}

export function createClient() {
  return {
    from: (table: string) => new Query(table),
    auth,
    storage: { from: () => storageBucket() },
    channel: () => fakeChannel(),
    removeChannel: () => {},
    rpc: async () => ({ data: null, error: null }),
  }
}

export type DemoClient = ReturnType<typeof createClient>
