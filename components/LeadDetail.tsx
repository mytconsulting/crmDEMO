'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ScoreBadge from './ScoreBadge'
import { COLUMNS as DEFAULT_COLUMNS, labelStyle, inputStyle, MOTIVOS_PERDIDA } from '@/lib/constants'
import { usePipelineColumns } from '@/lib/hooks/usePipelineColumns'
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
import { parsePhone } from '@/lib/phone'
import type { Lead, Tag } from '@/lib/types'

const TAG_COLORS = ['var(--tide)', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', 'var(--slate)']

interface LeadDetailProps {
  lead: Lead
  onClose: () => void
  onUpdate: () => void
  onStatusChange?: (lead: Lead, oldEstado: string, newEstado: string) => void
}

export default function LeadDetail({ lead, onClose, onUpdate, onStatusChange }: LeadDetailProps) {
  const [editLead, setEditLead] = useState({ ...lead })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState("info")
  const [chatbotToggling, setChatbotToggling] = useState(false)
  const [resumenExpanded, setResumenExpanded] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [motivoPerdida, setMotivoPerdida] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const { columns: pipelineColumns } = usePipelineColumns()
  const { members: teamMembers } = useTeamMembers()
  const [assignedMemberId, setAssignedMemberId] = useState<string | null>(lead.asignado_a || null)
  const COLUMNS = pipelineColumns.length > 0 ? pipelineColumns : DEFAULT_COLUMNS.map((c, i) => ({ ...c, es_ganado: c.id === 'cliente', es_perdido: false, orden: i + 1 }))
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  // === Etiquetas ===
  const [tenantTags, setTenantTags] = useState<Tag[]>([])
  const [leadTags, setLeadTags] = useState<Tag[]>(lead.etiquetas || [])
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [creatingTag, setCreatingTag] = useState(false)

  const fetchTenantTags = useCallback(async () => {
    const { data } = await supabase.from('etiquetas').select('id, nombre, color').order('nombre')
    setTenantTags(data || [])
  }, [supabase])

  const fetchLeadTags = useCallback(async () => {
    const { data } = await supabase
      .from('lead_etiquetas')
      .select('etiqueta_id, etiquetas(id, nombre, color)')
      .eq('lead_id', lead.id)
    const tags = data?.map((r: unknown) => (r as { etiquetas: Tag }).etiquetas).filter(Boolean) || []
    setLeadTags(tags)
  }, [supabase, lead.id])

  useEffect(() => { fetchTenantTags(); fetchLeadTags() }, [fetchTenantTags, fetchLeadTags])

  const addTagToLead = async (tag: Tag) => {
    if (leadTags.some(t => t.id === tag.id)) return
    setLeadTags([...leadTags, tag])
    await supabase.from('lead_etiquetas').insert({ lead_id: lead.id, etiqueta_id: tag.id })
    setShowTagDropdown(false)
  }

  const removeTagFromLead = async (tagId: string) => {
    setLeadTags(leadTags.filter(t => t.id !== tagId))
    await supabase.from('lead_etiquetas').delete().eq('lead_id', lead.id).eq('etiqueta_id', tagId)
  }

  const createNewTag = async () => {
    if (!newTagName.trim()) return
    setCreatingTag(true)
    const { data, error } = await supabase
      .from('etiquetas')
      .insert({ tenant_id: userId, nombre: newTagName.trim(), color: newTagColor })
      .select('id, nombre, color')
      .single()
    if (data && !error) {
      setTenantTags([...tenantTags, data])
      await addTagToLead(data)
      setNewTagName('')
    }
    setCreatingTag(false)
  }

  const toggleChatbot = async () => {
    setChatbotToggling(true)
    const newValue = !editLead.chatbot_activo
    try {
      const { error } = await supabase.from("leads").update({ chatbot_activo: newValue }).eq("id", lead.id)
      if (error) throw error
      setEditLead({ ...editLead, chatbot_activo: newValue })
      onUpdate()
    } catch (err) {
      console.error(err)
      alert("Error al cambiar estado del chatbot")
    }
    setChatbotToggling(false)
  }

  const doSave = async (motivo?: string) => {
    setSaving(true)
    try {
      const statusChanged = lead.estado !== editLead.estado
      const updateData: Record<string, unknown> = {
        nombre: editLead.nombre,
        email: editLead.email,
        telefono: editLead.telefono,
        estado: editLead.estado,
        notas: editLead.notas,
        valor_negociacion: editLead.valor_negociacion || 0,
        asignado_a: assignedMemberId || null,
      }
      if (motivo) {
        updateData.motivo_perdida = motivo
      }

      const { error } = await supabase.from("leads").update(updateData).eq("id", lead.id)

      if (error) throw error
      if (statusChanged && onStatusChange) {
        onStatusChange(lead, lead.estado, editLead.estado)
      }
      setMotivoPerdida('')
      onUpdate()
    } catch (err) {
      console.error(err)
      alert("Error al guardar cambios")
    }
    setSaving(false)
  }

  const handleSave = async () => {
    // Si cambia a estado perdido, pedir motivo primero
    const targetCol = COLUMNS.find(c => c.id === editLead.estado)
    if (targetCol?.es_perdido && lead.estado !== editLead.estado) {
      setShowLostModal(true)
      return
    }
    doSave()
  }

  const confirmLostReason = () => {
    if (!motivoPerdida) return
    setShowLostModal(false)
    doSave(motivoPerdida)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const { data, error } = await supabase.from("leads").delete().eq("id", lead.id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error("No se ha podido borrar en la base de datos. Asegúrate de tener permisos RLS de DELETE.")
      }
      onUpdate()
      onClose()
    } catch (err: unknown) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Error al eliminar. Verifica la consola.")
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirm(true)
  }

  const col = COLUMNS.find((c) => c.id === editLead.estado) || COLUMNS[0]

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal crm-modal--wide" onClick={e => e.stopPropagation()}>
        {/* Header — kicker + name + badges */}
        <div className="crm-modal__head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
            <div>
              <div className="crm-card__subtitle" style={{ marginBottom: 4 }}>LEAD · CONTACTO INDIVIDUAL</div>
              <div className="crm-detail__lead-name">{editLead.nombre || "Sin nombre"}</div>
            </div>
            <button onClick={onClose} style={{
              background: "var(--paper)", border: "none", borderRadius: 8,
              width: 36, height: 36, cursor: "pointer", fontSize: 16, color: "var(--slate)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", width: '100%' }}>
            <span className={`crm-badge ${col.es_perdido ? 'crm-badge--err' : 'crm-badge--accent'}`}>
              {col.label}
            </span>
            <span className="crm-badge">SCORE {editLead.lead_score || 0}</span>
            {leadTags.slice(0, 3).map(tag => (
              <span key={tag.id} className="crm-badge--nodot crm-badge" style={{ background: tag.color + '14', color: tag.color, borderColor: 'transparent' }}>{tag.nombre}</span>
            ))}
            <select
              value={assignedMemberId || ''}
              onChange={(e) => setAssignedMemberId(e.target.value || null)}
              className="crm-badge"
              style={{ marginLeft: 'auto', border: '1px solid var(--border)', padding: '4px 10px', background: assignedMemberId ? (teamMembers.find(t => t.id === assignedMemberId)?.color || 'var(--tide)') + '14' : 'transparent', fontSize: 11, cursor: 'pointer', color: assignedMemberId ? (teamMembers.find(t => t.id === assignedMemberId)?.color || 'var(--ink)') : 'var(--slate-2)', borderRadius: 20, fontWeight: 600, outline: 'none' }}
            >
              <option value="">Sin asignar</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}{m.rol_label ? ` (${m.rol_label})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Body — 2 columns: timeline left + data right */}
        <div className="crm-modal__body crm-lead-detail-grid">
          {/* LEFT: Editable fields + Resumen */}
          <div>
            <div className="crm-detail__block-label">TIMELINE</div>

            {/* Resumen IA como evento de timeline */}
            {editLead.resumen_conversacion && (
              <div className="crm-timeline-row" style={{ paddingTop: 4 }}>
                <div className="crm-timeline-row__time" style={{ width: 'auto' }}></div>
                <div className="crm-timeline-row__dot" data-ai="true" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Resumen del Setter IA</div>
                  <div className="crm-ai-pill" style={{ marginTop: 4, marginBottom: 4 }}>IA</div>
                  <div style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.5 }}>{editLead.resumen_conversacion}</div>
                </div>
              </div>
            )}

            {/* Lead capturado */}
            <div className="crm-timeline-row">
              <div className="crm-timeline-row__time" style={{ width: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--slate-2)' }}>
                {editLead.created_at ? new Date(editLead.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
              <div className="crm-timeline-row__dot" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>Lead capturado</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                  {editLead.canal || 'Manual'}{editLead.utm_campaign ? ` · ${editLead.utm_campaign}` : ''}
                </div>
              </div>
            </div>

            {/* Notas editables */}
            <div style={{ marginTop: 16 }}>
              <div className="crm-detail__block-label">NOTAS</div>
              <textarea
                value={editLead.notas || ""}
                onChange={(e) => setEditLead({ ...editLead, notas: e.target.value })}
                className="crm-textarea"
                style={{ minHeight: 200 }}
                placeholder="Notas sobre este lead..."
              />
            </div>
          </div>

          {/* RIGHT: Contact data + Business data */}
          <div>
            {/* Contacto */}
            <div className="crm-detail__block" style={{ padding: '0 0 16px' }}>
              <div className="crm-detail__block-label">CONTACTO</div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">NOMBRE</span>
                <input value={editLead.nombre || ""} onChange={(e) => setEditLead({ ...editLead, nombre: e.target.value })} className="crm-field__input" style={{ textAlign: 'right', border: 'none', padding: '4px 0', background: 'transparent', fontSize: 13 }} />
              </div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">TELÉFONO</span>
                <input value={editLead.telefono || ""} onChange={(e) => setEditLead({ ...editLead, telefono: e.target.value })} className="crm-field__input" style={{ textAlign: 'right', border: 'none', padding: '4px 0', background: 'transparent', fontSize: 13 }} />
              </div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">EMAIL</span>
                <input value={editLead.email || ""} onChange={(e) => setEditLead({ ...editLead, email: e.target.value })} className="crm-field__input" style={{ textAlign: 'right', border: 'none', padding: '4px 0', background: 'transparent', fontSize: 13 }} />
              </div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">CANAL</span>
                <span className="crm-detail__field-val">{editLead.canal || 'WhatsApp'}</span>
              </div>
            </div>

            {/* Negocio */}
            <div className="crm-detail__block" style={{ padding: '16px 0' }}>
              <div className="crm-detail__block-label">NEGOCIO</div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">ESTADO</span>
                <select
                  value={editLead.estado || "nuevo"}
                  onChange={(e) => setEditLead({ ...editLead, estado: e.target.value })}
                  className="crm-field__input"
                  style={{ textAlign: 'right', border: 'none', padding: '4px 0', background: 'transparent', fontSize: 13, cursor: 'pointer' }}
                >
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">VALOR</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number" min="0" step="100"
                    value={editLead.valor_negociacion || ''}
                    onChange={(e) => setEditLead({ ...editLead, valor_negociacion: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="crm-field__input"
                    style={{ textAlign: 'right', border: 'none', padding: '4px 0', background: 'transparent', fontSize: 13, width: 80 }}
                  />
                  <span style={{ color: 'var(--tide-ink)', fontWeight: 600, fontSize: 13 }}>€</span>
                </div>
              </div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">SCORE</span>
                <span className="crm-detail__field-val">{editLead.lead_score || 0}{"/"}{100}</span>
              </div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">ÚLTIMA ACT.</span>
                <span className="crm-detail__field-val">
                  {editLead.ultimo_contacto ? `${new Date(editLead.ultimo_contacto).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${new Date(editLead.ultimo_contacto).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : '—'}
                </span>
              </div>
              {col.es_perdido && editLead.motivo_perdida && (
                <div className="crm-detail__field">
                  <span className="crm-detail__field-key" style={{ color: 'var(--err)' }}>MOTIVO</span>
                  <span className="crm-detail__field-val" style={{ color: 'var(--err)' }}>{editLead.motivo_perdida}</span>
                </div>
              )}
            </div>

            {/* Fuente / Origen */}
            <div className="crm-detail__block" style={{ padding: '16px 0 0' }}>
              <div className="crm-detail__block-label">FUENTE</div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">CANAL</span>
                <span className="crm-detail__field-val">{editLead.canal === 'landing' ? 'Landing Page' : editLead.canal === 'instagram' ? 'Instagram' : editLead.canal || 'Manual'}</span>
              </div>
              {editLead.landing_page && (
                <div className="crm-detail__field">
                  <span className="crm-detail__field-key">LANDING PAGE</span>
                  <span className="crm-detail__field-val" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={editLead.landing_page}>{editLead.landing_page}{editLead.landing_path && editLead.landing_path !== '/' ? editLead.landing_path : ''}</span>
                </div>
              )}
              {editLead.utm_source && <div className="crm-detail__field"><span className="crm-detail__field-key">UTM SOURCE</span><span className="crm-detail__field-val">{editLead.utm_source}</span></div>}
              {editLead.utm_campaign && <div className="crm-detail__field"><span className="crm-detail__field-key">CAMPAÑA</span><span className="crm-detail__field-val">{editLead.utm_campaign}</span></div>}
              {editLead.utm_medium && <div className="crm-detail__field"><span className="crm-detail__field-key">MEDIO</span><span className="crm-detail__field-val">{editLead.utm_medium}</span></div>}
              {editLead.utm_content && <div className="crm-detail__field"><span className="crm-detail__field-key">CONTENIDO</span><span className="crm-detail__field-val">{editLead.utm_content}</span></div>}
              {editLead.referrer && <div className="crm-detail__field"><span className="crm-detail__field-key">REFERRER</span><span className="crm-detail__field-val" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }} title={editLead.referrer}>{editLead.referrer}</span></div>}
            </div>
            {/* Etiquetas */}
            <div className="crm-detail__block" style={{ padding: '16px 0 0' }}>
              <div className="crm-detail__block-label">ETIQUETAS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {leadTags.map(tag => (
                  <span key={tag.id} className="crm-tag" style={{ background: tag.color + '14', color: tag.color, borderColor: 'transparent' }}>
                    {tag.nombre}
                    <button onClick={() => removeTagFromLead(tag.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 11, color: tag.color, marginLeft: 3, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <button onClick={() => setShowTagDropdown(!showTagDropdown)} className="crm-tag" style={{ cursor: 'pointer', borderStyle: 'dashed' }}>+</button>
              </div>
              {showTagDropdown && (
                <div style={{ padding: 10, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', background: '#fff', marginTop: 4 }}>
                  {tenantTags.filter(t => !leadTags.some(lt => lt.id === t.id)).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {tenantTags.filter(t => !leadTags.some(lt => lt.id === t.id)).map(tag => (
                        <button key={tag.id} onClick={() => addTagToLead(tag)} className="crm-tag" style={{ background: tag.color + '14', color: tag.color, borderColor: 'transparent', cursor: 'pointer' }}>{tag.nombre}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createNewTag()} placeholder="Nueva..." className="crm-field__input" style={{ flex: 1, padding: '4px 8px', fontSize: 11 }} />
                    <button onClick={createNewTag} disabled={creatingTag || !newTagName.trim()} className="crm-btn crm-btn--accent crm-btn--sm" style={{ height: 24, fontSize: 10 }}>+</button>
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                    {TAG_COLORS.map(c => (
                      <button key={c} onClick={() => setNewTagColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', border: newTagColor === c ? '2px solid var(--ink)' : '1px solid var(--border)', background: c, cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Campos Extra */}
            {editLead.campos_extra && typeof editLead.campos_extra === "object" && Object.keys(editLead.campos_extra).length > 0 && (
              <div className="crm-detail__block" style={{ padding: '16px 0 0' }}>
                <div className="crm-detail__block-label">DATOS EXTRA</div>
                {Object.entries(editLead.campos_extra).map(([key, value]) => (
                  <div key={key} className="crm-detail__field">
                    <span className="crm-detail__field-key">{key.replace(/_/g, " ")}</span>
                    <span className="crm-detail__field-val">{value || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="crm-modal__foot" style={{ flexDirection: 'column', gap: 8 }}>
          <button onClick={handleSave} disabled={saving || deleting} className="crm-btn crm-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
            {saving ? "Guardando..." : "Guardar cambios →"}
          </button>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              onClick={chatbotToggling ? undefined : toggleChatbot}
              className="crm-btn crm-btn--ghost"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {editLead.chatbot_activo === false ? "Activar Setter IA" : "Pausar Setter IA"}
            </button>
            <button
              onClick={deleting || saving ? undefined : handleDeleteClick}
              className="crm-btn crm-btn--ghost"
              style={{ color: "var(--err)", borderColor: "rgba(229,72,77,0.2)" }}
            >
              {deleting ? "..." : "Eliminar"}
            </button>
          </div>
        </div>

        {/* MODAL MOTIVO DE PERDIDA */}
        {showLostModal && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
            padding: 32
          }}>
            <div style={{
              background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 400,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>Motivo de perdida</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "var(--slate)", lineHeight: 1.5 }}>
                Selecciona por que se ha perdido a <strong>{lead.nombre || lead.nome}</strong>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {MOTIVOS_PERDIDA.map(motivo => (
                  <button
                    key={motivo}
                    onClick={() => setMotivoPerdida(motivo)}
                    style={{
                      padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      border: motivoPerdida === motivo ? "2px solid #ef4444" : "1px solid var(--border)",
                      background: motivoPerdida === motivo ? "rgba(239, 68, 68, 0.06)" : "#fff",
                      color: motivoPerdida === motivo ? "#ef4444" : "var(--slate)",
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    }}
                  >{motivo}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => { setShowLostModal(false); setMotivoPerdida(''); setEditLead({ ...editLead, estado: lead.estado }) }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--border)",
                    background: "#fff", color: "var(--slate)", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}
                >Cancelar</button>
                <button
                  onClick={confirmLostReason}
                  disabled={!motivoPerdida}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "none",
                    background: !motivoPerdida ? "#d1d5db" : "#ef4444", color: "#fff",
                    fontSize: 13, fontWeight: 800, cursor: motivoPerdida ? "pointer" : "default"
                  }}
                >Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL */}
        {showConfirm && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
            padding: 32
          }}>
            <div style={{
              background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 360,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>¿Eliminar Lead?</h3>
              <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "var(--slate)", lineHeight: 1.5 }}>
                Estás a punto de eliminar a <strong>{lead.nombre}</strong>. Esta acción borrará permanentemente sus datos y no se podrá recuperar.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--border)",
                    background: "#fff", color: "var(--slate)", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}
                >Cancelar</button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 12, border: "none",
                    background: deleting ? "#fca5a5" : "#ef4444", color: "#fff",
                    fontSize: 13, fontWeight: 800, cursor: deleting ? "default" : "pointer"
                  }}
                >
                  {deleting ? "Borrando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
