'use client'

import { Icon, I } from '@/components/crm-icons'

/**
 * DEMO: pantalla EXPLICATIVA del Agente de Soporte y su sistema de tickets (no funcional).
 * Explica el ciclo de vida del ticket y cuándo se pausa/reactiva el agente.
 * Mecánica real: el agente se controla con `chatbot_activo` (activo/pausado).
 */

const ACCENT = '#3E7BFA'
const INK = '#2B5FD0'
const SOFT = '#E6EEFF'

type State = 'activo' | 'pausado'

const STEPS: { icon: React.ReactNode; title: string; desc: string; state: State; badge?: string }[] = [
  {
    icon: I.chat,
    title: 'El agente atiende al cliente',
    desc: 'El Agente de Soporte responde las dudas de tus clientes 24/7, con el conocimiento de tu negocio.',
    state: 'activo',
  },
  {
    icon: I.clipboard,
    title: 'No sabe algo → crea un ticket',
    desc: 'Si llega una pregunta que no sabe responder, guarda la duda como ticket y avisa a tu equipo. No se inventa nada.',
    state: 'activo',
    badge: 'Sigue atendiendo',
  },
  {
    icon: I.inbox,
    title: 'El ticket te llega',
    desc: 'Recibes el ticket con la pregunta pendiente. El agente, mientras tanto, sigue dando soporte en el chat con normalidad.',
    state: 'activo',
  },
  {
    icon: I.user,
    title: 'Tú respondes al cliente',
    desc: 'En cuanto le escribes al cliente por WhatsApp (o pausas el agente a mano), el agente se pausa en ese chat para no pisarte.',
    state: 'pausado',
  },
  {
    icon: I.checkCircle,
    title: 'Resuelves el ticket → se reactiva',
    desc: 'Cuando das la solución por completada, el agente vuelve a activarse y retoma el soporte de ese cliente.',
    state: 'activo',
  },
]

const RULES = [
  {
    icon: I.clipboard,
    title: 'Crear un ticket NO pausa al agente',
    desc: 'Guarda la pregunta que no sabe responder, pero sigue activo en el chat para atender todo lo demás.',
  },
  {
    icon: I.user,
    title: 'Solo se pausa si intervienes tú',
    desc: 'El agente únicamente se detiene si lo pausas manualmente o si le escribes al cliente por WhatsApp. Nada más lo para.',
  },
  {
    icon: I.refresh,
    title: 'Al resolver, vuelve solo',
    desc: 'Cuando marcas el ticket como resuelto, el agente se reactiva automáticamente y sigue dando soporte.',
  },
]

function StateChip({ state, badge }: { state: State; badge?: string }) {
  const isActive = state === 'activo'
  return (
    <span className={`sop-state is-${state}`}>
      <span className="sop-state__dot" />
      {badge ? badge : isActive ? 'Agente activo' : 'Agente pausado'}
    </span>
  )
}

