'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamMember } from '@/types/team-member'

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const addMember = async (member: Pick<TeamMember, 'nombre' | 'color' | 'rol_label' | 'telefono' | 'email'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('team_members')
      .insert({ tenant_id: user.id, ...member })
      .select()
      .single()
    if (error) { console.error('[TeamMembers] Error adding:', error.message); return null }
    await fetchMembers()
    return data
  }

  const updateMember = async (id: string, updates: Partial<Pick<TeamMember, 'nombre' | 'color' | 'rol_label' | 'telefono' | 'email' | 'avatar_url' | 'activo'>>) => {
    const { error } = await supabase
      .from('team_members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { console.error('[TeamMembers] Error updating:', error.message); return false }
    await fetchMembers()
    return true
  }

  const deleteMember = async (id: string) => {
    const { error } = await supabase
      .from('team_members')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { console.error('[TeamMembers] Error deactivating:', error.message); return false }
    await fetchMembers()
    return true
  }

  return { members, loading, addMember, updateMember, deleteMember, refetch: fetchMembers }
}
