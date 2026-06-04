export interface Cita {
  id: string
  tenant_id: string
  lead_id?: string
  fecha: string
  hora: string
  fecha_hora: string
  duracion_minutos: number
  servicio?: string
  notas?: string
  estado: EstadoCita
  origen: 'manual' | 'chatbot' | 'landing'
  gcal_event_id?: string
  gcal_meet_link?: string
  recordatorio_1_semana_enviado: boolean
  recordatorio_1_dia_enviado: boolean
  recordatorio_mismo_dia_enviado: boolean
  created_at: string
  updated_at: string
  asignado_a?: string
}

export type EstadoCita = 'pendiente' | 'confirmada' | 'cancelada' | 'reagendada' | 'completada' | 'no_show'
