'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRY_PREFIXES, normalizePhone } from '@/lib/phone'
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'

interface NewLeadModalProps {
  userId: string
  onClose: () => void
  onCreated: () => void
}

const canales = [
  { id: "cold_call", label: "Llamada en frío" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "referido", label: "Referido" },
  { id: "evento", label: "Evento" },
  { id: "telefono", label: "Teléfono" },
  { id: "otro", label: "Otro" }
]

export default function NewLeadModal({ userId, onClose, onCreated }: NewLeadModalProps) {
  const [nl, setNl] = useState({
    nombre: "", telefono: "", email: "", empresa: "",
    canal: "cold_call", notas: "", canal_detalle: "", contexto_lead: "",
  })
  const [prefix, setPrefix] = useState("34")
  const [prefixSearch, setPrefixSearch] = useState("")
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [asignadoA, setAsignadoA] = useState("")
  const supabase = useMemo(() => createClient(), [])
  const { members: teamMembers } = useTeamMembers()

  const selectedPrefix = COUNTRY_PREFIXES.find(p => p.code === prefix)
  const filteredPrefixes = prefixSearch
    ? COUNTRY_PREFIXES.filter(p =>
        p.name.toLowerCase().includes(prefixSearch.toLowerCase()) ||
        p.code.includes(prefixSearch)
      )
    : COUNTRY_PREFIXES

  const handleSave = async () => {
    if (!nl.nombre.trim() || !nl.telefono.trim()) return alert("Nombre y teléfono son obligatorios")
    setSaving(true)
    try {
      const telefonoFull = normalizePhone(prefix + nl.telefono.replace(/\D/g, ''))

      const { error } = await supabase.from("leads").insert({
        tenant_id: userId,
        nombre: nl.nombre.trim(),
        telefono: telefonoFull,
        email: nl.email.trim() || null,
        empresa: nl.empresa.trim() || null,
        canal: nl.canal,
        canal_detalle: nl.canal_detalle.trim() || null,
        contexto_lead: nl.contexto_lead.trim() || null,
        notas: nl.notas.trim() || null,
        estado: "nuevo",
        lead_score: 0,
        chatbot_activo: true,
        asignado_a: asignadoA || null,
      }).select().single()
      if (error) throw error
      onCreated()
    } catch(e: unknown) { alert("Error: " + (e instanceof Error ? e.message : "desconocido")) }
    setSaving(false)
  }

  const fStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, outline: "none", boxSizing: "border-box" }

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: "22px 24px 14px", borderBottom: "1px solid var(--paper)", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Nuevo Lead</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 24px", overflowY: "auto", flex: 1 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Nombre *</label>
            <input style={fStyle} placeholder="Nombre completo" value={nl.nombre} onChange={e => setNl({...nl, nombre: e.target.value})} />
          </div>

          {/* Teléfono con selector de prefijo */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Teléfono *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowPrefixDropdown(!showPrefixDropdown)}
                  style={{
                    ...fStyle, width: 110, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    background: showPrefixDropdown ? "var(--paper)" : "#fff",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{selectedPrefix?.flag || '🌐'}</span>
                  <span style={{ fontWeight: 600 }}>+{prefix}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--slate-2)" }}>▼</span>
                </button>
                {showPrefixDropdown && (
                  <>
                    <div onClick={() => setShowPrefixDropdown(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} />
                    <div style={{
                      position: "absolute", top: 44, left: 0, width: 260, maxHeight: 250,
                      background: "#fff", borderRadius: 12, zIndex: 2,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.15)", overflow: "hidden",
                      border: "1px solid var(--border)",
                    }}>
                      <input
                        autoFocus
                        placeholder="Buscar país o código..."
                        value={prefixSearch}
                        onChange={e => setPrefixSearch(e.target.value)}
                        style={{ ...fStyle, borderRadius: 0, borderWidth: "0 0 1px 0" }}
                      />
                      <div style={{ overflowY: "auto", maxHeight: 200 }}>
                        {filteredPrefixes.map(p => (
                          <button
                            key={p.code}
                            onClick={() => { setPrefix(p.code); setShowPrefixDropdown(false); setPrefixSearch("") }}
                            style={{
                              display: "flex", alignItems: "center", gap: 10, width: "100%",
                              padding: "10px 14px", border: "none", background: p.code === prefix ? "var(--paper)" : "#fff",
                              cursor: "pointer", fontSize: 13, textAlign: "left",
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{p.flag}</span>
                            <span style={{ flex: 1 }}>{p.name}</span>
                            <span style={{ color: "var(--slate-2)", fontSize: 12 }}>+{p.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <input
                style={{ ...fStyle, flex: 1 }}
                placeholder="674858008"
                value={nl.telefono}
                onChange={e => setNl({...nl, telefono: e.target.value.replace(/[^\d\s-]/g, '')})}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Email</label>
            <input style={fStyle} placeholder="email@ejemplo.com" value={nl.email} onChange={e => setNl({...nl, email: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Empresa</label>
            <input style={fStyle} placeholder="Nombre de la empresa" value={nl.empresa} onChange={e => setNl({...nl, empresa: e.target.value})} />
          </div>
          {teamMembers.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Asignar a</label>
              <select value={asignadoA} onChange={e => setAsignadoA(e.target.value)} style={fStyle}>
                <option value="">-- Sin asignar --</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}{m.rol_label ? ` (${m.rol_label})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Contexto del lead</label>
            <textarea style={{ ...fStyle, minHeight: 50, resize: "vertical" }} placeholder="Ej: empresa de jardineria en Bilbao, 5 empleados, buscan captar clientes online..." value={nl.contexto_lead} onChange={e => setNl({...nl, contexto_lead: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Canal de origen</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {canales.map(c => (
                <button key={c.id} onClick={() => setNl({...nl, canal: c.id, canal_detalle: ""})} style={{
                  padding: "8px 14px", borderRadius: 8, border: nl.canal === c.id ? "2px solid var(--tide)" : "1px solid var(--border)",
                  background: nl.canal === c.id ? "#eef2ff" : "#fff", color: nl.canal === c.id ? "var(--tide)" : "var(--slate)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}>{c.label}</button>
              ))}
            </div>
            {nl.canal === 'referido' && (
              <input style={{ ...fStyle, marginTop: 8 }} placeholder="Quien te ha referido este lead? (nombre de la persona)" value={nl.canal_detalle} onChange={e => setNl({...nl, canal_detalle: e.target.value})} />
            )}
            {nl.canal === 'evento' && (
              <input style={{ ...fStyle, marginTop: 8 }} placeholder="Nombre del evento" value={nl.canal_detalle} onChange={e => setNl({...nl, canal_detalle: e.target.value})} />
            )}
            {nl.canal === 'linkedin' && (
              <input style={{ ...fStyle, marginTop: 8 }} placeholder="URL del perfil o contexto (opcional)" value={nl.canal_detalle} onChange={e => setNl({...nl, canal_detalle: e.target.value})} />
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)", marginBottom: 4, display: "block" }}>Notas</label>
            <textarea style={{ ...fStyle, minHeight: 60, resize: "vertical" }} placeholder="Contexto de la llamada, intereses, etc." value={nl.notas} onChange={e => setNl({...nl, notas: e.target.value})} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "12px 24px 16px", borderTop: "1px solid var(--paper)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "#fff", color: "var(--slate)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "var(--tide)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Guardando..." : "Crear Lead"}</button>
        </div>
      </div>
    </div>
  )
}
