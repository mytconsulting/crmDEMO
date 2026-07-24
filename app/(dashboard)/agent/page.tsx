'use client'

import { Icon, I } from '@/components/crm-icons'

/**
 * DEMO: pantalla EXPLICATIVA de los Agentes IA (no funcional).
 * Dos agentes claramente diferenciados por color:
 *   - Setter (Ventas)   → verde de marca (--tide)
 *   - Soporte (Atención) → azul (--info)
 * En el producto real aquí se configuran; en la demo solo se explican.
 */

const SETTER = {
  accent: '#16D998',
  ink: '#0A8F66',
  soft: '#D9F7EC',
  icon: I.money,
  name: 'Agente Setter',
  role: 'Ventas',
  tagline: 'Convierte a los interesados en citas. Atiende, cualifica y agenda por ti, en cuanto entra el lead.',
  when: 'Actúa ANTES de la venta',
  skills: [
    { icon: I.chat, text: 'Atiende por WhatsApp e Instagram con el tono de tu marca' },
    { icon: I.bolt, text: 'Responde al instante, 24/7, también fuera de horario' },
    { icon: I.target, text: 'Cualifica y puntúa cada lead según su interés real' },
    { icon: I.cal, text: 'Propone hueco y agenda la cita sin intervención humana' },
    { icon: I.refresh, text: 'Hace follow-up de los leads fríos para recuperar ventas' },
  ],
}

const SOPORTE = {
  accent: '#3E7BFA',
  ink: '#2B5FD0',
  soft: '#E6EEFF',
  icon: I.help,
  name: 'Agente de Soporte',
  role: 'Atención al cliente',
  tagline: 'Cuida a tus clientes actuales. Resuelve dudas al momento y deriva a tu equipo solo cuando hace falta.',
  when: 'Actúa DESPUÉS de la venta',
  skills: [
    { icon: I.chat, text: 'Resuelve las dudas frecuentes de tus clientes' },
    { icon: I.bulb, text: 'Aprende de tus FAQs y documentos para responder con criterio' },
    { icon: I.bolt, text: 'Disponible siempre, sin colas ni tiempos de espera' },
    { icon: I.handshake, text: 'Deriva a una persona cuando el caso lo requiere' },
    { icon: I.shield, text: 'Mantiene la voz y las normas de tu negocio' },
  ],
}

const JOURNEY = [
  { label: 'Llega el lead', side: 'setter' },
  { label: 'Cualifica', side: 'setter' },
  { label: 'Agenda cita', side: 'setter' },
  { label: 'Venta', side: 'setter' },
  { label: 'Cliente', side: 'soporte' },
  { label: 'Le atiende', side: 'soporte' },
]

type Agent = typeof SETTER

function AgentCard({ a, delay }: { a: Agent; delay: number }) {
  return (
    <article
      className="agp-card agp-rise"
      style={{ ['--accent' as string]: a.accent, ['--ink' as string]: a.ink, ['--soft' as string]: a.soft, animationDelay: `${delay}ms` }}
    >
      <span className="agp-card__bar" aria-hidden="true" />
      <header className="agp-card__head">
        <span className="agp-card__chip"><Icon d={a.icon} size={22} /></span>
        <div>
          <div className="agp-card__role">{a.role}</div>
          <h3 className="agp-card__name">{a.name}</h3>
        </div>
      </header>

      <p className="agp-card__tag">{a.tagline}</p>

      <ul className="agp-skills">
        {a.skills.map((s) => (
          <li key={s.text} className="agp-skill">
            <span className="agp-skill__ic"><Icon d={s.icon} size={15} /></span>
            <span>{s.text}</span>
          </li>
        ))}
      </ul>

      <footer className="agp-card__foot">
        <span className="agp-when"><span className="agp-when__dot" />{a.when}</span>
      </footer>
    </article>
  )
}

