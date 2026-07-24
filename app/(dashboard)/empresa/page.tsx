'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
import { Icon, I } from '@/components/crm-icons'
import type { TeamMember } from '@/types/team-member'
import type { AvatarCliente } from '@/types/avatar-cliente'

const ICONS = I as Record<string, React.ReactNode>

type Tab = 'empresa' | 'equipo' | 'avatar'

const MEMBER_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316']

const fStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }

// ============================================================
// TAB BUTTON (same style as ChatbotConfig)
// ============================================================
function TabButton({ label, icon, active, onClick, badge }: {
  label: string; icon: string; active: boolean; onClick: () => void; badge?: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px', border: 'none', borderBottom: active ? '2px solid var(--tide)' : '2px solid transparent',
        background: 'transparent', fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? 'var(--ink)' : 'var(--slate)', cursor: 'pointer', transition: 'all 120ms',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      <span style={{ display: 'flex' }}><Icon d={ICONS[icon]} size={15} /></span>
      {label}
      {badge !== undefined && (
        <span className={`crm-badge--nodot crm-badge${badge > 0 ? ' crm-badge--ok' : ''}`}
          style={{ marginLeft: 4, height: 18, fontSize: 9, padding: '0 6px' }}>{badge}</span>
      )}
    </button>
  )
}

// ============================================================
// TAB: EMPRESA
// ============================================================
function EmpresaTab() {
  const supabase = useMemo(() => createClient(), [])
  const [companyName, setCompanyName] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      const [profileRes, configRes] = await Promise.all([
        supabase.from('profiles').select('company_name').eq('id', user.id).single(),
        supabase.from('configuracion_modulos').select('nombre_negocio').eq('tenant_id', user.id).single(),
      ])
      setCompanyName(profileRes.data?.company_name || '')
      setNombreNegocio(configRes.data?.nombre_negocio || '')
      setLoading(false)
    })()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const [r1, r2] = await Promise.all([
      supabase.from('profiles').update({ company_name: companyName }).eq('id', user.id),
      supabase.from('configuracion_modulos').upsert({ tenant_id: user.id, nombre_negocio: nombreNegocio }, { onConflict: 'tenant_id' }),
    ])
    if (r1.error || r2.error) setSaveMsg('Error al guardar')
    else setSaveMsg('Guardado')
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 2000)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-2)' }}>Cargando...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Info card */}
      <div style={{
        padding: '12px 16px', background: 'var(--tide-soft)', borderLeft: '3px solid var(--tide)',
        fontSize: 13, color: 'var(--tide-ink)', lineHeight: 1.5, borderRadius: '0 var(--r-sm) var(--r-sm) 0',
      }}>
        Estos datos identifican tu empresa en el CRM y los usa el agente IA para presentarse.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Nombre empresa card */}
        <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: '#f0f9ff', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={I.building} size={18} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Nombre de la empresa</div>
              <div style={{ fontSize: 11, color: 'var(--slate-2)' }}>Nombre legal o registrado</div>
            </div>
          </div>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Ej: M&T Consulting S.L." style={fStyle} />
        </div>

        {/* Nombre comercial card */}
        <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={I.chat} size={18} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Nombre comercial</div>
              <div style={{ fontSize: 11, color: 'var(--slate-2)' }}>El nombre que usa el agente IA al presentarse</div>
            </div>
          </div>
          <input value={nombreNegocio} onChange={e => setNombreNegocio(e.target.value)} placeholder="Ej: M&T Consulting" style={fStyle} />
        </div>

        {/* Email card */}
        <div style={{ padding: '16px 20px', background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={I.mail} size={18} /></div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Email de la cuenta</div>
              <div style={{ fontSize: 11, color: 'var(--slate-2)' }}>No se puede cambiar desde aqui</div>
            </div>
          </div>
          <input value={email} disabled style={{ ...fStyle, opacity: 0.5, cursor: 'not-allowed' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={handleSave} disabled={saving} className="crm-btn crm-btn--accent" style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes('Error') ? 'var(--err)' : 'var(--ok)', fontWeight: 600 }}>{saveMsg}</span>}
      </div>
    </div>
  )
}

