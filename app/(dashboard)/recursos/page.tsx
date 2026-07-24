'use client'

import { Icon, I } from '@/components/crm-icons'

/**
 * DEMO: pantalla EXPLICATIVA de Recursos (no funcional).
 * Biblioteca de materiales (imágenes, vídeos, documentos, enlaces) que el agente IA
 * o un workflow envían al lead en el momento adecuado. Aquí solo se explica.
 */

const ACCENT = '#6366F1'
const INK = '#4F46E5'
const SOFT = '#EEF0FF'

const TYPES = [
  { icon: I.image, label: 'Imágenes', desc: 'Fotos de producto, instalaciones, resultados antes/después.' },
  { icon: I.video, label: 'Vídeos', desc: 'Presentaciones, demos o testimonios de clientes.' },
  { icon: I.file, label: 'Documentos', desc: 'Catálogos, planes, tarifas o propuestas en PDF/DOC.' },
  { icon: I.paperclip, label: 'Enlaces', desc: 'URL a tu web, calendario o cualquier recurso externo.' },
]

const STEPS = [
  { icon: I.plus, title: 'Sube el recurso', desc: 'Un archivo o un enlace, con un nombre claro (p. ej. "Catálogo de catering").' },
  { icon: I.edit, title: 'Di cuándo enviarlo', desc: 'Describe la situación: "cuando el lead pida ver precios". El agente lo usa para decidir.' },
  { icon: I.send, title: 'El agente lo envía solo', desc: 'En plena conversación, el Setter ofrece el recurso justo en el momento adecuado.' },
]

const EXAMPLES = [
  { icon: I.file, name: 'Catálogo de servicios', when: 'Cuando el lead pide ver lo que ofrecéis' },
  { icon: I.image, name: 'Fotos de trabajos realizados', when: 'Cuando duda de la calidad o pide ejemplos' },
  { icon: I.file, name: 'Lista de precios', when: 'Cuando pregunta cuánto cuesta' },
  { icon: I.video, name: 'Vídeo de bienvenida', when: 'Al entrar un lead nuevo por primera vez' },
]

