'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { inputStyle, MOTIVOS_PERDIDA } from '@/lib/constants'
import type { Lead } from '@/lib/types'
import KanbanColumn from '@/components/KanbanColumn'
import LeadDetail from '@/components/LeadDetail'
import NewLeadModal from '@/components/NewLeadModal'
import ScoreBadge from '@/components/ScoreBadge'
import { useNotificationsContext } from '@/lib/notifications-context'
import { usePipelineColumns } from '@/lib/hooks/usePipelineColumns'
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
import { getScoreForColumn } from '@/lib/pipeline-scoring'

const COLUMN_COLORS = ['var(--tide)', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#ec4899']
const COLUMN_ICONS = ['📋', '📞', '🔥', '🤝', '📅', '💎', '❌', '✨', '🎯', '💬', '📧', '🏆']

export default function PipelinePage() {
  const searchParams = useSearchParams()
  const { columns: COLUMNS, loading: columnsLoading, addColumn, updateColumn, deleteColumn, reorderColumn } = usePipelineColumns()
  const { members: teamMembers } = useTeamMembers()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const openedFromUrlRef = useRef(false)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)
  const [pipelineView, setPipelineView] = useState<"kanban" | "list">("kanban")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMember, setFilterMember] = useState<string>("")
  const [listSortBy, setListSortBy] = useState("fecha_desc")
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>("")
  const supabase = useMemo(() => createClient(), [])
  const { notifyStatusChange, markOwnAction } = useNotificationsContext()
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColLabel, setNewColLabel] = useState('')
  const [newColColor, setNewColColor] = useState(COLUMN_COLORS[0])
  const [newColIcon, setNewColIcon] = useState('📋')
  const kanbanRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const el = kanbanRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    if (pipelineView !== 'kanban' || loading || columnsLoading) return
    let scrollHandler: (() => void) | null = null
    let ro: ResizeObserver | null = null
    const timer = setTimeout(() => {
      const el = kanbanRef.current
      if (!el) return
      updateScrollButtons()
      scrollHandler = updateScrollButtons
      el.addEventListener('scroll', scrollHandler, { passive: true })
      ro = new ResizeObserver(updateScrollButtons)
      ro.observe(el)
    }, 150)
    return () => {
      clearTimeout(timer)
      const el = kanbanRef.current
      if (el && scrollHandler) el.removeEventListener('scroll', scrollHandler)
      if (ro) ro.disconnect()
    }
  }, [updateScrollButtons, pipelineView, loading, columnsLoading])

  const scrollKanban = (direction: 'left' | 'right') => {
    const el = kanbanRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' })
  }
  // Modal motivo de pérdida (drag & drop)
  const [showLostModal, setShowLostModal] = useState(false)
  const [pendingLostDrop, setPendingLostDrop] = useState<{ leadId: string; newEstado: string } | null>(null)
  const [motivoPerdida, setMotivoPerdida] = useState('')

  // Montar portal en el top bar del layout
  useEffect(() => {
    const el = document.getElementById('topbar-actions')
    if (el) setPortalTarget(el)
    return () => { if (el) el.innerHTML = '' }
  }, [])

  // Obtener user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  const fetchLeadsWithTags = useCallback(async () => {
    const [leadsRes, tagsRes] = await Promise.all([
      supabase.from("leads").select("*, team_member:team_members!leads_asignado_a_team_fkey(id, nombre, color, rol_label)").order("created_at", { ascending: false }),
      supabase.from("lead_etiquetas").select("lead_id, etiquetas(id, nombre, color)"),
    ])
    if (leadsRes.error) { console.error(leadsRes.error); return leadsRes.data || [] }
    const tagsByLead: Record<string, { id: string; nombre: string; color: string }[]> = {}
    for (const row of (tagsRes.data || [])) {
      const r = row as unknown as { lead_id: string; etiquetas: { id: string; nombre: string; color: string } }
      if (!r.etiquetas) continue
      if (!tagsByLead[r.lead_id]) tagsByLead[r.lead_id] = []
      tagsByLead[r.lead_id].push(r.etiquetas)
    }
    return (leadsRes.data || []).map(l => ({ ...l, etiquetas: tagsByLead[l.id] || [], team_member: l.team_member || undefined }))
  }, [supabase])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchLeadsWithTags()
      setLeads(data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [fetchLeadsWithTags])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  useEffect(() => {
    if (openedFromUrlRef.current || loading || leads.length === 0) return
    const leadId = searchParams.get('lead')
    if (leadId) {
      const lead = leads.find(l => l.id === leadId)
      if (lead) { setSelectedLead(lead); openedFromUrlRef.current = true }
    }
  }, [searchParams, leads, loading])

  // Auto-refresh cada 15 segundos (pausar durante operaciones y modal)
  const operationRef = useRef(false)
  const lostModalRef = useRef(false)
  lostModalRef.current = showLostModal
  useEffect(() => {
    const interval = setInterval(async () => {
      if (operationRef.current || lostModalRef.current) return
      try {
        const data = await fetchLeadsWithTags()
        setLeads(data)
      } catch (err) { console.error(err) }
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchLeadsWithTags])

  const handleDrop = async (leadId: string, newEstado: string) => {
    const lead = leads.find(l => String(l.id) === String(leadId))
    if (!lead || lead.estado === newEstado) return

    // Si la columna destino es "perdido", pedir motivo primero
    const targetCol = COLUMNS.find(c => c.id === newEstado)
    if (targetCol?.es_perdido) {
      setPendingLostDrop({ leadId, newEstado })
      setMotivoPerdida('')
      setShowLostModal(true)
      return
    }

    await executeDrop(leadId, newEstado)
  }

  const executeDrop = async (leadId: string, newEstado: string, motivo?: string) => {
    operationRef.current = true
    const lead = leads.find(l => String(l.id) === String(leadId))
    const oldEstado = lead?.estado
    const statusChanged = oldEstado && oldEstado !== newEstado
    const newScore = getScoreForColumn(newEstado, COLUMNS)

    // Optimistic update
    setLeads(prev => prev.map(l => String(l.id) === String(leadId) ? { ...l, estado: newEstado, lead_score: newScore, motivo_perdida: motivo || l.motivo_perdida } : l))

    if (statusChanged && lead) {
      markOwnAction(leadId)
      notifyStatusChange(lead, oldEstado!, newEstado)
    }

    try {
      const updateData: Record<string, unknown> = { estado: newEstado, lead_score: newScore }
      if (motivo) updateData.motivo_perdida = motivo
      const { error } = await supabase.from("leads").update(updateData).eq("id", leadId)
      if (error) {
        console.error('[Pipeline] Error updating lead:', error.message)
        fetchLeads()
      }
    } catch (err) {
      console.error('[Pipeline] Network error:', err)
      fetchLeads()
    } finally {
      operationRef.current = false
    }
  }

  const confirmLostDrop = () => {
    if (!motivoPerdida || !pendingLostDrop) return
    setShowLostModal(false)
    executeDrop(pendingLostDrop.leadId, pendingLostDrop.newEstado, motivoPerdida)
    setPendingLostDrop(null)
    setMotivoPerdida('')
  }

  const cancelLostDrop = () => {
    setShowLostModal(false)
    setPendingLostDrop(null)
    setMotivoPerdida('')
  }

  const filteredLeads = useMemo(() => {
    let result = leads
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (l) =>
          (l.nombre || "").toLowerCase().includes(term) ||
          (l.email || "").toLowerCase().includes(term) ||
          (l.telefono || "").toLowerCase().includes(term)
      )
    }
    if (filterMember) {
      result = result.filter(l => l.asignado_a === filterMember)
    }
    return result
  }, [leads, searchTerm, filterMember])

  const sortedListLeads = useMemo(() => {
    const sorted = [...filteredLeads]
    const colOrder = COLUMNS.map(c => c.id)
    switch (listSortBy) {
      case "fecha_desc":
        return sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      case "fecha_asc":
        return sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      case "estado":
        return sorted.sort((a, b) => colOrder.indexOf(a.estado) - colOrder.indexOf(b.estado))
      case "nombre":
        return sorted.sort((a, b) => (a.nombre || a.nome || "").localeCompare(b.nombre || b.nome || ""))
      case "score_desc":
        return sorted.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0))
      default:
        return sorted
    }
  }, [filteredLeads, listSortBy])

  if (loading || columnsLoading) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: "var(--slate-2)" }}>Cargando datos maestros...</div>
    )
  }

  const controlsContent = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div className="crm-segmented" style={{ flexShrink: 0 }}>
        <button onClick={() => setPipelineView("kanban")} className={pipelineView === "kanban" ? "is-active" : ""}>Kanban</button>
        <button onClick={() => setPipelineView("list")} className={pipelineView === "list" ? "is-active" : ""}>Lista</button>
      </div>
      <input
        placeholder="Buscar..."
        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
        className="crm-field__input"
        style={{ flex: "1 1 120px", minWidth: 100, padding: "6px 10px", fontSize: 12 }}
      />
      {teamMembers.length > 0 && (
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          className="crm-field__input"
          style={{ padding: '6px 10px', fontSize: 12, width: 'auto', minWidth: 100 }}
        >
          <option value="">Todos</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
      )}
      <button onClick={() => setShowNewLeadModal(true)} className="crm-btn crm-btn--accent crm-btn--sm" style={{ flexShrink: 0 }}>
        + Lead
      </button>
    </div>
  )

  return (
    <>
      {/* Controles: en desktop via portal al topbar, en mobile inline */}
      {portalTarget && createPortal(
        <div className="crm-pipeline-controls--desktop">{controlsContent}</div>,
        portalTarget
      )}
      <div className="crm-pipeline-controls--mobile" style={{ marginBottom: 12 }}>
        {controlsContent}
      </div>

      {/* Pipeline content */}
      {pipelineView === "list" ? (
        <div>
          {/* Sort bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap"
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--slate)" }}>Ordenar por:</span>
            {[
              { id: "fecha_desc", label: "Más recientes" },
              { id: "fecha_asc", label: "Más antiguos" },
              { id: "estado", label: "Estado" },
              { id: "nombre", label: "Nombre A-Z" },
              { id: "score_desc", label: "Mayor score" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setListSortBy(opt.id)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  background: listSortBy === opt.id ? "var(--tide)" : "var(--paper)",
                  color: listSortBy === opt.id ? "#fff" : "var(--slate)",
                }}
              >{opt.label}</button>
            ))}
          </div>

          {/* List table */}
          <div className="pipeline-list-container">
            <div className="pipeline-list-header">
              <div>Nombre</div>
              <div>Contacto</div>
              <div>Estado</div>
              <div>Asignado</div>
              <div>Valor</div>
              <div>Score</div>
            </div>
            {sortedListLeads.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--slate-2)" }}>No hay leads</div>
            ) : (
              sortedListLeads.map((lead) => {
                const col = COLUMNS.find(c => c.id === lead.estado) || COLUMNS[0]
                const isExpanded = expandedLeadId === lead.id
                const fecha = lead.created_at ? new Date(lead.created_at) : null
                return (
                  <div key={lead.id}>
                    <div
                      className="pipeline-list-row"
                      onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                      style={{ background: isExpanded ? "var(--paper-2)" : "#fff" }}
                    >
                      <div style={{ fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: isExpanded ? "var(--tide)" : "var(--slate-2)", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>&#9654;</span>
                        {lead.nombre || lead.nome || "Sin nombre"}
                      </div>
                      <div style={{ color: "var(--slate)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.email || lead.telefono || "—"}
                      </div>
                      <div>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: col.bg, color: col.color
                        }}>
                          {col.icon} {col.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {lead.team_member ? (
                          <>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%', background: lead.team_member.color,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 9, flexShrink: 0,
                            }}>{lead.team_member.nombre.charAt(0).toUpperCase()}</span>
                            <span style={{ fontSize: 12, color: 'var(--ink)' }}>{lead.team_member.nombre}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--mist)' }}>—</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: (lead.valor_negociacion ?? 0) > 0 ? "#10b981" : "var(--mist)", fontWeight: 600 }}>
                        {(lead.valor_negociacion ?? 0) > 0 ? `${lead.valor_negociacion!.toLocaleString('es-ES')} €` : "—"}
                      </div>
                      <div><ScoreBadge score={lead.lead_score || 0} /></div>
                    </div>
                    {isExpanded && (
                      <div className="pipeline-list-expanded">
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
                          padding: "16px 0 8px 22px", fontSize: 13
                        }}>
                          <div>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Nombre</span>
                            <div style={{ color: "var(--ink)", marginTop: 2 }}>{lead.nombre || lead.nome || "—"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Email</span>
                            <div style={{ color: "var(--ink)", marginTop: 2 }}>{lead.email || "—"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Teléfono</span>
                            <div style={{ color: "var(--ink)", marginTop: 2 }}>{lead.telefono || "—"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Empresa</span>
                            <div style={{ color: "var(--ink)", marginTop: 2 }}>{lead.empresa || "—"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Fecha de entrada</span>
                            <div style={{ color: "var(--ink)", marginTop: 2 }}>
                              {fecha ? fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " a las " + fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Canal</span>
                            <div style={{ color: "var(--ink)", marginTop: 2 }}>{lead.canal || "—"}</div>
                          </div>
                        </div>
                        {lead.resumen_conversacion && (
                          <div style={{ padding: "8px 0 4px 22px" }}>
                            <span style={{ color: "var(--slate-2)", fontSize: 11, fontWeight: 600 }}>Resumen IA</span>
                            <div style={{
                              marginTop: 4, padding: "8px 12px", borderRadius: 8,
                              background: "var(--paper)", fontSize: 12, color: "var(--slate)", lineHeight: 1.6
                            }}>
                              {lead.resumen_conversacion}
                            </div>
                          </div>
                        )}
                        <div style={{ padding: "12px 0 4px 22px", display: "flex", gap: 8 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead) }}
                            style={{
                              padding: "6px 16px", borderRadius: 8, border: "none",
                              background: "var(--tide)", color: "#fff", fontSize: 12,
                              fontWeight: 700, cursor: "pointer"
                            }}
                          >Ver detalle</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {canScrollLeft && (
            <button
              onClick={() => scrollKanban('left')}
              className="crm-kanban-arrow crm-kanban-arrow--left"
            >‹</button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollKanban('right')}
              className="crm-kanban-arrow crm-kanban-arrow--right"
            >›</button>
          )}
        <div className="crm-kanban" ref={kanbanRef}>
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              leads={filteredLeads}
              onOpen={setSelectedLead}
              onDragStart={() => {}}
              onDrop={handleDrop}
              onEdit={col.db_id ? (updates) => updateColumn(col.db_id!, updates) : undefined}
              onDelete={col.db_id && COLUMNS.length > 2 && !col.es_ganado && !col.es_perdido ? () => {
                const adjacent = COLUMNS.find(c => c.id !== col.id && !c.es_perdido) || COLUMNS[0]
                if (confirm(`Eliminar columna "${col.label}"? Los leads se moverán a "${adjacent.label}".`)) {
                  deleteColumn(col.db_id!, adjacent.id)
                }
              } : undefined}
              onMoveLeft={col.db_id && COLUMNS.indexOf(col) > 0 ? () => reorderColumn(col.db_id!, 'left') : undefined}
              onMoveRight={col.db_id && COLUMNS.indexOf(col) < COLUMNS.length - 1 ? () => reorderColumn(col.db_id!, 'right') : undefined}
            />
          ))}

          {/* Botón añadir columna */}
          <div style={{
            minWidth: 220, maxWidth: 220, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8
          }}>
            {!showAddColumn ? (
              <button
                onClick={() => setShowAddColumn(true)}
                style={{
                  width: '100%', padding: '14px', borderRadius: 16, cursor: 'pointer',
                  border: '2px dashed var(--mist)', background: 'transparent', color: 'var(--slate-2)',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                }}
              >+ Columna</button>
            ) : (
              <div style={{
                width: '100%', padding: 16, borderRadius: 16,
                border: '1px solid var(--border)', background: '#fff',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <input
                  value={newColLabel}
                  onChange={e => setNewColLabel(e.target.value)}
                  placeholder="Nombre..."
                  autoFocus
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {COLUMN_COLORS.map(c => (
                    <button key={c} onClick={() => setNewColColor(c)} style={{
                      width: 22, height: 22, borderRadius: '50%', background: c, border: newColColor === c ? '3px solid var(--ink)' : '2px solid var(--border)',
                      cursor: 'pointer', padding: 0
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {COLUMN_ICONS.map(ic => (
                    <button key={ic} onClick={() => setNewColIcon(ic)} style={{
                      width: 28, height: 28, borderRadius: 6, fontSize: 14, cursor: 'pointer', padding: 0,
                      border: newColIcon === ic ? '2px solid var(--tide)' : '1px solid var(--border)',
                      background: newColIcon === ic ? '#eef2ff' : '#fff',
                    }}>{ic}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setShowAddColumn(false)} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)',
                    background: '#fff', color: 'var(--slate)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}>Cancelar</button>
                  <button onClick={async () => {
                    if (!newColLabel.trim()) return
                    await addColumn(newColLabel.trim(), newColColor, newColIcon)
                    setNewColLabel(''); setShowAddColumn(false)
                  }} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: 'var(--tide)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}>Crear</button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={() => { fetchLeads(); setSelectedLead(null) }}
        />
      )}

      {showNewLeadModal && userId && (
        <NewLeadModal
          userId={userId}
          onClose={() => setShowNewLeadModal(false)}
          onCreated={() => { setShowNewLeadModal(false); fetchLeads() }}
        />
      )}

      {/* Modal motivo de pérdida (drag & drop) */}
      {showLostModal && (
        <>
          <div onClick={cancelLostDrop} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', zIndex: 9999,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: 24, padding: 32, width: 'min(420px, 90vw)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)', zIndex: 10000,
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Motivo de perdida</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--slate)', lineHeight: 1.5 }}>
              Selecciona por que se ha perdido este lead
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {MOTIVOS_PERDIDA.map(motivo => (
                <button
                  key={motivo}
                  onClick={() => setMotivoPerdida(motivo)}
                  style={{
                    padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    border: motivoPerdida === motivo ? '2px solid #ef4444' : '1px solid var(--border)',
                    background: motivoPerdida === motivo ? 'rgba(239, 68, 68, 0.06)' : '#fff',
                    color: motivoPerdida === motivo ? '#ef4444' : 'var(--slate)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >{motivo}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={cancelLostDrop} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)',
                background: '#fff', color: 'var(--slate)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={confirmLostDrop} disabled={!motivoPerdida} style={{
                flex: 1, padding: '12px', borderRadius: 12, border: 'none',
                background: !motivoPerdida ? '#d1d5db' : '#ef4444', color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: motivoPerdida ? 'pointer' : 'default',
              }}>Confirmar</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
