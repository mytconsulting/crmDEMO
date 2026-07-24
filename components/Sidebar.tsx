'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Icon, I } from '@/components/crm-icons'

interface SidebarProps {
  user: { email: string; id: string }
  isAdmin: boolean
  sidebarOpen: boolean
  onClose: () => void
}

// DEMO: solo los módulos que funcionan sin servidor/IA (o zonas informativas).
const NAV_SECTIONS = [
  {
    label: 'OPERACIONES',
    items: [
      { id: "dashboard", href: "/", icon: I.dashboard, label: "Dashboard" },
      { id: "pipeline", href: "/pipeline", icon: I.pipeline, label: "Pipeline" },
      { id: "chat", href: "/chat", icon: I.chat, label: "Chat" },
      { id: "calendario", href: "/calendar", icon: I.cal, label: "Calendario" },
    ],
  },
  {
    label: 'INTELIGENCIA',
    items: [
      { id: "agent", href: "/agent", icon: I.bot, label: "Setter IA" },
    ],
  },
  {
    label: 'ANÁLISIS',
    items: [
      { id: "rendimiento", href: "/rendimiento", icon: I.chart, label: "Rendimiento" },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { id: "empresa", href: "/empresa", icon: I.team, label: "Empresa" },
    ],
  },
]

export default function Sidebar({ sidebarOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const sections = NAV_SECTIONS

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (pathname === href) return true
    // Only match children if no other nav item is a more specific match
    if (pathname.startsWith(href + '/')) {
      const allHrefs = sections.flatMap(s => s.items.map(i => i.href))
      const hasMoreSpecific = allHrefs.some(h => h !== href && h.startsWith(href + '/') && pathname.startsWith(h))
      return !hasMoreSpecific
    }
    return false
  }

  return (
    <>
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <nav className={`crm-sidebar${sidebarOpen ? " open" : ""}`}>
        {/* Brand */}
        <div className="crm-sidebar__brand">
          <div className="crm-sidebar__symbol" aria-hidden="true">
            <div className="crm-sidebar__symbol-bars">
              <span /><span /><span />
            </div>
          </div>
          <div className="crm-sidebar__brand-name">
            <span className="crm-sidebar__wordmark">
              <span className="sf-smart">Smart</span><span className="sf-funnel">Funnel</span>
            </span>
            <small>CRM · M&T</small>
          </div>
        </div>

        {/* Nav sections */}
        {sections.map((section) => (
          <div key={section.label}>
            <div className="crm-sidebar__section-label">{section.label}</div>
            {section.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`crm-nav-item${isActive(item.href) ? ' is-active' : ''}`}
              >
                <Icon d={item.icon} className="crm-nav-item__icon" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        {/* Profile (DEMO: sin cuentas) */}
        <div className="crm-sidebar__profile">
          <div className="crm-sidebar__avatar">D</div>
          <div className="crm-sidebar__profile-info">
            <div className="crm-sidebar__profile-name">Invitado</div>
            <div className="crm-sidebar__profile-role">DEMO</div>
          </div>
        </div>
      </nav>
    </>
  )
}