export default function RecursosPage() {
  return (
    <div className="rec" style={{ ['--accent' as string]: ACCENT, ['--ink' as string]: INK, ['--soft' as string]: SOFT }}>
      <style>{recCss}</style>

      {/* Hero */}
      <header className="rec-hero rec-rise" style={{ animationDelay: '0ms' }}>
        <div className="rec-badge">Zona informativa · Demo</div>
        <div className="mt-kicker" style={{ marginBottom: 10, color: 'var(--ink)' }}>Recursos</div>
        <h2 className="rec-hero__title">La biblioteca que tu agente usa para vender</h2>
        <p className="rec-hero__sub">
          Guarda aquí los materiales de tu negocio —catálogos, fotos, vídeos, tarifas— y el{' '}
          <strong style={{ color: 'var(--ink)' }}>Setter IA</strong> los envía al lead en el momento justo,
          sin que tengas que buscarlos ni mandarlos a mano.
        </p>
      </header>

      {/* Tipos de recurso */}
      <div className="rec-label rec-rise" style={{ animationDelay: '80ms' }}>Qué puedes guardar</div>
      <section className="rec-types rec-rise" style={{ animationDelay: '120ms' }}>
        {TYPES.map((t) => (
          <div key={t.label} className="rec-type">
            <span className="rec-type__ic"><Icon d={t.icon} size={20} /></span>
            <div className="rec-type__name">{t.label}</div>
            <div className="rec-type__desc">{t.desc}</div>
          </div>
        ))}
      </section>

      {/* Cómo funciona */}
      <div className="rec-label rec-rise" style={{ animationDelay: '160ms' }}>Cómo funciona</div>
      <section className="rec-steps rec-rise" style={{ animationDelay: '200ms' }}>
        {STEPS.map((s, i) => (
          <div key={s.title} className="rec-step">
            <span className="rec-step__num">{i + 1}</span>
            <span className="rec-step__ic"><Icon d={s.icon} size={18} /></span>
            <div className="rec-step__title">{s.title}</div>
            <div className="rec-step__desc">{s.desc}</div>
          </div>
        ))}
      </section>

      {/* Ejemplos */}
      <div className="rec-label rec-rise" style={{ animationDelay: '240ms' }}>Ejemplos habituales</div>
      <section className="rec-examples rec-rise" style={{ animationDelay: '280ms' }}>
        {EXAMPLES.map((e) => (
          <div key={e.name} className="rec-ex">
            <span className="rec-ex__ic"><Icon d={e.icon} size={16} /></span>
            <div className="rec-ex__body">
              <div className="rec-ex__name">{e.name}</div>
              <div className="rec-ex__when"><span className="rec-ex__dot" />{e.when}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Nota */}
      <footer className="rec-note rec-rise" style={{ animationDelay: '320ms' }}>
        <span className="rec-note__ic"><Icon d={I.bulb} size={18} /></span>
        <p>
          En esta demo Recursos es solo informativo. En una implementación real subirías tus archivos y el
          agente los enviaría automáticamente durante las conversaciones de WhatsApp e Instagram.
        </p>
      </footer>
    </div>
  )
}

const recCss = `
.rec { max-width: 1120px; margin: 0 auto; }
@keyframes recRise { from { opacity: 0; transform: translateY(14px);} to { opacity: 1; transform: none;} }
.rec-rise { opacity: 0; animation: recRise .55s var(--ease-out, cubic-bezier(.2,.8,.2,1)) forwards; }
@media (prefers-reduced-motion: reduce) { .rec-rise { animation: none; opacity: 1; } }

.rec-badge { display:inline-flex; align-items:center; height:22px; padding:0 10px; margin-bottom:16px; border-radius:999px; background:var(--soft); color:var(--ink); font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:.12em; text-transform:uppercase; }
.rec-hero { margin-bottom: 26px; }
.rec-hero__title { font-size: clamp(26px, 4vw, 38px); line-height: 1.06; letter-spacing:-0.03em; margin-bottom: 12px; }
.rec-hero__sub { max-width: 660px; color: var(--slate); font-size: 15.5px; line-height: 1.6; }

.rec-label { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--slate-2); margin: 0 2px 12px; }

/* Tipos */
.rec-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
@media (max-width: 900px) { .rec-types { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .rec-types { grid-template-columns: 1fr; } }
.rec-type { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; transition: border-color .2s, box-shadow .2s, transform .2s; }
.rec-type:hover { border-color: color-mix(in oklab, var(--accent), transparent 55%); box-shadow: 0 14px 30px color-mix(in oklab, var(--accent), transparent 88%); transform: translateY(-2px); }
.rec-type__ic { display:inline-flex; width: 42px; height: 42px; border-radius: 11px; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); margin-bottom: 12px; }
.rec-type__name { font-size: 14.5px; font-weight: 600; color: var(--ink-strong, var(--fg)); letter-spacing: -0.01em; }
.rec-type__desc { font-size: 12.5px; color: var(--slate); line-height: 1.5; margin-top: 4px; }

/* Pasos */
.rec-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; position: relative; }
@media (max-width: 760px) { .rec-steps { grid-template-columns: 1fr; } }
.rec-step { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 20px; }
.rec-step__num { position:absolute; top:16px; right:16px; font-family: var(--font-mono); font-size: 26px; font-weight: 700; line-height: 1; color: color-mix(in oklab, var(--accent), transparent 80%); }
.rec-step__ic { display:inline-flex; width: 40px; height: 40px; border-radius: 11px; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); margin-bottom: 14px; }
.rec-step__title { font-size: 15px; font-weight: 600; color: var(--fg); letter-spacing: -0.01em; }
.rec-step__desc { font-size: 13px; color: var(--slate); line-height: 1.55; margin-top: 5px; }

/* Ejemplos */
.rec-examples { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
@media (max-width: 720px) { .rec-examples { grid-template-columns: 1fr; } }
.rec-ex { display:flex; gap: 12px; align-items:center; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: 14px 16px; }
.rec-ex__ic { flex-shrink:0; width: 34px; height: 34px; border-radius: 9px; display:flex; align-items:center; justify-content:center; background: var(--soft); color: var(--ink); }
.rec-ex__name { font-size: 13.5px; font-weight: 600; color: var(--fg); }
.rec-ex__when { display:flex; align-items:center; gap:7px; font-size: 12px; color: var(--slate); margin-top: 3px; }
.rec-ex__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }

/* Nota */
.rec-note { display:flex; gap:13px; align-items:flex-start; padding: 18px 20px; background: var(--surface-2); border: 1px dashed var(--border-strong); border-radius: var(--r-lg); }
.rec-note__ic { color: var(--slate-2); flex-shrink:0; margin-top:1px; }
.rec-note p { color: var(--slate); font-size: 13.5px; line-height: 1.6; }
`
