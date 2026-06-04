'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COLUMNS as DEFAULT_COLUMNS } from '@/lib/constants'

export interface PipelineColumn {
  id: string        // clave en BD
  label: string
  color: string
  bg: string
  icon: string
  es_ganado: boolean
  es_perdido: boolean
  orden: number
  db_id?: string    // uuid de la fila en pipeline_estados
}

export function usePipelineColumns() {
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  const fetchColumns = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('pipeline_estados')
      .select('*')
      .order('orden', { ascending: true })

    if (data && data.length > 0) {
      setColumns(data.map(d => ({
        id: d.clave,
        label: d.label,
        color: d.color,
        bg: d.bg,
        icon: d.icon,
        es_ganado: d.es_ganado,
        es_perdido: d.es_perdido,
        orden: d.orden,
        db_id: d.id,
      })))
    } else {
      // Fallback: usar columnas por defecto con flags
      setColumns(DEFAULT_COLUMNS.map((c, i) => ({
        ...c,
        es_ganado: c.id === 'cliente',
        es_perdido: false,
        orden: i + 1,
      })))
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => { fetchColumns() }, [fetchColumns])

  const addColumn = async (label: string, color: string, icon: string) => {
    const base = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    const clave = columns.some(c => c.id === base) ? `${base}_${Date.now().toString(36)}` : base
    const maxOrden = columns.length > 0 ? Math.max(...columns.map(c => c.orden)) : 0
    // Insertar antes de las columnas finales (ganado/perdido)
    const finalCols = columns.filter(c => c.es_ganado || c.es_perdido)
    const nonFinalCols = columns.filter(c => !c.es_ganado && !c.es_perdido)
    const newOrden = nonFinalCols.length > 0
      ? Math.max(...nonFinalCols.map(c => c.orden)) + 1
      : maxOrden + 1

    // Reordenar columnas finales
    for (const fc of finalCols) {
      const newO = fc.orden <= newOrden ? newOrden + 1 + finalCols.indexOf(fc) : fc.orden
      if (newO !== fc.orden && fc.db_id) {
        await supabase.from('pipeline_estados').update({ orden: newO }).eq('id', fc.db_id)
      }
    }

    // Obtener userId fresco por si el closure tiene valor stale
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { console.error('[Pipeline] No user for addColumn'); return }

    const { error } = await supabase.from('pipeline_estados').insert({
      tenant_id: user.id,
      orden: newOrden,
      clave,
      label,
      color,
      bg: color + '12',
      icon,
    })
    if (error) { console.error('[Pipeline] Error creating column:', error.message); return }
    await fetchColumns()
  }

  const updateColumn = async (dbId: string, updates: Partial<Pick<PipelineColumn, 'label' | 'color' | 'icon' | 'es_ganado' | 'es_perdido'>>) => {
    const payload: Record<string, unknown> = {}
    if (updates.label !== undefined) payload.label = updates.label
    if (updates.color !== undefined) { payload.color = updates.color; payload.bg = updates.color + '12' }
    if (updates.icon !== undefined) payload.icon = updates.icon
    if (updates.es_ganado !== undefined) payload.es_ganado = updates.es_ganado
    if (updates.es_perdido !== undefined) payload.es_perdido = updates.es_perdido
    const { error } = await supabase.from('pipeline_estados').update(payload).eq('id', dbId)
    if (error) console.error('[Pipeline] Error updating column:', error.message)
    await fetchColumns()
  }

  const deleteColumn = async (dbId: string, moveLeadsTo: string) => {
    const col = columns.find(c => c.db_id === dbId)
    if (!col) return

    // Proteger columnas ganado/perdido — no se pueden borrar
    if (col.es_ganado || col.es_perdido) {
      console.error('[Pipeline] No se puede eliminar una columna de tipo ganado o perdido')
      return
    }

    // Mover leads de esta columna a la columna destino
    await supabase.from('leads').update({ estado: moveLeadsTo }).eq('estado', col.id)

    // Eliminar columna
    const { error } = await supabase.from('pipeline_estados').delete().eq('id', dbId)
    if (error) console.error('[Pipeline] Error deleting column:', error.message)
    await fetchColumns()
  }

  const reorderColumn = async (dbId: string, direction: 'left' | 'right') => {
    const idx = columns.findIndex(c => c.db_id === dbId)
    if (idx < 0) return
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= columns.length) return

    const current = columns[idx]
    const target = columns[targetIdx]
    if (!current.db_id || !target.db_id) return

    // Swap orden values
    await Promise.all([
      supabase.from('pipeline_estados').update({ orden: target.orden }).eq('id', current.db_id),
      supabase.from('pipeline_estados').update({ orden: current.orden }).eq('id', target.db_id),
    ])
    await fetchColumns()
  }

  return { columns, loading, addColumn, updateColumn, deleteColumn, reorderColumn, refetch: fetchColumns }
}