// ============================================================
// TAB: EQUIPO
// ============================================================
function EquipoTab() {
  const { members, loading, addMember, updateMember, deleteMember } = useTeamMembers()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', color: MEMBER_COLORS[0], rol_label: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)

  const resetForm = () => { setForm({ nombre: '', color: MEMBER_COLORS[0], rol_label: '', telefono: '', email: '' }); setEditingId(null); setShowForm(false) }
  const startEdit = (m: TeamMember) => { setForm({ nombre: m.nombre, color: m.color, rol_label: m.rol_label, telefono: m.telefono, email: m.email }); setEditingId(m.id); setShowForm(true) }

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    if (editingId) await updateMember(editingId, form)
    else await addMember(form)
    setSaving(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Desactivar este miembro?')) return
    await deleteMember(id)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-2)' }}>Cargando...</div>

  return (
    <div>
      <div style={{
        padding: '12px 16px', background: 'var(--tide-soft)', borderLeft: '3px solid var(--tide)',
        fontSize: 13, color: 'var(--tide-ink)', lineHeight: 1.5, borderRadius: '0 var(--r-sm) var(--r-sm) 0',
        marginBottom: 16,
      }}>
        Gestiona los miembros de tu equipo. Asignalos a leads y citas para saber quien se encarga de cada cosa.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {members.length === 0 && !showForm && (
          <div style={{ padding: 40, textAlign: 'center', borderRadius: 'var(--r-md)', border: '2px dashed var(--mist)', color: 'var(--slate-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--slate-2)' }}><Icon d={I.team} size={30} /></div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sin miembros</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Anade a tu equipo para asignarles leads y citas</div>
          </div>
        )}
        {members.map(m => (
          <div key={m.id} style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px', padding: '14px 18px',
            background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: m.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
            }}>{m.nombre.charAt(0).toUpperCase()}</div>
            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{m.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                {m.rol_label && <span>{m.rol_label}</span>}
                {m.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{m.email}</span>}
                {m.telefono && <span>{m.telefono}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span className="crm-badge--nodot crm-badge crm-badge--ok" style={{ height: 18, fontSize: 9 }}>ACTIVO</span>
              <button onClick={() => startEdit(m)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--slate)' }}>Editar</button>
              <button onClick={() => handleDelete(m.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <div style={{ padding: 20, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{editingId ? 'Editar miembro' : 'Nuevo miembro'}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}><label style={labelStyle}>Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Laura Garcia" autoFocus style={fStyle} /></div>
            <div style={{ flex: '1 1 200px' }}><label style={labelStyle}>Rol</label><input value={form.rol_label} onChange={e => setForm(p => ({ ...p, rol_label: e.target.value }))} placeholder="Ej: Comercial, Closer" style={fStyle} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}><label style={labelStyle}>Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="laura@empresa.com" type="email" style={fStyle} /></div>
            <div style={{ flex: '1 1 200px' }}><label style={labelStyle}>Telefono</label><input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+34 600 000 000" style={fStyle} /></div>
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 6 }}>Color</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {MEMBER_COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--ink)' : '2px solid var(--border)', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={resetForm} className="crm-btn crm-btn--ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre.trim()} className="crm-btn crm-btn--accent" style={{ flex: 1, justifyContent: 'center', opacity: !form.nombre.trim() ? 0.4 : 1 }}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Anadir'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '14px', borderRadius: 'var(--r-md)', cursor: 'pointer', border: '2px dashed var(--mist)', background: 'transparent', color: 'var(--tide-ink)', fontSize: 14, fontWeight: 700 }}>+ Anadir miembro</button>
      )}
    </div>
  )
}

// ============================================================
// TAB: AVATAR CLIENTE
// ============================================================
type AvatarField = { key: string; label: string; icon: string; color: string; bg: string; placeholder: string; type: 'input' | 'textarea' }

const SHARED_FIELDS: AvatarField[] = [
  { key: 'sector', label: 'Sector / Industria', icon: 'factory', color: '#0ea5e9', bg: '#f0f9ff', placeholder: 'Ej: Hosteleria, SaaS, Salud...', type: 'input' },
  { key: 'presupuesto', label: 'Rango de presupuesto', icon: 'money', color: '#10b981', bg: '#ecfdf5', placeholder: 'Ej: 500-2000€/mes', type: 'input' },
  { key: 'canales_preferidos', label: 'Canales donde esta', icon: 'smartphone', color: '#ec4899', bg: '#fdf2f8', placeholder: 'Ej: LinkedIn, Instagram, Google, eventos', type: 'input' },
  { key: 'problemas', label: 'Problemas que tiene', icon: 'fire', color: '#ef4444', bg: '#fef2f2', placeholder: 'Que problemas resuelve tu servicio para este cliente?', type: 'textarea' },
  { key: 'motivaciones', label: 'Motivaciones de compra', icon: 'target', color: 'var(--tide)', bg: 'var(--tide-soft)', placeholder: 'Por que compraria? Que le mueve a buscar solucion?', type: 'textarea' },
  { key: 'objeciones_tipicas', label: 'Objeciones tipicas', icon: 'shield', color: '#f97316', bg: '#fff7ed', placeholder: 'Que excusas o dudas suele poner antes de comprar?', type: 'textarea' },
  { key: 'notas', label: 'Notas adicionales', icon: 'edit', color: 'var(--slate)', bg: 'var(--paper)', placeholder: 'Cualquier dato extra relevante...', type: 'textarea' },
]

