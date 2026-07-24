/**
 * Almacén de datos de la DEMO (localStorage).
 *
 * Esta build es una demo autónoma del CRM: NO usa Supabase. Todos los datos
 * viven en el navegador del visitante. El "cliente Supabase" (lib/supabase/client)
 * está reemplazado por un mock que lee/escribe aquí.
 *
 * Un único registro JSON en localStorage contiene todas las "tablas".
 */

export const DEMO_STORAGE_KEY = 'mtcrm_demo_v2'

export const DEMO_USER = { id: 'demo-tenant-0001', email: 'demo@mytcrm.app' }

export interface DemoDB {
  leads: Record<string, unknown>[]
  team_members: Record<string, unknown>[]
  pipeline_estados: Record<string, unknown>[]
  etiquetas: Record<string, unknown>[]
  lead_etiquetas: Record<string, unknown>[]
  profiles: Record<string, unknown>[]
  configuracion_modulos: Record<string, unknown>[]
  avatar_cliente: Record<string, unknown>[]
  citas: Record<string, unknown>[]
  interacciones: Record<string, unknown>[]
  google_calendar_connections: Record<string, unknown>[]
}

export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* fallthrough */ }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Helpers de fecha para sembrar datos ───────────────────────────────
function daysAgo(n: number, hour = 10, min = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}
function dateOnly(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// ── Datos de ejemplo ──────────────────────────────────────────────────
function seed(): DemoDB {
  const t = DEMO_USER.id

  const profiles = [
    { id: t, role: 'admin', is_active: true, company_name: 'Empresa Demo S.L.', email: DEMO_USER.email, created_at: daysAgo(90) },
  ]

  const configuracion_modulos = [
    { id: uid(), tenant_id: t, nombre_negocio: 'CRM Demo' },
  ]

  // Columnas del pipeline (incluye una columna "perdido" para que funcione el flujo de pérdida)
  const pipeline_estados = [
    { id: uid(), tenant_id: t, orden: 1, clave: 'nuevo', label: 'Nuevo', color: '#6366f1', bg: '#eef2ff', icon: '✨', es_ganado: false, es_perdido: false },
    { id: uid(), tenant_id: t, orden: 2, clave: 'contactado', label: 'Contactado', color: '#0ea5e9', bg: '#f0f9ff', icon: '📞', es_ganado: false, es_perdido: false },
    { id: uid(), tenant_id: t, orden: 3, clave: 'caliente', label: 'Caliente', color: '#f59e0b', bg: '#fffbeb', icon: '🔥', es_ganado: false, es_perdido: false },
    { id: uid(), tenant_id: t, orden: 4, clave: 'negociacion', label: 'Negociación', color: '#8b5cf6', bg: '#f5f3ff', icon: '🤝', es_ganado: false, es_perdido: false },
    { id: uid(), tenant_id: t, orden: 5, clave: 'reunion', label: 'Reunión', color: '#f97316', bg: '#fff7ed', icon: '📅', es_ganado: false, es_perdido: false },
    { id: uid(), tenant_id: t, orden: 6, clave: 'cliente', label: 'Cliente', color: '#10b981', bg: '#ecfdf5', icon: '💎', es_ganado: true, es_perdido: false },
    { id: uid(), tenant_id: t, orden: 7, clave: 'perdido', label: 'Perdido', color: '#ef4444', bg: '#fef2f2', icon: '❌', es_ganado: false, es_perdido: true },
  ]

  const mLaura = uid()
  const mCarlos = uid()
  const team_members = [
    { id: mLaura, tenant_id: t, nombre: 'Laura García', color: '#6366f1', rol_label: 'Closer', telefono: '+34 600 111 222', email: 'laura@empresademo.es', activo: true, created_at: daysAgo(60), updated_at: daysAgo(60) },
    { id: mCarlos, tenant_id: t, nombre: 'Carlos Ruiz', color: '#10b981', rol_label: 'Comercial', telefono: '+34 600 333 444', email: 'carlos@empresademo.es', activo: true, created_at: daysAgo(60), updated_at: daysAgo(60) },
  ]

  const tagVip = uid()
  const tagWeb = uid()
  const tagFrio = uid()
  const etiquetas = [
    { id: tagVip, tenant_id: t, nombre: 'VIP', color: '#f59e0b' },
    { id: tagWeb, tenant_id: t, nombre: 'Web', color: '#0ea5e9' },
    { id: tagFrio, tenant_id: t, nombre: 'Frío', color: '#8b5cf6' },
  ]

  const L = (n: number) => `lead-demo-${n}`
  const leads = [
    { id: L(1), tenant_id: t, nombre: 'Marta Sánchez', telefono: '+34611223344', email: 'marta.sanchez@gmail.com', empresa: 'Floristería Bloom', estado: 'nuevo', lead_score: 8, canal: 'landing', notas: 'Pidió información por la web.', valor_negociacion: 0, chatbot_activo: true, asignado_a: null, created_at: daysAgo(1, 9, 15), updated_at: daysAgo(1, 9, 15) },
    { id: L(2), tenant_id: t, nombre: 'Javier Moreno', telefono: '+34622334455', email: 'jmoreno@taller-moreno.es', empresa: 'Taller Moreno', estado: 'nuevo', lead_score: 12, canal: 'instagram', notas: 'Vino desde una campaña de Instagram.', valor_negociacion: 0, chatbot_activo: true, asignado_a: mCarlos, created_at: daysAgo(2, 18, 30), updated_at: daysAgo(2, 18, 30) },
    { id: L(3), tenant_id: t, nombre: 'Lucía Fernández', telefono: '+34633445566', email: 'lucia.fdez@clinicasonrisa.com', empresa: 'Clínica Sonrisa', estado: 'contactado', lead_score: 28, canal: 'referido', notas: 'Referida por un cliente actual. Interesada en el plan anual.', valor_negociacion: 1200, chatbot_activo: true, asignado_a: mLaura, created_at: daysAgo(4, 11, 0), updated_at: daysAgo(3, 12, 0) },
    { id: L(4), tenant_id: t, nombre: 'Diego Romero', telefono: '+34644556677', email: 'diego@romeroabogados.es', empresa: 'Romero Abogados', estado: 'caliente', lead_score: 52, canal: 'linkedin', notas: 'Muy interesado. Pidió una demo para la semana que viene.', valor_negociacion: 2500, chatbot_activo: true, asignado_a: mLaura, resumen_conversacion: 'El lead busca automatizar la captación de clientes. Tiene presupuesto y decide él mismo.', created_at: daysAgo(6, 10, 0), updated_at: daysAgo(2, 16, 0), ultimo_contacto: daysAgo(2, 16, 0) },
    { id: L(5), tenant_id: t, nombre: 'Ana Torres', telefono: '+34655667788', email: 'ana.torres@gym-energy.com', empresa: 'Gym Energy', estado: 'caliente', lead_score: 60, canal: 'evento', notas: 'La conocimos en una feria. Quiere captar socios nuevos.', valor_negociacion: 1800, chatbot_activo: true, asignado_a: mCarlos, created_at: daysAgo(8, 13, 0), updated_at: daysAgo(1, 10, 0), ultimo_contacto: daysAgo(1, 10, 0) },
    { id: L(6), tenant_id: t, nombre: 'Pablo Gil', telefono: '+34666778899', email: 'pablo@inmogil.es', empresa: 'Inmobiliaria Gil', estado: 'negociacion', lead_score: 74, canal: 'cold_call', notas: 'Negociando condiciones. Preocupado por el precio.', valor_negociacion: 3600, chatbot_activo: true, asignado_a: mLaura, resumen_conversacion: 'Decisor claro. Compara con la competencia pero prefiere nuestra solución por el soporte.', created_at: daysAgo(12, 9, 0), updated_at: daysAgo(1, 18, 0), ultimo_contacto: daysAgo(1, 18, 0) },
    { id: L(7), tenant_id: t, nombre: 'Sara Méndez', telefono: '+34677889900', email: 'sara@mendezconsulting.com', empresa: 'Méndez Consulting', estado: 'reunion', lead_score: 85, canal: 'referido', notas: 'Reunión cerrada para esta semana. Casi listo para firmar.', valor_negociacion: 4200, chatbot_activo: true, asignado_a: mLaura, created_at: daysAgo(15, 10, 0), updated_at: daysAgo(0, 9, 0), ultimo_contacto: daysAgo(0, 9, 0) },
    { id: L(8), tenant_id: t, nombre: 'Roberto Díaz', telefono: '+34688990011', email: 'roberto@panaderialaespiga.es', empresa: 'Panadería La Espiga', estado: 'cliente', lead_score: 100, canal: 'instagram', notas: 'Cliente cerrado. Plan mensual.', valor_negociacion: 990, chatbot_activo: false, asignado_a: mCarlos, created_at: daysAgo(22, 10, 0), updated_at: daysAgo(5, 14, 0), ultimo_contacto: daysAgo(5, 14, 0) },
    { id: L(9), tenant_id: t, nombre: 'Elena Vidal', telefono: '+34699001122', email: 'elena.vidal@estudiovidal.com', empresa: 'Estudio Vidal', estado: 'cliente', lead_score: 100, canal: 'landing', notas: 'Cliente desde hace un mes. Muy contenta.', valor_negociacion: 1500, chatbot_activo: false, asignado_a: mLaura, created_at: daysAgo(28, 10, 0), updated_at: daysAgo(10, 11, 0), ultimo_contacto: daysAgo(10, 11, 0) },
    { id: L(10), tenant_id: t, nombre: 'Hugo Castro', telefono: '+34610112233', email: 'hugo@castrofitness.es', empresa: 'Castro Fitness', estado: 'perdido', lead_score: 20, canal: 'cold_call', notas: 'No siguió adelante.', motivo_perdida: 'Precio demasiado alto', valor_negociacion: 0, chatbot_activo: false, asignado_a: mCarlos, created_at: daysAgo(18, 10, 0), updated_at: daysAgo(7, 16, 0), ultimo_contacto: daysAgo(7, 16, 0) },
  ]

  const lead_etiquetas = [
    { id: uid(), lead_id: L(4), etiqueta_id: tagVip },
    { id: uid(), lead_id: L(1), etiqueta_id: tagWeb },
    { id: uid(), lead_id: L(7), etiqueta_id: tagVip },
    { id: uid(), lead_id: L(2), etiqueta_id: tagFrio },
  ]

  const citas = [
    { id: uid(), tenant_id: t, lead_id: L(7), fecha: dateOnly(1), hora: '11:00:00', fecha_hora: new Date(dateOnly(1) + 'T11:00:00').toISOString(), duracion_minutos: 45, servicio: 'Demo del producto', notas: 'Presentar plan anual', estado: 'confirmada', origen: 'manual', asignado_a: mLaura, created_at: daysAgo(1) },
    { id: uid(), tenant_id: t, lead_id: L(4), fecha: dateOnly(2), hora: '16:30:00', fecha_hora: new Date(dateOnly(2) + 'T16:30:00').toISOString(), duracion_minutos: 30, servicio: 'Llamada de seguimiento', notas: '', estado: 'pendiente', origen: 'manual', asignado_a: mLaura, created_at: daysAgo(2) },
    { id: uid(), tenant_id: t, lead_id: L(6), fecha: dateOnly(3), hora: '09:30:00', fecha_hora: new Date(dateOnly(3) + 'T09:30:00').toISOString(), duracion_minutos: 60, servicio: 'Cierre de propuesta', notas: 'Revisar condiciones', estado: 'confirmada', origen: 'manual', asignado_a: mCarlos, created_at: daysAgo(1) },
  ]

  const avatar_cliente = [
    {
      id: uid(), tenant_id: t, titulo: 'Cliente empresa ideal', tipo: 'b2b', generado_por: 'usuario',
      sector: 'PYMEs de servicios', presupuesto: '500-3000€/mes', canales_preferidos: 'Instagram, Google, referidos',
      problemas: 'No tienen tiempo de hacer seguimiento a los leads y pierden ventas.',
      motivaciones: 'Quieren vender más sin contratar más personal.',
      objeciones_tipicas: '¿Funciona en mi sector? ¿Es complicado de usar?',
      tamano_empresa: '3-20 empleados', cargo_decisor: 'Gerente / Dueño', notas: '',
      created_at: daysAgo(40), updated_at: daysAgo(40),
    },
  ]

  // Conversaciones (Chat): hilos entrantes + respuestas del Setter IA por lead.
  const interacciones = [
    // L(4) Diego Romero — WhatsApp, caliente (creado d6, último d2)
    { id: uid(), lead_id: L(4), tipo: 'whatsapp_recibido',   detalle: 'Hola, vi vuestro anuncio sobre automatizar la captación de clientes. ¿Cómo funciona?', metadata: {}, puntos_score: 0, created_at: daysAgo(6, 10, 2) },
    { id: uid(), lead_id: L(4), tipo: 'whatsapp_respondido', detalle: '¡Hola Diego! Gracias por escribir. Ayudamos a despachos como el tuyo a captar y hacer seguimiento a leads de forma automática con un CRM + un asistente de IA. ¿Ahora mismo cómo gestionáis los contactos que llegan?', metadata: {}, puntos_score: 0, created_at: daysAgo(6, 10, 3) },
    { id: uid(), lead_id: L(4), tipo: 'whatsapp_recibido',   detalle: 'Pues la verdad es que a mano, en una hoja de Excel. Se nos escapan clientes.', metadata: {}, puntos_score: 5, created_at: daysAgo(6, 10, 8) },
    { id: uid(), lead_id: L(4), tipo: 'whatsapp_respondido', detalle: 'Es lo más habitual. Con nuestro sistema cada lead entra solo, se le puntúa y el asistente responde al momento 24/7. ¿Te vendría bien una demo rápida esta semana para verlo con tus datos?', metadata: {}, puntos_score: 0, created_at: daysAgo(6, 10, 9) },
    { id: uid(), lead_id: L(4), tipo: 'whatsapp_recibido',   detalle: 'Sí, me interesa. ¿El jueves por la tarde?', metadata: {}, puntos_score: 10, created_at: daysAgo(2, 16, 0) },
    { id: uid(), lead_id: L(4), tipo: 'whatsapp_respondido', detalle: 'Perfecto, te reservo el jueves. Te llega la confirmación por aquí. ¡Hablamos!', metadata: {}, puntos_score: 0, created_at: daysAgo(2, 16, 1) },

    // L(2) Javier Moreno — Instagram, nuevo (creado d2)
    { id: uid(), lead_id: L(2), tipo: 'instagram_recibido',   detalle: 'Buenas! Os encontré por Instagram. Tengo un taller y quiero conseguir más clientes. ¿Qué ofrecéis?', metadata: {}, puntos_score: 0, created_at: daysAgo(2, 18, 31) },
    { id: uid(), lead_id: L(2), tipo: 'instagram_respondido', detalle: '¡Hola Javier! Montamos un sistema que capta a los interesados de tus anuncios y les responde al instante para agendarte visitas. ¿Trabajas más chapa y pintura o mecánica general?', metadata: {}, puntos_score: 5, created_at: daysAgo(2, 18, 33) },
    { id: uid(), lead_id: L(2), tipo: 'instagram_recibido',   detalle: 'Sobre todo mecánica general. ¿Cuánto costaría?', metadata: {}, puntos_score: 8, created_at: daysAgo(2, 18, 40) },
    { id: uid(), lead_id: L(2), tipo: 'instagram_respondido', detalle: 'Depende del volumen, pero hay planes desde muy asequible. Te paso los detalles en una llamada de 15 min sin compromiso. ¿Te va bien mañana?', metadata: {}, puntos_score: 0, created_at: daysAgo(2, 18, 41) },

    // L(3) Lucía Fernández — contactado (creado d4, último d3)
    { id: uid(), lead_id: L(3), tipo: 'whatsapp_recibido',   detalle: 'Hola, me ha recomendado una amiga que también es clienta vuestra. Quería info del plan anual.', metadata: {}, puntos_score: 0, created_at: daysAgo(4, 11, 1) },
    { id: uid(), lead_id: L(3), tipo: 'whatsapp_respondido', detalle: '¡Hola Lucía! Qué bien que vengas recomendada. El plan anual incluye el CRM completo y el agente IA con ahorro frente al mensual. ¿Para qué tipo de clínica lo quieres?', metadata: {}, puntos_score: 5, created_at: daysAgo(4, 11, 3) },
    { id: uid(), lead_id: L(3), tipo: 'whatsapp_recibido',   detalle: 'Una clínica dental. Recibimos muchas consultas por WhatsApp y no damos abasto.', metadata: {}, puntos_score: 8, created_at: daysAgo(3, 12, 0) },
    { id: uid(), lead_id: L(3), tipo: 'whatsapp_respondido', detalle: 'Justo para eso es ideal: el agente responde y agenda las citas solo. Te preparo una propuesta y te la mando. ¿Te parece?', metadata: {}, puntos_score: 0, created_at: daysAgo(3, 12, 1) },

    // L(5) Ana Torres — caliente (creado d8, último d1)
    { id: uid(), lead_id: L(5), tipo: 'whatsapp_recibido',   detalle: 'Hola, os conocí en la feria del deporte. Quiero captar socios nuevos para el gimnasio.', metadata: {}, puntos_score: 0, created_at: daysAgo(8, 13, 1) },
    { id: uid(), lead_id: L(5), tipo: 'whatsapp_respondido', detalle: '¡Hola Ana! Encantados de saludarte de nuevo. Podemos automatizar la captación de socios desde tus campañas y que el agente cierre las visitas al gimnasio. ¿Cuántas altas al mes te gustaría conseguir?', metadata: {}, puntos_score: 5, created_at: daysAgo(8, 13, 3) },
    { id: uid(), lead_id: L(5), tipo: 'whatsapp_recibido',   detalle: 'Me encantaría llegar a 30-40 al mes. Ahora vamos por la mitad.', metadata: {}, puntos_score: 12, created_at: daysAgo(1, 10, 0) },
    { id: uid(), lead_id: L(5), tipo: 'whatsapp_respondido', detalle: 'Es un objetivo muy alcanzable con el sistema bien montado. Te propongo una demo para enseñarte cómo lo haríamos. ¿Esta semana?', metadata: {}, puntos_score: 0, created_at: daysAgo(1, 10, 1) },

    // L(6) Pablo Gil — negociación (creado d12, último d1)
    { id: uid(), lead_id: L(6), tipo: 'whatsapp_recibido',   detalle: 'Buenas, estoy comparando vuestra solución con otra. La otra es algo más barata.', metadata: {}, puntos_score: 0, created_at: daysAgo(12, 9, 1) },
    { id: uid(), lead_id: L(6), tipo: 'whatsapp_respondido', detalle: 'Entiendo, Pablo. La diferencia está en el soporte y en que el agente IA está afinado para tu sector inmobiliario. Eso se traduce en más visitas cerradas. ¿Qué es lo que más te preocupa, el precio o el resultado?', metadata: {}, puntos_score: 5, created_at: daysAgo(12, 9, 4) },
    { id: uid(), lead_id: L(6), tipo: 'whatsapp_recibido',   detalle: 'El resultado, sobre todo. Si funciona, el precio es lo de menos.', metadata: {}, puntos_score: 10, created_at: daysAgo(1, 18, 0) },
    { id: uid(), lead_id: L(6), tipo: 'follow_up_automatico', detalle: 'Te dejo un caso de un cliente del sector que pasó de 8 a 21 visitas al mes en el primer trimestre. Cuando quieras lo vemos en detalle.', metadata: {}, puntos_score: 0, created_at: daysAgo(1, 18, 1) },
  ]

  return {
    leads,
    team_members,
    pipeline_estados,
    etiquetas,
    lead_etiquetas,
    profiles,
    configuracion_modulos,
    avatar_cliente,
    citas,
    interacciones,
    google_calendar_connections: [],
  }
}

// ── Acceso al almacén ─────────────────────────────────────────────────
let memoryCache: DemoDB | null = null

export function getDB(): DemoDB {
  if (typeof window === 'undefined') {
    // SSR: devolver datos vacíos; el cliente recarga en el navegador.
    return memoryCache || emptyDB()
  }
  if (memoryCache) return memoryCache
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (raw) {
      memoryCache = JSON.parse(raw) as DemoDB
      return memoryCache
    }
  } catch { /* corrupto o no disponible */ }
  memoryCache = seed()
  persist()
  return memoryCache
}

function emptyDB(): DemoDB {
  return {
    leads: [], team_members: [], pipeline_estados: [], etiquetas: [], lead_etiquetas: [],
    profiles: [], configuracion_modulos: [], avatar_cliente: [], citas: [], interacciones: [], google_calendar_connections: [],
  }
}

export function persist(): void {
  if (typeof window === 'undefined' || !memoryCache) return
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(memoryCache))
  } catch { /* almacenamiento lleno o no disponible */ }
}

export function getTable(name: keyof DemoDB): Record<string, unknown>[] {
  const db = getDB()
  if (!db[name]) db[name] = []
  return db[name]
}

/** Borra todos los datos de la demo y vuelve a sembrar los de ejemplo. */
export function resetDemo(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    // Limpiar también el historial de notificaciones por tenant
    Object.keys(window.localStorage)
      .filter(k => k.startsWith('notif_history_'))
      .forEach(k => window.localStorage.removeItem(k))
  } catch { /* noop */ }
  memoryCache = seed()
  persist()
}
