export const COLUMNS = [
  { id: "nuevo", label: "Nuevo", color: "#6366f1", bg: "#eef2ff", icon: "✨" },
  { id: "contactado", label: "Contactado", color: "#0ea5e9", bg: "#f0f9ff", icon: "📞" },
  { id: "caliente", label: "Caliente", color: "#f59e0b", bg: "#fffbeb", icon: "🔥" },
  { id: "negociacion", label: "Negociación", color: "#8b5cf6", bg: "#f5f3ff", icon: "🤝" },
  { id: "reunion", label: "Reunión", color: "#f97316", bg: "#fff7ed", icon: "📅" },
  { id: "cliente", label: "Cliente", color: "#10b981", bg: "#ecfdf5", icon: "💎" },
]

export const SCORE_COLORS: Record<string, string> = {
  high: "#10b981",
  medium: "#f59e0b",
  low: "#6366f1",
  none: "#94a3b8"
}

export const getScoreLevel = (score: number): string => {
  if (score >= 80) return "high"
  if (score >= 40) return "medium"
  if (score >= 20) return "low"
  return "none"
}

export const PALABRAS_RECHAZO = [
  'no me interesa', 'no gracias', 'no interesado', 'no interesada',
  'ahora no', 'dejame en paz', 'déjame en paz', 'stop', 'quitame',
  'quítame', 'borra mi numero', 'borra mi número', 'no quiero',
  'no por favor', 'no necesito', 'no busco', 'no estoy interesado',
  'no estoy interesada', 'para de escribir', 'deja de escribir',
  'no sirve', 'no es para mi', 'no es para mí', 'no me vale',
  'paso', 'ni hablar', 'de eso nada', 'no molestes',
  'no llames', 'no me llames', 'no escribas', 'no me escribas',
  'sacame', 'sácame', 'spam',
]

export const MOTIVOS_PERDIDA = [
  'No contesta / no responde',
  'Precio demasiado alto',
  'Eligio competencia',
  'No era cliente real',
  'No tiene presupuesto',
  'No le interesa ahora',
  'Otro',
]

export const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 }
export const inputStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid #e2e8f0",
  fontSize: 14, color: "#0f172a", outline: "none", background: "#fff", transition: "all 0.2s",
  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
}
