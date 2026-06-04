'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import CalendarioCitas from '@/src/CalendarioCitas'

export default function CalendarPage() {
  const [session, setSession] = useState<{ user: { id: string; email: string } } | null>(null)
  const [leads, setLeads] = useState([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSession({ user: { id: user.id, email: user.email || '' } })
    })
  }, [supabase])

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false })
    setLeads(data || [])
  }, [supabase])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  if (!session) return <div style={{ padding: 40, color: "#94a3b8" }}>Cargando...</div>

  return <CalendarioCitas supabase={supabase} session={session} leads={leads} />
}
