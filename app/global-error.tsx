'use client'

export default function GlobalError() {
  return (
    <html lang="es">
      <body>
        <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Algo salió mal</h2>
          <p style={{ color: '#475569' }}>Recarga la página para continuar con la demo.</p>
          <button
            onClick={() => (window.location.href = '/')}
            style={{ marginTop: 16, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Volver al inicio
          </button>
        </div>
      </body>
    </html>
  )
}