const B2B_FIELDS: AvatarField[] = [
  { key: 'tamano_empresa', label: 'Tamano de empresa', icon: 'chart', color: '#8b5cf6', bg: '#f5f3ff', placeholder: 'Ej: 5-20 empleados, facturacion 500K-2M', type: 'input' },
  { key: 'cargo_decisor', label: 'Cargo del decisor', icon: 'user', color: '#f59e0b', bg: '#fffbeb', placeholder: 'Ej: CEO, Director comercial, Gerente', type: 'input' },
]

const B2C_FIELDS: AvatarField[] = [
  { key: 'rango_edad', label: 'Rango de edad', icon: 'cake', color: '#8b5cf6', bg: '#f5f3ff', placeholder: 'Ej: 25-45 anos', type: 'input' },
  { key: 'genero', label: 'Genero', icon: 'user', color: '#f59e0b', bg: '#fffbeb', placeholder: 'Ej: Todos, Mujeres, Hombres', type: 'input' },
  { key: 'ubicacion', label: 'Ubicacion', icon: 'pin', color: '#0ea5e9', bg: '#f0f9ff', placeholder: 'Ej: Bilbao y alrededores, toda Espana', type: 'input' },
  { key: 'estilo_vida', label: 'Estilo de vida', icon: 'activity', color: '#10b981', bg: '#ecfdf5', placeholder: 'Ej: Activo, familia, profesional urbano...', type: 'input' },
  { key: 'frustraciones', label: 'Frustraciones', icon: 'frown', color: '#ef4444', bg: '#fef2f2', placeholder: 'Que le frustra de las soluciones actuales?', type: 'textarea' },
]

function getFieldsForType(tipo: string): AvatarField[] {
  const specific = tipo === 'b2c' ? B2C_FIELDS : B2B_FIELDS
  return [...specific, ...SHARED_FIELDS]
}

const ALL_FIELD_KEYS = [...new Set([...B2B_FIELDS, ...B2C_FIELDS, ...SHARED_FIELDS].map(f => f.key))]

