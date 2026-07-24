import type { TeamMember } from '@/types/team-member'

export interface Tag {
  id: string
  nombre: string
  color: string
}

export interface Lead {
  id: string
  tenant_id: string
  nombre?: string
  nome?: string
  email?: string
  telefono?: string
  empresa?: string
  estado: string
  lead_score?: number
  canal?: string
  notas?: string
  resumen_conversacion?: string
  chatbot_activo?: boolean
  campos_extra?: Record<string, string>
  valor_negociacion?: number
  etiquetas?: Tag[]
  created_at: string
  updated_at?: string
  // UTM tracking
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  landing_page?: string
  landing_path?: string
  referrer?: string
  motivo_perdida?: string
  ultimo_contacto?: string
  asignado_a?: string
  agente_modo?: 'ventas' | 'soporte' | null
  team_member?: TeamMember
}
