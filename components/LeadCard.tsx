import ScoreBadge from './ScoreBadge'
import type { Lead } from '@/lib/types'

interface LeadCardProps {
  lead: Lead
  onOpen: (lead: Lead) => void
  onDragStart: (id: string) => void
}

export default function LeadCard({ lead, onOpen, onDragStart }: LeadCardProps) {
  return (
    <div
      className="crm-lead-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id)
        onDragStart(lead.id)
      }}
      onClick={() => onOpen(lead)}
    >
      <div className="crm-lead-card__head">
        <div style={{ flex: 1 }}>
          <div className="crm-lead-card__name">{lead.nombre || "Sin nombre"}</div>
          {lead.empresa && (
            <div className="crm-lead-card__meta" style={{ marginTop: 3 }}>{lead.empresa}</div>
          )}
          {(lead.valor_negociacion ?? 0) > 0 && (
            <div className="crm-lead-card__value">{lead.valor_negociacion!.toLocaleString('es-ES')} €</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`crm-ai-pill${lead.chatbot_activo === false ? ' is-paused' : ''}`}>
            {lead.chatbot_activo === false ? "OFF" : "IA"}
          </span>
          <ScoreBadge score={lead.lead_score || 0} />
        </div>
      </div>

      <div className="crm-lead-card__contact">
        {lead.telefono && (
          <div className="crm-lead-card__contact-line">
            <span style={{ fontSize: 12 }}>📞</span> {lead.telefono}
          </div>
        )}
        {lead.email && (
          <div className="crm-lead-card__contact-line">
            <span style={{ fontSize: 12 }}>✉️</span> {lead.email}
          </div>
        )}
      </div>

      {lead.resumen_conversacion && (
        <div style={{
          padding: "6px 10px", borderRadius: "var(--r-sm)", background: "var(--paper)",
          border: "1px solid var(--border)", fontSize: 10, color: "var(--slate)", lineHeight: 1.5,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {lead.resumen_conversacion}
        </div>
      )}

      <div className="crm-lead-card__footer">
        <div className="crm-lead-card__date">
          {lead.created_at && (
            <>📥 {new Date(lead.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          {lead.etiquetas && lead.etiquetas.length > 0 && (
            <div className="crm-lead-card__tags">
              {lead.etiquetas.slice(0, 2).map(tag => (
                <span key={tag.id} className="crm-tag" style={{ background: tag.color + '14', color: tag.color, borderColor: 'transparent' }}>
                  {tag.nombre}
                </span>
              ))}
              {lead.etiquetas.length > 2 && (
                <span className="crm-tag">+{lead.etiquetas.length - 2}</span>
              )}
            </div>
          )}
          {lead.team_member && (
            <span style={{
              padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
              background: lead.team_member.color + '18', color: lead.team_member.color,
              whiteSpace: 'nowrap',
            }}>{lead.team_member.nombre}</span>
          )}
        </div>
      </div>
    </div>
  )
}
