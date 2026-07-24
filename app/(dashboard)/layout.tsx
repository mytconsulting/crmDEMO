'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { useNotifications } from '@/src/useNotifications'
import { ToastContainer } from '@/src/Toast'
import { NotificationsProvider } from '@/lib/notifications-context'
import { Icon, I } from '@/components/crm-icons'
import DemoResetButton from '@/components/DemoResetButton'

interface Profile {
  id: string
  role: string
  is_active: boolean
  company_name?: string
  email?: string
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Panel general', subtitle: 'Operaciones' },
  '/pipeline': { title: 'Pipeline de ventas', subtitle: 'SmartFunnel · Gestión de leads' },
  '/agent': { title: 'Setter IA', subtitle: 'Inteligencia · Configuración' },
  '/agent/train': { title: 'Entrenamiento del agente', subtitle: 'Inteligencia · Base de conocimiento' },
  '/calendar': { title: 'Calendario de citas', subtitle: 'Setter IA · Agenda automática' },
  '/chat': { title: 'Chat', subtitle: 'Conversaciones unificadas' },
  '/modules': { title: 'Módulos', subtitle: 'Configuración · Capacidades' },
  '/empresa': { title: 'Empresa', subtitle: 'Configuración · Empresa, equipo y avatar' },
  '/integrations': { title: 'Integraciones', subtitle: 'Configuración · Sistemas conectados' },
  '/campaigns': { title: 'Campañas', subtitle: 'Configuración · Analítica' },
  '/admin/metricas': { title: 'Métricas', subtitle: 'Configuración · Analítica' },
  '/admin': { title: 'Admin Panel', subtitle: 'Administración' },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // === TODOS LOS HOOKS PRIMERO, antes de cualquier return ===
  const [user, setUser] = useState<{ email: string; id: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ email: user.email || '', id: user.id })
      }
    })
  }, [supabase])

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfileLoading(false); return }
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      if (error && error.code !== "PGRST116") throw error
      setProfile(data || null)
    } catch (err) {
      console.error("Error fetching profile:", err)
      setProfile(null)
    }
    setProfileLoading(false)
  }, [user, supabase])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const session = user ? { user: { id: user.id, email: user.email } } : null
  const { toasts, removeToast, notificationHistory, clearHistory, notifyStatusChange, notifyNewLead, markOwnAction } = useNotifications(supabase, session)

  // === AHORA sí, los returns condicionales ===

  if (profileLoading || !user) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        minHeight: "100vh", background: "var(--paper-2)", fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: "center", color: "var(--slate-2)" }}>Cargando perfil...</div>
      </div>
    )
  }

  if (profile && !profile.is_active) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        minHeight: "100vh", background: "var(--paper-2)", padding: 20,
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          width: "100%", maxWidth: 480, background: "#fff",
          borderRadius: 32, padding: "56px 48px",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.05)",
          textAlign: "center"
        }}>
          <div style={{
            width: 80, height: 80, margin: "0 auto 32px",
            borderRadius: 20, background: "rgba(239, 68, 68, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36
          }}><Icon d={I.lock} size={36} /></div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", marginBottom: 12 }}>
            Cuenta Suspendida
          </h2>
          <p style={{ fontSize: 15, color: "var(--slate)", lineHeight: 1.6, marginBottom: 32 }}>
            Tu acceso al CRM ha sido temporalmente suspendido.
            Si crees que esto es un error o deseas reactivar tu cuenta,
            por favor contacta con el equipo de <strong>M&T Consulting</strong>.
          </p>
          <a href="mailto:contacto@mytconsulting.es" style={{
            display: "block", padding: "14px", borderRadius: 14,
            background: "var(--tide)", color: "#fff", fontSize: 15,
            fontWeight: 700, textDecoration: "none", textAlign: "center",
            boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)"
          }}>Contactar Soporte</a>
        </div>
      </div>
    )
  }

  const isAdmin = profile?.role === "admin"
  const pageTitle = PAGE_TITLES[pathname] || { title: 'SmartFunnel', subtitle: '' }

  return (
    <NotificationsProvider value={{ notifyStatusChange, notifyNewLead, markOwnAction }}>
    <div className="crm-app">
      <Sidebar
        user={user}
        isAdmin={isAdmin}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="crm-main">
        <div className="crm-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menú"><Icon d={I.menu} size={20} /></button>
            <div className="crm-topbar__title-group">
              <div className="crm-topbar__kicker">{pageTitle.subtitle}</div>
              <div className="crm-topbar__title">{pageTitle.title}</div>
            </div>
          </div>
          <div className="crm-topbar__actions">
            <div style={{ position: "relative" }}>
              <button
                className="crm-iconbtn"
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                title="Notificaciones"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>
                </svg>
                {notificationHistory.length > 0 && <span className="crm-iconbtn__dot" />}
              </button>

              {showNotifPanel && (
                <>
                  <div onClick={() => setShowNotifPanel(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                  <div style={{
                    position: "absolute", top: 46, right: 0, width: 360, maxHeight: 440,
                    background: "var(--white)", borderRadius: "var(--r-lg)", zIndex: 999,
                    boxShadow: "var(--sh-3)",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "16px 20px", borderBottom: "1px solid var(--border)",
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Notificaciones</span>
                      {notificationHistory.length > 0 ? (
                        <button
                          onClick={() => clearHistory()}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 12, color: "var(--err)", fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                          }}
                        >Borrar todo</button>
                      ) : (
                        <span className="mt-meta">Sin novedades</span>
                      )}
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 380 }}>
                      {notificationHistory.length === 0 ? (
                        <div style={{ padding: 32, textAlign: "center", color: "var(--slate-2)", fontSize: 13 }}>
                          No hay notificaciones recientes
                        </div>
                      ) : (
                        notificationHistory.map((n: { id: string; title: string; body: string; type: string; time: string }) => {
                          const timeAgo = (() => {
                            const diff = Date.now() - new Date(n.time).getTime()
                            const mins = Math.floor(diff / 60000)
                            if (mins < 1) return "ahora"
                            if (mins < 60) return `hace ${mins}m`
                            const hours = Math.floor(mins / 60)
                            if (hours < 24) return `hace ${hours}h`
                            return `hace ${Math.floor(hours / 24)}d`
                          })()
                          return (
                            <div key={n.id} className="crm-notif-row">
                              <div className={`crm-notif-row__dot${n.type === 'lead-new' ? ' is-hot' : n.type === 'cita-new' ? ' is-calendar' : ' is-ai'}`} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{n.title}</div>
                                <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                              </div>
                              <div className="mt-meta" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{timeAgo}</div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div id="topbar-actions" style={{ display: "flex", alignItems: "center", gap: 8 }} />
          </div>
        </div>
        <div className="crm-content">
          {children}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <DemoResetButton />
    </div>
    </NotificationsProvider>
  )
}
