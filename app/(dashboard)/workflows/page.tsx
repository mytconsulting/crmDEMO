'use client'

import { Icon, I } from '@/components/crm-icons'

/**
 * DEMO: pantalla EXPLICATIVA de Workflows (no funcional).
 * Motor de automatizaciones (en el producto real, con builder visual React Flow).
 * Aquí solo se explica qué es y qué se puede montar, con un diagrama estático.
 */

const ACCENT = '#16D998'
const INK = '#0A8F66'
const SOFT = '#D9F7EC'

const TRIGGERS = [
  { icon: I.spark, label: 'Entra un lead nuevo' },
  { icon: I.pipeline, label: 'El lead cambia de etapa' },
  { icon: I.cal, label: 'Se agenda una cita' },
]

const BLOCKS = [
  { icon: I.clock, label: 'Esperar', desc: 'Pausa minutos, horas o días antes del siguiente paso.' },
  { icon: I.branch, label: 'Condición', desc: 'Bifurca según estado, score o canal del lead.' },
  { icon: I.chat, label: 'Enviar mensaje', desc: 'Manda un WhatsApp o DM de Instagram al lead.' },
  { icon: I.bot, label: 'Follow-up IA', desc: 'El agente redacta un seguimiento contextual.' },
  { icon: I.edit, label: 'Actualizar lead', desc: 'Cambia un campo: estado, valor del trato…' },
  { icon: I.send, label: 'Recordatorio', desc: 'Avisa al lead antes de su cita.' },
]

const TEMPLATES = [
  { name: 'Bienvenida a lead nuevo', desc: 'Cuando entra un lead, le envía al instante un mensaje de bienvenida.' },
  { name: 'Recordatorio de cita', desc: 'Avisa al lead un día antes de su cita, con la antelación que elijas.' },
  { name: 'Follow-up de lead inactivo', desc: 'Si lleva 24 h sin responder, el agente le escribe un mensaje para recuperarlo.' },
  { name: 'Crear trato al pasar a cliente', desc: 'Cuando un lead pasa a "Cliente", registra el trato automáticamente.' },
]

