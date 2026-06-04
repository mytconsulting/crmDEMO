'use client'

import { useState } from 'react'
import LeadCard from './LeadCard'
import type { Lead } from '@/lib/types'

interface Column {
  id: string
  label: string
  color: string
  bg: string
  icon: string
  es_ganado?: boolean
  es_perdido?: boolean
}

interface KanbanColumnProps {
  column: Column
  leads: Lead[]
  onOpen: (lead: Lead) => void
  onDragStart: (id: string) => void
  onDrop: (leadId: string, newEstado: string) => void
  onEdit?: (updates: { label?: string; color?: string; icon?: string; es_ganado?: boolean; es_perdido?: boolean }) => void
  onDelete?: () => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
}

export default function KanbanColumn({ column, leads, onOpen, onDragStart, onDrop, onEdit, onDelete, onMoveLeft, onMoveRight }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(column.label)
  const columnLeads = leads.filter((l) => l.estado === column.id)
  const totalValor = columnLeads.reduce((sum, l) => sum + (l.valor_negociacion || 0), 0)

  return (
    <div
      className="crm-column"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const leadId = e.dataTransfer.getData("text/plain")
        onDrop(leadId, column.id)
      }}
      style={{
        border: dragOver ? `2px dashed ${column.color}` : '2px solid transparent',
        background: dragOver ? `${column.color}06` : 'transparent',
      }}
    >
      <div className="crm-column__header">
        <div className="crm-column__title">
          <span className="crm-column__dot" style={{ background: column.color }} />
          {editing ? (
            <input
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              onBlur={() => { if (onEdit && editLabel.trim()) onEdit({ label: editLabel.trim() }); setEditing(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { if (onEdit && editLabel.trim()) onEdit({ label: editLabel.trim() }); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              className="crm-field__input"
              style={{ padding: '2px 6px', fontSize: 11, width: 100 }}
            />
          ) : (
            <span
              className="crm-column__label"
              onDoubleClick={() => { if (onEdit) setEditing(true) }}
              title={onEdit ? 'Doble click para editar' : undefined}
              style={{ cursor: onEdit ? 'pointer' : 'default' }}
            >
              {column.label}
              {column.es_ganado && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--ok)' }}>ganado</span>}
              {column.es_perdido && <span style={{ fontSize: 9, marginLeft: 4, color: 'var(--err)' }}>perdido</span>}
            </span>
          )}
          {!editing && (onMoveLeft || onMoveRight || onDelete) && (
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {onMoveLeft && <button onClick={onMoveLeft} title="Mover izquierda" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 10, color: 'var(--slate-2)', lineHeight: 1 }}>◀</button>}
              {onMoveRight && <button onClick={onMoveRight} title="Mover derecha" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 10, color: 'var(--slate-2)', lineHeight: 1 }}>▶</button>}
              {onDelete && <button onClick={onDelete} title="Eliminar columna" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 12, color: 'var(--mist)', lineHeight: 1, opacity: 0.5 }}>✕</button>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {totalValor > 0 && (
            <span className="crm-column__value">
              {column.es_perdido ? '-' : ''}{totalValor.toLocaleString('es-ES')} €
            </span>
          )}
          <span className="crm-column__count">{columnLeads.length}</span>
        </div>
      </div>

      <div className="crm-column__list" style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
        {columnLeads.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 16px", color: "var(--mist)",
            fontSize: 12, fontStyle: "italic", border: "1px dashed var(--border)", borderRadius: "var(--r-md)"
          }}>
            Arrastra leads aquí
          </div>
        ) : (
          columnLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onOpen={onOpen} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  )
}