function AvatarTab() {
  const supabase = useMemo(() => createClient(), [])
  const [avatars, setAvatars] = useState<AvatarCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTipo, setFormTipo] = useState<'b2b' | 'b2c'>('b2b')
  const emptyForm = (): Record<string, string> => {
    const f: Record<string, string> = { titulo: 'Cliente ideal' }
    ALL_FIELD_KEYS.forEach(k => { f[k] = '' })
    return f
  }
  const [form, setForm] = useState<Record<string, string>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchAvatars = useCallback(async () => {
    const { data } = await supabase.from('avatar_cliente').select('*').order('created_at', { ascending: false })
    setAvatars(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAvatars() }, [fetchAvatars])

  const resetForm = () => {
    setForm(emptyForm()); setFormTipo('b2b'); setEditingId(null); setShowForm(false)
  }

  const startEdit = (a: AvatarCliente) => {
    const f: Record<string, string> = { titulo: a.titulo }
    ALL_FIELD_KEYS.forEach(k => { f[k] = (a as unknown as Record<string, string>)[k] || '' })
    setForm(f); setFormTipo(a.tipo || 'b2b'); setEditingId(a.id); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    if (editingId) {
      await supabase.from('avatar_cliente').update({ ...form, tipo: formTipo, generado_por: 'usuario', updated_at: new Date().toISOString() }).eq('id', editingId)
    } else {
      await supabase.from('avatar_cliente').insert({ tenant_id: user.id, ...form, tipo: formTipo, generado_por: 'usuario' })
    }
    setSaving(false); resetForm(); fetchAvatars()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este avatar de cliente?')) return
    await supabase.from('avatar_cliente').delete().eq('id', id)
    fetchAvatars()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate-2)' }}>Cargando...</div>

  return (
    <div>
      <div style={{
        padding: '12px 16px', background: 'var(--tide-soft)', borderLeft: '3px solid var(--tide)',
        fontSize: 13, color: 'var(--tide-ink)', lineHeight: 1.5, borderRadius: '0 var(--r-sm) var(--r-sm) 0',
        marginBottom: 16,
      }}>
        Define tu cliente ideal. El agente IA usa esta informacion para cualificar leads y puede actualizar estos datos automaticamente.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {avatars.length === 0 && !showForm && (
          <div style={{ padding: 40, textAlign: 'center', borderRadius: 'var(--r-md)', border: '2px dashed var(--mist)', color: 'var(--slate-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: 'var(--slate-2)' }}><Icon d={I.target} size={30} /></div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sin avatar de cliente</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Define tu cliente ideal para que el agente IA cualifique mejor</div>
          </div>
        )}
        {avatars.map(a => (
          <div key={a.id} style={{ padding: '16px 20px', background: '#fff', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--tide-soft)', color: 'var(--tide)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={I.target} size={18} /></div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{a.titulo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span className="crm-badge--nodot crm-badge" style={{ height: 16, fontSize: 9, padding: '0 6px', background: a.tipo === 'b2c' ? '#fdf2f8' : '#f5f3ff', color: a.tipo === 'b2c' ? '#ec4899' : '#8b5cf6', borderColor: 'transparent' }}>
                      {a.tipo === 'b2c' ? 'B2C' : 'B2B'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--slate-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon d={(a.generado_por === 'agente' || a.generado_por === 'mixto') ? I.bot : I.edit} size={11} />
                      {a.generado_por === 'agente' ? 'IA' : a.generado_por === 'mixto' ? 'Mixto' : 'Manual'}
                      {' · '}{new Date(a.updated_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`crm-badge--nodot crm-badge ${a.generado_por === 'agente' ? 'crm-badge--info' : 'crm-badge--ok'}`} style={{ height: 18, fontSize: 9 }}>
                  {a.generado_por === 'agente' ? 'AUTO' : 'OK'}
                </span>
                <button onClick={() => startEdit(a)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--slate)' }}>Editar</button>
                <button onClick={() => handleDelete(a.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>Eliminar</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {getFieldsForType(a.tipo).filter(f => (a as unknown as Record<string, string>)[f.key]).map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--paper)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Icon d={ICONS[f.icon]} size={13} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, marginTop: 2 }}>{(a as unknown as Record<string, string>)[f.key] as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <div style={{ padding: 20, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{editingId ? 'Editar avatar' : 'Nuevo avatar de cliente'}</div>

          {/* B2B / B2C selector */}
          <div>
            <label style={labelStyle}>Tipo de cliente</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([{ id: 'b2b' as const, label: 'B2B — Empresa', icon: 'building', desc: 'Vendes a otras empresas' },
                { id: 'b2c' as const, label: 'B2C — Particular', icon: 'user', desc: 'Vendes a personas' }]).map(opt => (
                <button key={opt.id} onClick={() => setFormTipo(opt.id)} style={{
                  flex: 1, padding: '12px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'left',
                  border: formTipo === opt.id ? '2px solid var(--tide)' : '1px solid var(--border)',
                  background: formTipo === opt.id ? 'var(--tide-soft)' : '#fff',
                  transition: 'all 120ms',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex' }}><Icon d={ICONS[opt.icon]} size={18} /></span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: formTipo === opt.id ? 'var(--tide-ink)' : 'var(--ink)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate-2)', marginTop: 1 }}>{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Titulo</label>
            <input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder={formTipo === 'b2c' ? 'Ej: Cliente particular ideal' : 'Ej: Cliente empresa ideal'} style={fStyle} />
          </div>
          {getFieldsForType(formTipo).map(f => (
            <div key={f.key}>
              <label style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon d={ICONS[f.icon]} size={13} /> {f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ ...fStyle, minHeight: 60, resize: 'vertical' }} />
              ) : (
                <input value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={fStyle} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={resetForm} className="crm-btn crm-btn--ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.titulo.trim()} className="crm-btn crm-btn--accent" style={{ flex: 1, justifyContent: 'center', opacity: !form.titulo.trim() ? 0.4 : 1 }}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '14px', borderRadius: 'var(--r-md)', cursor: 'pointer', border: '2px dashed var(--mist)', background: 'transparent', color: 'var(--tide-ink)', fontSize: 14, fontWeight: 700 }}>+ Anadir avatar de cliente</button>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'empresa', label: 'Empresa', icon: 'building' },
  { id: 'equipo', label: 'Equipo', icon: 'team' },
  { id: 'avatar', label: 'Avatar Cliente', icon: 'target' },
]

export default function EmpresaPage() {
  const [tab, setTab] = useState<Tab>('empresa')
  const { members } = useTeamMembers()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <p className="mt-body-s" style={{ margin: 0 }}>
          Configura los datos de tu empresa, gestiona tu equipo y define tu cliente ideal.
        </p>
      </div>

      {/* Tabs — ChatbotConfig style */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
        {TABS.map(t => (
          <TabButton
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
            badge={t.id === 'equipo' ? members.length : undefined}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ marginTop: 16 }}>
        {tab === 'empresa' && <EmpresaTab />}
        {tab === 'equipo' && <EquipoTab />}
        {tab === 'avatar' && <AvatarTab />}
      </div>
    </div>
  )
}
