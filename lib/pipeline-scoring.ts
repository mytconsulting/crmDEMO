/**
 * Scoring dinámico del pipeline.
 *
 * Cada columna tiene un rango de score proporcional (0-100).
 * Las columnas "perdido" se excluyen del cálculo.
 * Las columnas van de más fría (izquierda, score bajo) a más caliente (derecha, score alto).
 */

interface ScoringColumn {
  id: string
  label: string
  orden: number
  es_ganado?: boolean
  es_perdido?: boolean
}

interface ScoreRange {
  min: number
  max: number
  mid: number
}

/**
 * Calcula el rango de score para cada columna activa (excluyendo "perdido").
 * Devuelve un Map: clave_columna → { min, max, mid }
 */
export function getColumnScoreRanges(columns: ScoringColumn[]): Map<string, ScoreRange> {
  const active = columns
    .filter(c => !c.es_perdido)
    .sort((a, b) => a.orden - b.orden)

  const ranges = new Map<string, ScoreRange>()
  const count = active.length

  if (count === 0) return ranges

  for (let i = 0; i < count; i++) {
    const min = Math.round((i / count) * 100)
    const max = Math.round(((i + 1) / count) * 100) - 1
    const mid = Math.round((min + max) / 2)
    ranges.set(active[i].id, { min, max: i === count - 1 ? 100 : max, mid })
  }

  return ranges
}

/**
 * Dado un score (0-100), determina en qué columna debería estar el lead.
 * Excluye columnas "perdido".
 */
export function scoreToEstadoDynamic(score: number, columns: ScoringColumn[]): string {
  const ranges = getColumnScoreRanges(columns)

  for (const [colId, range] of ranges) {
    if (score >= range.min && score <= range.max) {
      return colId
    }
  }

  // Fallback: última columna activa
  const active = columns.filter(c => !c.es_perdido).sort((a, b) => a.orden - b.orden)
  return active[active.length - 1]?.id || 'nuevo'
}

/**
 * Score que se asigna al mover manualmente un lead a una columna.
 * Devuelve el punto medio del rango de esa columna.
 */
export function getScoreForColumn(columnId: string, columns: ScoringColumn[]): number {
  const ranges = getColumnScoreRanges(columns)
  return ranges.get(columnId)?.mid ?? 0
}

/**
 * Genera la descripción de scoring para el prompt del agente IA.
 * El agente necesita saber qué rangos corresponden a qué columnas.
 */
export function buildScoringPrompt(columns: ScoringColumn[]): string {
  const ranges = getColumnScoreRanges(columns)

  if (ranges.size === 0) {
    return '0-19=curiosidad, 20-39=interes leve, 40-59=interes medio, 60-79=interes alto, 80-100=listo para cerrar'
  }

  const parts: string[] = []
  for (const [colId, range] of ranges) {
    const col = columns.find(c => c.id === colId)
    const label = col?.label || colId
    parts.push(`${range.min}-${range.max}=${label}`)
  }
  return parts.join(', ')
}
