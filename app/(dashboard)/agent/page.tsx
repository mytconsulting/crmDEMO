'use client'

import { Icon, I } from '@/components/crm-icons'

/**
 * DEMO: pantalla EXPLICATIVA del Setter IA (no funcional).
 * En el producto real, aquí se configura el agente (estilo, prompts, ventas + soporte).
 * En la demo solo describimos qué hace, sin backend ni IA.
 */

const CAPABILITIES = [
  {
    icon: I.chat,
    title: 'Atiende por WhatsApp e Instagram',
    desc: 'Responde a cada lead en el canal por el que llegó, de forma natural y con el tono de tu negocio.',
  },
  {
    icon: I.bolt,
    title: 'Responde al instante, 24/7',
    desc: 'Ningún lead se queda sin respuesta. El agente contesta a cualquier hora, también fuera del horario de oficina.',
  },
  {
    icon: I.target,
    title: 'Cualifica y puntúa leads',
    desc: 'Detecta el interés real, hace las preguntas clave y asigna un score para que tu equipo priorice a los más calientes.',
  },
  {
    icon: I.cal,
    title: 'Agenda citas solo',
    desc: 'Propone huecos, confirma la cita y la deja en el calendario sin que intervenga nadie de tu equipo.',
  },
  {
    icon: I.refresh,
    title: 'Hace seguimiento inteligente',
    desc: 'Retoma las conversaciones que se enfrían con follow-ups en el momento adecuado para recuperar ventas.',
  },
  {
    icon: I.bot,
    title: 'Aprende de tu negocio',
    desc: 'Usa la información de tu empresa y del cliente ideal para personalizar cada mensaje. Cuanto más sabe, mejor vende.',
  },
]

const AGENTS = [
  {
    icon: I.money,
    kicker: 'Agente de Ventas',
    title: 'Convierte conversaciones en citas',
    desc: 'Cualifica al lead, resuelve objeciones y lo guía hacia la reunión o la venta. Se apoya en la información de tu empresa y en el avatar de cliente ideal.',
  },
  {
    icon: I.help,
    kicker: 'Agente de Soporte',
    title: 'Atiende a tus clientes actuales',
    desc: 'Responde dudas frecuentes con el conocimiento que le das (FAQs, documentos), y deriva a una persona cuando hace falta.',
  },
]

export default function AgentInfoPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Aviso de demo */}
      <div className="crm-badge crm-badge--accent" style={{ marginBottom: 16 }}>
        Zona informativa · Demo
      </div>

      {/* Hero */}
      <div className="crm-card" style={{ marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 680 }}>
          <div className="mt-kicker" style={{ marginBottom: 10 }}>Setter IA</div>
          <h2 style={{ marginBottom: 12 }}>Un comercial de IA que trabaja tus leads solo</h2>
          <p style={{ color: 'var(--slate)', fontSize: 15, lineHeight: 1.6 }}>
            El Setter IA es un agente conversacional que atiende, cualifica y agenda a tus leads
            por WhatsApp e Instagram — con el tono de tu marca y sin descanso. Tu equipo solo
            entra cuando el lead ya está caliente y con la cita puesta.
          </p>
        </div>
        <div className="mt-arc" aria-hidden="true" />
        <div className="mt-arc mt-arc--inner" aria-hidden="true" />
      </div>

      {/* Capacidades */}
      <div className="crm-card__subtitle" style={{ margin: '4px 2px 12px' }}>Qué hace por ti</div>
      <div className="crm-modules-grid" style={{ marginBottom: 24 }}>
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="crm-module-card is-on">
            <div className="crm-module-card__head">
              <div className="crm-module-card__icon"><Icon d={c.icon} size={20} /></div>
            </div>
            <div className="crm-module-card__title">{c.title}</div>
            <div className="crm-module-card__desc">{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Dos agentes */}
      <div className="crm-card__subtitle" style={{ margin: '4px 2px 12px' }}>Dos agentes, un objetivo</div>
      <div className="crm-grid-cols-2" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        {AGENTS.map((a) => (
          <div key={a.kicker} className="crm-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div className="crm-module-card__icon" style={{ background: 'var(--tide-soft)', color: 'var(--tide-ink)' }}>
                <Icon d={a.icon} size={20} />
              </div>
              <div>
                <div className="mt-kicker">{a.kicker}</div>
                <div className="crm-card__title" style={{ marginTop: 2 }}>{a.title}</div>
              </div>
            </div>
            <p style={{ color: 'var(--slate)', fontSize: 13.5, lineHeight: 1.6 }}>{a.desc}</p>
          </div>
        ))}
      </div>

      {/* Nota final */}
      <div className="crm-card" style={{ background: 'var(--surface-2)', borderStyle: 'dashed' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ color: 'var(--slate-2)', flexShrink: 0, marginTop: 2 }}><Icon d={I.bulb} size={18} /></div>
          <p style={{ color: 'var(--slate)', fontSize: 13.5, lineHeight: 1.6 }}>
            En esta demo el Setter IA es solo informativo. En una implementación real se conecta a
            tu WhatsApp e Instagram y se configura su estilo de comunicación, sus mensajes y su base
            de conocimiento para que hable exactamente como tu negocio.
          </p>
        </div>
      </div>
    </div>
  )
}
