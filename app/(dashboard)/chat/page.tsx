'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatView from '@/src/ChatView'

export default function ChatPage() {
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

  if (!session) return <div style={{ padding: 40, color: "var(--slate-2)" }}>Cargando...</div>

  return <ChatView supabase={supabase} session={session} leads={leads} />
}
