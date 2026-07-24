'use client'

import { useEffect, useState } from 'react'
import { Icon, I } from '@/components/crm-icons'

/**
 * Popup de bienvenida de la demo.
 * Aparece en la primera visita y cada vez que se reinicia la demo (resetDemo borra
 * la marca `sf_welcome_seen`). Explica quiénes somos + qué es SmartFunnel, e incluye
 * un formulario OPCIONAL de contacto.
 *
 * Envío de datos: el formulario entra como LEAD REAL en SmartFunnel a través de su
 * webhook público de captura (POST /api/webhooks/lead). El tenant_id (UUID de vuestra
 * cuenta) no es secreto: es el mismo identificador que usan las landing pages.
 * Se guarda además una copia local. Si SMARTFUNNEL_TENANT_ID está vacío, solo copia local.
 */

// URL del webhook de captura de leads del SmartFunnel real (producción).
const SMARTFUNNEL_LEAD_WEBHOOK = 'https://www.smartfunnel.es/api/webhooks/lead'
// UUID del tenant de M&T en SmartFunnel (dónde deben caer los leads de la demo).
const SMARTFUNNEL_TENANT_ID = 'a308bc5d-8cd6-4096-bacb-6aa184be9678'

// Datos de contacto que se muestran en el popup.
const CONTACT_EMAIL = 'contacto@mytconsulting.es'
const CONTACT_PHONE = '+34 672 50 18 48'

const SEEN_KEY = 'sf_welcome_seen'
const SUBMISSIONS_KEY = 'sf_welcome_submissions'

