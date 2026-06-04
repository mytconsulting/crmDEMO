'use client'

import { useState } from 'react'
import { resetDemo } from '@/lib/demo/store'

export default function DemoResetButton() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleReset = () => {
    setResetting(true)
    resetDemo()
    // Recargar para que todas las vistas vuelvan a leer los datos sembrados.
    window.location.href = '/'
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        title="Reiniciar la demo (borra tus cambios y recarga los datos de ejemplo)"
        style={{
          position: 'fixed', bottom: 20, left: 20, zIndex: 9998,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
          border: '1px solid rgba(15,23,42,0.08)', background: '#fff',
          color: 'var(--slate, #475569)', fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.7 3" />
          <path d="M3 3v6h6" />
        </svg>
        Reiniciar demo
      </button>

      {showConfirm && (
        <>
          <div
            onClick={() => !resetting && setShowConfirm(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 10001, background: '#fff', borderRadius: 20, padding: 28,
              width: 'min(380px, 90vw)', boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 12 }}>🔄</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              ¿Reiniciar la demo?
            </h3>
            <p style={{ margin: '0 0 22px', fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
              Se borrarán todos los cambios que hayas hecho (leads, citas, equipo…) y se
              volverán a cargar los datos de ejemplo. Es como limpiar la caché del navegador.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={resetting}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: '1px solid #e2e8f0',
                  background: '#fff', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 800,
                  cursor: resetting ? 'default' : 'pointer', opacity: resetting ? 0.7 : 1,
                }}
              >
                {resetting ? 'Reiniciando…' : 'Sí, reiniciar'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
