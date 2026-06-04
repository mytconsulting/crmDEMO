export interface ConfiguracionModulos {
  id: string
  tenant_id: string
  // Citas
  citas_activo: boolean
  citas_google_calendar: boolean
  citas_por_chatbot: boolean
  citas_duracion_minutos: number
  citas_crear_meet: boolean
  citas_concurrentes: number
  // Recordatorios
  recordatorios_activo: boolean
  recordatorio_1_semana: boolean
  recordatorio_1_dia: boolean
  recordatorio_mismo_dia: boolean
  recordatorio_mismo_dia_horas: number
  recordatorio_mensaje: string
  recordatorio_opcion_cancelar: boolean
  recordatorio_canal: 'whatsapp' | 'email'
  recordatorio_inteligente: boolean
  // Follow-ups
  followups_activo: boolean
  followup_horas_espera: number
  followup_max_intentos: number
  followup_respetar_horario: boolean
  followup_mensaje: string
  // Canales
  canal_whatsapp: boolean
  canal_instagram: boolean
  // Instagram API (per-tenant)
  instagram_page_id: string | null
  instagram_access_token: string | null
  instagram_webhook_verify_token: string | null
  // Evolution API (per-tenant)
  evolution_instance: string | null
  evolution_api_url: string | null
  evolution_api_key: string | null
  // Negocio
  nombre_negocio: string | null
  // Mensaje de bienvenida (null = auto-generado)
  mensaje_bienvenida: string | null
  mensaje_bienvenida_media_url: string | null
  mensaje_bienvenida_media_type: string | null
  // Estilo
  estilo_formalidad: number
  estilo_emojis: number
  estilo_longitud: number
  // Timestamps
  created_at: string
  updated_at: string
}