export default function AgentesPage() {
  return (
    <div className="agp">
      <style>{agpCss}</style>

      {/* Hero */}
      <header className="agp-hero agp-rise" style={{ animationDelay: '0ms' }}>
        <div className="agp-badge">Zona informativa · Demo</div>
        <div className="mt-kicker" style={{ marginBottom: 10 }}>Agentes IA</div>
        <h2 className="agp-hero__title">Dos agentes de IA que trabajan tu embudo</h2>
        <p className="agp-hero__sub">
          No es un solo bot para todo. Son <strong style={{ color: SETTER.ink }}>dos agentes especializados</strong> que
          se relevan: el <strong style={{ color: SETTER.ink }}>Setter</strong> convierte interesados en citas, y el{' '}
          <strong style={{ color: SOPORTE.ink }}>Soporte</strong> cuida a los que ya son clientes.
        </p>
      </header>

      {/* Recorrido: dónde actúa cada uno */}
      <section className="agp-journey agp-rise" style={{ animationDelay: '80ms' }} aria-label="Recorrido del cliente">
        <div className="agp-journey__track">
          {JOURNEY.map((n, i) => (
            <div key={n.label} className={`agp-node is-${n.side}`}>
              <span className="agp-node__dot" />
              <span className="agp-node__label">{n.label}</span>
              {i < JOURNEY.length - 1 && <span className="agp-node__link" aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="agp-journey__legend">
          <span className="agp-tag is-setter">Setter · Ventas</span>
          <span className="agp-handoff"><Icon d={I.refresh} size={13} /> relevo tras la venta</span>
          <span className="agp-tag is-soporte">Soporte · Atención</span>
        </div>
      </section>

      {/* Los dos agentes */}
      <section className="agp-grid">
        <AgentCard a={SETTER} delay={160} />
        <AgentCard a={SOPORTE} delay={240} />
      </section>

      {/* Nota */}
      <footer className="agp-note agp-rise" style={{ animationDelay: '320ms' }}>
        <span className="agp-note__ic"><Icon d={I.bulb} size={18} /></span>
        <p>
          En esta demo los agentes son solo informativos. En una implementación real se conectan a tu
          WhatsApp e Instagram y se configura su estilo, sus mensajes y su base de conocimiento para que
          hablen exactamente como tu negocio.
        </p>
      </footer>
    </div>
  )
}

const agpCss = `
.agp { max-width: 1120px; margin: 0 auto; }

/* Entrada escalonada */
@keyframes agpRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.agp-rise { opacity: 0; animation: agpRise .6s var(--ease-out, cubic-bezier(.2,.8,.2,1)) forwards; }
@media (prefers-reduced-motion: reduce) { .agp-rise { animation: none; opacity: 1; } }

/* Hero */
.agp-badge {
  display: inline-flex; align-items: center; height: 22px; padding: 0 10px; margin-bottom: 16px;
  border-radius: 999px; background: var(--tide-soft); color: var(--tide-ink);
  font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;
}
.agp-hero { margin-bottom: 22px; }
.agp-hero__title { font-size: clamp(26px, 4vw, 40px); line-height: 1.05; letter-spacing: -0.03em; margin-bottom: 12px; }
.agp-hero__sub { max-width: 680px; color: var(--slate); font-size: 15.5px; line-height: 1.6; }

/* Recorrido */
.agp-journey {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg);
  padding: 22px 24px; margin-bottom: 22px; box-shadow: var(--sh-1);
}
.agp-journey__track { display: flex; align-items: flex-start; gap: 0; overflow-x: auto; padding-bottom: 4px; }
.agp-node { position: relative; flex: 1 1 0; min-width: 92px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.agp-node__dot {
  width: 16px; height: 16px; border-radius: 50%; background: var(--seg); position: relative; z-index: 2;
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--seg), transparent 82%);
}
.agp-node__label {
  margin-top: 10px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .06em;
  text-transform: uppercase; color: var(--slate); font-weight: 500;
}
.agp-node__link { position: absolute; top: 8px; left: 50%; width: 100%; height: 2px; background: var(--seg); z-index: 1; opacity: .5; }
.agp-node.is-setter { --seg: #16D998; }
.agp-node.is-soporte { --seg: #3E7BFA; }
/* el relevo: el enlace del último nodo verde tiñe hacia el azul */
.agp-node.is-setter:nth-child(4) .agp-node__link { background: linear-gradient(90deg, #16D998, #3E7BFA); opacity: .7; }
.agp-journey__legend { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); }
.agp-tag { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.agp-tag::before { content: ''; width: 9px; height: 9px; border-radius: 3px; }
.agp-tag.is-setter { color: #0A8F66; } .agp-tag.is-setter::before { background: #16D998; }
.agp-tag.is-soporte { color: #2B5FD0; } .agp-tag.is-soporte::before { background: #3E7BFA; }
.agp-handoff { display: inline-flex; align-items: center; gap: 6px; margin: 0 2px; color: var(--slate-2); font-size: 12px; }

/* Grid de agentes */
.agp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
@media (max-width: 780px) { .agp-grid { grid-template-columns: 1fr; } }

.agp-card {
  position: relative; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: 26px 24px 22px; overflow: hidden;
  transition: box-shadow .25s var(--ease-out, ease), transform .25s var(--ease-out, ease), border-color .25s var(--ease-out, ease);
}
.agp-card:hover { box-shadow: 0 2px 6px rgba(11,18,32,.06), 0 22px 48px color-mix(in oklab, var(--accent), transparent 84%); transform: translateY(-3px); border-color: color-mix(in oklab, var(--accent), transparent 55%); }
.agp-card__bar { position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent), #fff 35%)); }
/* halo decorativo */
.agp-card::after { content: ''; position: absolute; right: -80px; top: -80px; width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle, color-mix(in oklab, var(--accent), transparent 88%), transparent 70%); pointer-events: none; }

.agp-card__head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.agp-card__chip {
  width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--soft); color: var(--ink);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--accent), transparent 70%);
}
.agp-card__role { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--ink); }
.agp-card__name { font-size: 21px; letter-spacing: -0.02em; margin-top: 2px; color: var(--ink-strong, var(--ink)); }
.agp-card__tag { color: var(--slate); font-size: 14px; line-height: 1.6; margin-bottom: 18px; }

.agp-skills { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.agp-skill { display: flex; align-items: flex-start; gap: 11px; font-size: 13.5px; line-height: 1.5; color: var(--fg); }
.agp-skill__ic {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 7px; margin-top: 1px;
  display: flex; align-items: center; justify-content: center;
  background: var(--soft); color: var(--ink);
}

.agp-card__foot { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
.agp-when { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--ink); }
.agp-when__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent), transparent 80%); }

/* Nota */
.agp-note {
  display: flex; gap: 13px; align-items: flex-start; padding: 18px 20px;
  background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-lg);
}
.agp-note__ic { color: var(--slate-2); flex-shrink: 0; margin-top: 1px; }
.agp-note p { color: var(--slate); font-size: 13.5px; line-height: 1.6; }
`