type Form = { nombre: string; apellido: string; telefono: string; email: string }
const EMPTY: Form = { nombre: '', apellido: '', telefono: '', email: '' }

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SEEN_KEY)) setOpen(true)
    } catch { /* noop */ }
  }, [])

  const hasData = Object.values(form).some((v) => v.trim() !== '')

  const markSeen = () => {
    try { window.localStorage.setItem(SEEN_KEY, '1') } catch { /* noop */ }
  }

  const close = () => { markSeen(); setOpen(false) }

  const saveLocal = () => {
    try {
      const prev = JSON.parse(window.localStorage.getItem(SUBMISSIONS_KEY) || '[]')
      prev.push({ ...form, at: new Date().toISOString() })
      window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(prev))
    } catch { /* noop */ }
  }

  const handleEnter = async () => {
    if (!hasData) return close()
    setSending(true)
    saveLocal()
    try {
      if (SMARTFUNNEL_TENANT_ID) {
        const nombreCompleto = `${form.nombre} ${form.apellido}`.trim() || 'Sin nombre'
        await fetch(SMARTFUNNEL_LEAD_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: SMARTFUNNEL_TENANT_ID,
            nombre: nombreCompleto,
            email: form.email,
            telefono: form.telefono,
            origen: 'demo',
            notas: 'Contacto dejado en la demo interactiva de SmartFunnel.',
          }),
        })
      }
    } catch { /* si falla el envío, ya guardamos copia local */ }
    setSending(false)
    close()
  }

  if (!open) return null

  const field = (label: string, key: keyof Form, type = 'text', placeholder = '') => (
    <div className="wm-field">
      <label className="wm-label">{label}</label>
      <input
        className="wm-input"
        type={type}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  )

  return (
    <div className="wm-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenido a SmartFunnel">
      <style>{wmCss}</style>
      <div className="wm-card">
        <button className="wm-close" onClick={close} aria-label="Cerrar"><Icon d={I.close} size={20} /></button>

        {/* Cabecera de marca */}
        <div className="wm-brand">
          <span className="wm-symbol" aria-hidden="true"><span /><span /><span /></span>
          <span className="wm-word"><span className="wm-word__s">Smart</span><span className="wm-word__f">Funnel</span></span>
        </div>

        <h2 className="wm-title">Bienvenido a SmartFunnel</h2>
        <p className="wm-text">
          Somos <strong>M&T Consulting</strong>. SmartFunnel es nuestro <strong>CRM con inteligencia
          artificial</strong> para PYMEs: capta, atiende y hace seguimiento a tus leads por WhatsApp e
          Instagram de forma automática, y agenda las citas por ti — para que vendas más sin ampliar equipo.
        </p>
        <p className="wm-text wm-text--muted">
          Esto es una <strong>demo interactiva</strong>: los datos son de ejemplo y viven solo en tu
          navegador. Explora con total libertad.
        </p>

        {/* Formulario opcional */}
        <div className="wm-form">
          <div className="wm-form__head">
            <span className="wm-form__title">¿Quieres que te contactemos?</span>
            <span className="wm-form__opt">Opcional</span>
          </div>
          <div className="wm-grid">
            {field('Nombre', 'nombre', 'text', 'Tu nombre')}
            {field('Apellidos', 'apellido', 'text', 'Tus apellidos')}
            {field('Teléfono', 'telefono', 'tel', '+34 600 000 000')}
            {field('Correo electrónico', 'email', 'email', 'tu@email.com')}
          </div>
        </div>

        {/* Acciones */}
        <button className="wm-cta" onClick={handleEnter} disabled={sending}>
          {sending ? 'Enviando…' : hasData ? 'Enviar y entrar a la demo' : 'Entrar a la demo'}
          <Icon d={I.arrow} size={16} />
        </button>

        {/* Contacto directo */}
        <div className="wm-contact">
          <span className="wm-contact__label">¿Prefieres hablar directamente?</span>
          <div className="wm-contact__links">
            <a href={`mailto:${CONTACT_EMAIL}`} className="wm-contact__link"><Icon d={I.mail} size={14} />{CONTACT_EMAIL}</a>
            <a href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`} className="wm-contact__link"><Icon d={I.phone} size={14} />{CONTACT_PHONE}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

const wmCss = `
.wm-backdrop { position: fixed; inset: 0; z-index: 12000; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(11,15,20,.55); backdrop-filter: blur(4px); animation: wmFade .2s ease-out; }
@keyframes wmFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes wmPop { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
.wm-card { position: relative; width: min(560px, 100%); max-height: 92vh; overflow-y: auto; background: var(--surface, #fff); border: 1px solid var(--border, #e4e6eb); border-radius: 20px; padding: 34px 32px 26px; box-shadow: 0 30px 70px rgba(11,18,32,.28); animation: wmPop .28s cubic-bezier(.2,.8,.2,1); }
@media (max-width: 560px) { .wm-card { padding: 26px 20px 20px; border-radius: 16px; } }

.wm-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border: none; border-radius: 9px; background: var(--paper, #f4f5f7); color: var(--slate, #4a5468); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
.wm-close:hover { background: var(--border, #e4e6eb); color: var(--ink, #0b0f14); }

.wm-brand { display: flex; align-items: center; gap: 11px; margin-bottom: 20px; }
.wm-symbol { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(160deg, #1B232E, #0B0F14); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
.wm-symbol > span { height: 3.6px; border-radius: 99px; background: var(--tide, #16D998); width: 18px; }
.wm-symbol > span:nth-child(2) { width: 11px; }
.wm-symbol > span:nth-child(3) { width: 6px; }
.wm-word { font-family: var(--font-display); font-size: 18px; letter-spacing: -0.02em; }
.wm-word__s { font-weight: 600; color: var(--ink, #0b0f14); }
.wm-word__f { font-weight: 500; color: var(--slate-2, #7a8599); }

.wm-title { font-size: 25px; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 12px; color: var(--ink, #0b0f14); }
.wm-text { font-size: 14.5px; line-height: 1.62; color: var(--slate, #4a5468); margin-bottom: 10px; }
.wm-text--muted { color: var(--slate-2, #7a8599); font-size: 13.5px; }

.wm-form { margin: 22px 0 18px; padding: 18px; background: var(--surface-2, #f4f5f7); border: 1px solid var(--border, #e4e6eb); border-radius: 14px; }
.wm-form__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.wm-form__title { font-size: 14px; font-weight: 600; color: var(--ink, #0b0f14); }
.wm-form__opt { font-family: var(--font-mono); font-size: 10px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: var(--tide-ink, #0a8f66); background: var(--tide-soft, #d4f5ec); padding: 3px 9px; border-radius: 999px; }
.wm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .wm-grid { grid-template-columns: 1fr; } }
.wm-field { display: flex; flex-direction: column; gap: 5px; }
.wm-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--slate-2, #7a8599); }
.wm-input { height: 40px; padding: 0 12px; background: var(--surface, #fff); border: 1px solid var(--border-strong, #c9d0db); border-radius: 9px; font-family: inherit; font-size: 13.5px; color: var(--ink, #0b0f14); outline: none; transition: border-color .12s, box-shadow .12s; }
.wm-input:focus { border-color: var(--tide, #16D998); box-shadow: 0 0 0 3px rgba(22,217,152,.16); }
.wm-input::placeholder { color: var(--slate-2, #7a8599); }

.wm-cta { width: 100%; height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 11px; background: var(--tide, #16D998); color: var(--ink, #0b0f14); font-family: inherit; font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em; cursor: pointer; transition: background .15s, transform .1s; }
.wm-cta:hover { background: #12C58C; }
.wm-cta:active { transform: translateY(1px); }
.wm-cta:disabled { opacity: .7; cursor: default; }

.wm-contact { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border, #e4e6eb); text-align: center; }
.wm-contact__label { display: block; font-size: 12.5px; color: var(--slate-2, #7a8599); margin-bottom: 8px; }
.wm-contact__links { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; justify-content: center; }
.wm-contact__link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--tide-ink, #0a8f66); text-decoration: none; }
.wm-contact__link:hover { text-decoration: underline; }
`