export default function WorkflowsPage() {
  return (
    <div className="wf" style={{ ['--accent' as string]: ACCENT, ['--ink' as string]: INK, ['--soft' as string]: SOFT }}>
      <style>{wfCss}</style>

      {/* Hero */}
      <header className="wf-hero wf-rise" style={{ animationDelay: '0ms' }}>
        <div className="wf-badge">Zona informativa · Demo</div>
        <div className="mt-kicker" style={{ marginBottom: 10 }}>Workflows</div>
        <h2 className="wf-hero__title">Automatiza el seguimiento sin mover un dedo</h2>
        <p className="wf-hero__sub">
          Monta flujos que reaccionan solos a lo que pasa con cada lead: un disparador arranca la secuencia
          y los bloques hacen el resto —esperar, decidir, escribir— para que ningún lead se enfríe.
        </p>
      </header>

      {/* Diagrama de flujo (estático) */}
      <div className="wf-label wf-rise" style={{ animationDelay: '80ms' }}>Así se ve un flujo</div>
      <section className="wf-flow wf-rise" style={{ animationDelay: '120ms' }} aria-label="Ejemplo de flujo">
        <div className="wf-node is-trigger">
          <span className="wf-node__ic"><Icon d={I.spark} size={16} /></span>
          <div><span className="wf-node__kind">Disparador</span><span className="wf-node__t">Entra un lead</span></div>
        </div>
        <span className="wf-arrow" aria-hidden="true"><Icon d={I.arrow} size={16} /></span>
        <div className="wf-node">
          <span className="wf-node__ic"><Icon d={I.chat} size={16} /></span>
          <div><span className="wf-node__kind">Acción</span><span className="wf-node__t">Mensaje de bienvenida</span></div>
        </div>
        <span className="wf-arrow" aria-hidden="true"><Icon d={I.arrow} size={16} /></span>
        <div className="wf-node">
          <span className="wf-node__ic"><Icon d={I.clock} size={16} /></span>
          <div><span className="wf-node__kind">Esperar</span><span className="wf-node__t">1 día</span></div>
        </div>
        <span className="wf-arrow" aria-hidden="true"><Icon d={I.arrow} size={16} /></span>
        <div className="wf-node is-branch">
          <span className="wf-node__ic"><Icon d={I.branch} size={16} /></span>
          <div><span className="wf-node__kind">Condición</span><span className="wf-node__t">¿Ha respondido?</span></div>
        </div>
      </section>

      {/* Bloques */}
      <div className="wf-label wf-rise" style={{ animationDelay: '160ms' }}>Bloques que puedes combinar</div>
      <section className="wf-blocks wf-rise" style={{ animationDelay: '200ms' }}>
        {BLOCKS.map((b) => (
          <div key={b.label} className="wf-block">
            <span className="wf-block__ic"><Icon d={b.icon} size={18} /></span>
            <div>
              <div className="wf-block__name">{b.label}</div>
              <div className="wf-block__desc">{b.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Disparadores */}
      <div className="wf-label wf-rise" style={{ animationDelay: '240ms' }}>Qué puede arrancar un flujo</div>
      <section className="wf-triggers wf-rise" style={{ animationDelay: '260ms' }}>
        {TRIGGERS.map((t) => (
          <span key={t.label} className="wf-trigger"><Icon d={t.icon} size={15} />{t.label}</span>
        ))}
      </section>

      {/* Plantillas */}
      <div className="wf-label wf-rise" style={{ animationDelay: '300ms' }}>Plantillas listas para usar</div>
      <section className="wf-templates wf-rise" style={{ animationDelay: '340ms' }}>
        {TEMPLATES.map((t) => (
          <div key={t.name} className="wf-tpl">
            <span className="wf-tpl__ic"><Icon d={I.flow} size={16} /></span>
            <div>
              <div className="wf-tpl__name">{t.name}</div>
              <div className="wf-tpl__desc">{t.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Nota */}
      <footer className="wf-note wf-rise" style={{ animationDelay: '380ms' }}>
        <span className="wf-note__ic"><Icon d={I.bulb} size={18} /></span>
        <p>
          En esta demo Workflows es solo informativo. En una implementación real montarías estos flujos
          arrastrando bloques en un editor visual, y se ejecutarían solos en segundo plano.
        </p>
      </footer>
    </div>
  )
}

const wfCss = `
.wf { max-width: 1120px; margin: 0 auto; }
@keyframes wfRise { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: none;} }
.wf-rise { opacity: 0; animation: wfRise .55s var(--ease-out, cubic-bezier(.2,.8,.2,1)) forwards; }
@media (prefers-reduced-motion: reduce) { .wf-rise { animation: none; opacity: 1; } }

.wf-badge { display:inline-flex; align-items:center; height:22px; padding:0 10px; margin-bottom:16px; border-radius:999px; background:var(--soft); color:var(--ink); font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; }
.wf-hero { margin-bottom: 26px; }
.wf-hero__title { font-size: clamp(26px, 4vw, 38px); line-height: 1.06; letter-spacing:-0.03em; margin-bottom: 12px; }
.wf-hero__sub { max-width: 680px; color: var(--slate); font-size: 15.5px; line-height: 1.6; }

.wf-label { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--slate-2); margin: 0 2px 12px; }

/* Flujo */
.wf-flow { display:flex; align-items:center; gap: 6px; overflow-x:auto; padding: 20px; margin-bottom: 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--sh-1); }
.wf-node { display:flex; align-items:center; gap: 10px; flex-shrink: 0; background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--r-md); padding: 11px 14px; min-width: 150px; }
.wf-node.is-trigger { border-color: var(--accent); background: color-mix(in oklab, var(--accent), transparent 92%); }
.wf-node.is-branch { border-style: dashed; }
.wf-node__ic { display:flex; width: 30px; height: 30px; border-radius: 8px; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); flex-shrink: 0; }
.wf-node__kind { display:block; font-family: var(--font-mono); font-size: 9px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--slate-2); }
.wf-node__t { display:block; font-size: 13px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; margin-top: 1px; }
.wf-arrow { flex-shrink: 0; color: var(--slate-2); display:flex; }

/* Bloques */
.wf-blocks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
@media (max-width: 860px) { .wf-blocks { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .wf-blocks { grid-template-columns: 1fr; } }
.wf-block { display:flex; gap: 12px; align-items:flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 15px 16px; transition: border-color .2s, transform .2s; }
.wf-block:hover { border-color: color-mix(in oklab, var(--accent), transparent 55%); transform: translateY(-2px); }
.wf-block__ic { flex-shrink:0; width: 36px; height: 36px; border-radius: 9px; display:flex; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); }
.wf-block__name { font-size: 14px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; }
.wf-block__desc { font-size: 12.5px; color: var(--slate); line-height: 1.5; margin-top: 3px; }

/* Disparadores */
.wf-triggers { display:flex; flex-wrap:wrap; gap: 10px; margin-bottom: 28px; }
.wf-trigger { display:inline-flex; align-items:center; gap: 8px; padding: 9px 14px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border-strong); font-size: 13px; font-weight: 500; color: var(--fg); }
.wf-trigger svg { color: var(--ink); }

/* Plantillas */
.wf-templates { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
@media (max-width: 720px) { .wf-templates { grid-template-columns: 1fr; } }
.wf-tpl { display:flex; gap: 12px; align-items:flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 15px 16px; }
.wf-tpl__ic { flex-shrink:0; width: 34px; height: 34px; border-radius: 9px; display:flex; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); }
.wf-tpl__name { font-size: 13.5px; font-weight: 600; color: var(--fg); }
.wf-tpl__desc { font-size: 12.5px; color: var(--slate); line-height: 1.5; margin-top: 3px; }

/* Nota */
.wf-note { display:flex; gap:13px; align-items:flex-start; padding: 18px 20px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-lg); }
.wf-note__ic { color: var(--slate-2); flex-shrink:0; margin-top:1px; }
.wf-note p { color: var(--slate); font-size: 13.5px; line-height: 1.6; }
`
