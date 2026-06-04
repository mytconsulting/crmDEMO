export interface Lead {
  id: string
  created_at: string
  updated_at: string
  cliente_id?: string
  nombre: string
  email?: string
  telefono?: string
  empresa?: string
  mensaje?: string
  origen?: string
  campana?: string
  etiquetas?: string[]
  estado: string
  lead_score: number
  asignado_a?: string
  ultimo_contacto?: string
  proximo_seguimiento?: string
  notas?: string
  tenant_id: string
  chatbot_activo: boolean
  campos_extra?: Record<string, string>
  canal?: string
  instagram_user_id?: string
  instagram_username?: string
  resumen_conversacion?: string
  followups_enviados: number
  ultimo_followup?: string
  // UTM tracking
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  landing_page?: string
  referrer?: string
  // Valor
  valor_negociacion?: number
  motivo_perdida?: string
}

export type EstadoPipeline = string

export type CanalOrigen = 'landing' | 'whatsapp' | 'instagram' | 'cold_call' | 'linkedin' | 'referido' | 'evento' | 'telefono' | 'otro'