export default function SoportePage() {
  return (
    <div className="sop" style={{ ['--accent' as string]: ACCENT, ['--ink' as string]: INK, ['--soft' as string]: SOFT }}>
      <style>{sopCss}</style>

      {/* Hero */}
      <header className="sop-hero sop-rise" style={{ animationDelay: '0ms' }}>
        <div className="sop-badge">Zona informativa · Demo</div>
        <div className="mt-kicker" style={{ marginBottom: 10, color: 'var(--ink)' }}>Soporte</div>
        <h2 className="sop-hero__title">Soporte con IA y red de seguridad</h2>
        <p className="sop-hero__sub">
          El Agente de Soporte atiende a tus clientes solo. Y cuando hay algo que no sabe, no se para ni se
          lo inventa: <strong style={{ color: 'var(--ink)' }}>crea un ticket</strong>, te avisa y sigue
          ayudando. Tú entras solo cuando hace falta.
        </p>
      </header>

      {/* Ciclo de vida */}
      <div className="sop-label sop-rise" style={{ animationDelay: '80ms' }}>Ciclo de un ticket</div>
      <section className="sop-flow sop-rise" style={{ animationDelay: '120ms' }} aria-label="Ciclo de vida del ticket">
        {STEPS.map((s, i) => (
          <div key={s.title} className="sop-step">
            <div className="sop-step__rail">
              <span className="sop-step__num">{i + 1}</span>
              {i < STEPS.length - 1 && <span className="sop-step__line" aria-hidden="true" />}
            </div>
            <div className="sop-step__card">
              <div className="sop-step__top">
                <span className="sop-step__ic"><Icon d={s.icon} size={18} /></span>
                <h3 className="sop-step__title">{s.title}</h3>
                <StateChip state={s.state} badge={s.badge} />
              </div>
              <p className="sop-step__desc">{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Reglas importantes */}
      <div className="sop-label sop-rise" style={{ animationDelay: '200ms' }}>Lo importante</div>
      <section className="sop-rules sop-rise" style={{ animationDelay: '240ms' }}>
        {RULES.map((r) => (
          <div key={r.title} className="sop-rule">
            <span className="sop-rule__ic"><Icon d={r.icon} size={18} /></span>
            <div className="sop-rule__title">{r.title}</div>
            <div className="sop-rule__desc">{r.desc}</div>
          </div>
        ))}
      </section>

      {/* Leyenda de estados */}
      <section className="sop-legend sop-rise" style={{ animationDelay: '300ms' }}>
        <span className="sop-legend__item"><span className="sop-dot is-activo" /> <strong>Agente activo</strong> — responde automáticamente</span>
        <span className="sop-legend__item"><span className="sop-dot is-pausado" /> <strong>Agente pausado</strong> — atención manual, no responde</span>
      </section>

      {/* Nota */}
      <footer className="sop-note sop-rise" style={{ animationDelay: '340ms' }}>
        <span className="sop-note__ic"><Icon d={I.bulb} size={18} /></span>
        <p>
          En esta demo Soporte es solo informativo. En una implementación real, los tickets y la
          activación/pausa del agente se gestionan automáticamente desde la conversación de cada cliente.
        </p>
      </footer>
    </div>
  )
}

const sopCss = `
.sop { max-width: 1000px; margin: 0 auto; }
@keyframes sopRise { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: none;} }
.sop-rise { opacity: 0; animation: sopRise .55s var(--ease-out, cubic-bezier(.2,.8,.2,1)) forwards; }
@media (prefers-reduced-motion: reduce) { .sop-rise { animation: none; opacity: 1; } }

.sop-badge { display:inline-flex; align-items:center; height:22px; padding:0 10px; margin-bottom:16px; border-radius:999px; background:var(--soft); color:var(--ink); font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; }
.sop-hero { margin-bottom: 26px; }
.sop-hero__title { font-size: clamp(26px, 4vw, 38px); line-height: 1.06; letter-spacing:-0.03em; margin-bottom: 12px; }
.sop-hero__sub { max-width: 660px; color: var(--slate); font-size: 15.5px; line-height: 1.6; }

.sop-label { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--slate-2); margin: 0 2px 14px; }

/* Timeline */
.sop-flow { margin-bottom: 30px; }
.sop-step { display: flex; gap: 16px; }
.sop-step__rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.sop-step__num { width: 30px; height: 30px; border-radius: 50%; background: var(--ink); color: #fff; font-family: var(--font-mono); font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; z-index: 1; }
.sop-step__line { width: 2px; flex: 1; background: color-mix(in oklab, var(--accent), transparent 70%); margin: 4px 0; min-height: 20px; }
.sop-step__card { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 16px 18px; margin-bottom: 12px; transition: border-color .2s, box-shadow .2s; }
.sop-step__card:hover { border-color: color-mix(in oklab, var(--accent), transparent 55%); box-shadow: var(--sh-1); }
.sop-step__top { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
.sop-step__ic { display:flex; width: 34px; height: 34px; border-radius: 9px; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); flex-shrink: 0; }
.sop-step__title { font-size: 15.5px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; margin: 0; flex: 1; min-width: 140px; }
.sop-step__desc { font-size: 13.5px; color: var(--slate); line-height: 1.6; margin-top: 10px; }

/* State chip */
.sop-state { display:inline-flex; align-items:center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.sop-state__dot { width: 7px; height: 7px; border-radius: 50%; }
.sop-state.is-activo { background: rgba(22,160,106,.1); color: #0F7A50; }
.sop-state.is-activo .sop-state__dot { background: #16D998; box-shadow: 0 0 0 3px rgba(22,217,152,.25); }
.sop-state.is-pausado { background: rgba(229,72,77,.1); color: #C23B40; }
.sop-state.is-pausado .sop-state__dot { background: #E5484D; }

/* Reglas */
.sop-rules { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
@media (max-width: 800px) { .sop-rules { grid-template-columns: 1fr; } }
.sop-rule { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; border-top: 3px solid var(--accent); }
.sop-rule__ic { display:inline-flex; width: 40px; height: 40px; border-radius: 11px; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); margin-bottom: 12px; }
.sop-rule__title { font-size: 14.5px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; }
.sop-rule__desc { font-size: 12.5px; color: var(--slate); line-height: 1.55; margin-top: 5px; }

/* Leyenda */
.sop-legend { display: flex; flex-wrap: wrap; gap: 18px; padding: 14px 18px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); margin-bottom: 22px; }
.sop-legend__item { display:flex; align-items:center; gap: 8px; font-size: 12.5px; color: var(--slate); }
.sop-legend__item strong { color: var(--fg); }
.sop-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.sop-dot.is-activo { background: #16D998; }
.sop-dot.is-pausado { background: #E5484D; }

/* Nota */
.sop-note { display:flex; gap:13px; align-items:flex-start; padding: 18px 20px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-lg); }
.sop-note__ic { color: var(--slate-2); flex-shrink:0; margin-top:1px; }
.sop-note p { color: var(--slate); font-size: 13.5px; line-height: 1.6; }
`
