# Sesión 2026-04-25 — Rediseño CRM completo

## Fases completadas

### Fase 0 — Setup tipográfico y tokens
- Paquete `geist` (Geist Sans + Geist Mono)
- `app/globals.css` con todos los tokens del Brand Book v1.0
- Clases `mt-*` (brand) y `crm-*` (CRM UI)

### Fase 1 — Layout (Sidebar + Topbar)
- Sidebar oscuro con secciones (Operaciones/Inteligencia/Configuración/Admin)
- Topbar con kicker mono + título
- Icons SVG Lucide-style (`components/crm-icons.tsx`)
- Logo M&T (`Logo.png`) en sidebar, login, register, favicon, PWA

### Fase 2 — Pantallas de listado
- Pipeline: crm-column, crm-lead-card, crm-ai-pill, crm-score, kanban arrows
- Chat: crm-chat-row, crm-bubble--in/out/ai, panel detalle lead (3 columnas), botón info mobile
- Calendar: vista semanal con franjas horarias 08-20, click para crear cita, navegación semana

### Fase 3 — Dashboard
- 4 stat cards principales
- Grid 2 cols: chart área (captación) + funnel pipeline (barras)
- Grid 3 cols: fuentes lead + actividad Setter IA + card ink "Próxima acción"
- Tabla leads perdidos

### Fase 4 — Setter IA, Módulos, Integraciones, Admin, Campañas
- Colores inline → CSS vars en todos los componentes
- ChatbotConfig: tabs con underline tide, DocCard con crm-doc-row
- EntrenarAgente: container con border y paper-2, aviso de espera 1 min
- Admin panel: 1 línea por cliente con desplegable
- Campañas: filtros responsive stacked

### Fase 5 — Modales y formularios
- LeadDetail: modal wide con kicker + grid 2 cols (timeline + datos contacto/negocio)
- NewLeadModal: crm-modal-backdrop + crm-modal
- CitaModal: crm-modal-backdrop + Google Meet en edición
- Nombres largos: word-break en vez de ellipsis

### Responsive completo
- Tablet ≤1024px: sidebar 200px, stats 2 cols, calendar 1 col, chat sin panel
- Mobile ≤768px: sidebar off-canvas, content padding reducido, modal fullscreen, kanban vertical, pipeline controles inline, calendar sidebar arriba
- Small ≤480px: stats 1 col, fonts reducidas

### Fixes durante el rediseño
- Training no guardaba docs (columna 'origen' inexistente)
- Notificaciones mezclaban tenants (localStorage sin tenant_id)
- Sidebar iluminaba padre e hijo a la vez (isActive mejorado)
- Training endpoints sin maxDuration (añadido 60s)
- Chat detail pane: inline display sobrescribía CSS responsive
- LeadDetail drawer → modal (backdrop/drawer estructura)
- Icono cerrar sesión: ⏻ → SVG logout
- Campana notificaciones: 24px con strokeWidth 2
- Calendar citas desbordaban celdas (overflow hidden, height fija)
- Próxima cita ordenada por fecha+hora
- Editar cita no pedía email Meet
- Type errors: ultimo_contacto y canal en tipos Lead
- PWA icon actualizado a Logo.png

## Archivos principales tocados
- `app/globals.css` — tokens, clases CRM, responsive completo
- `components/Sidebar.tsx` — rediseño con SVG icons + Logo.png
- `components/LeadDetail.tsx` — modal wide con grid 2 cols
- `components/LeadCard.tsx` — crm-lead-card
- `components/KanbanColumn.tsx` — crm-column
- `components/ScoreBadge.tsx` — crm-score con barra
- `components/NewLeadModal.tsx` — crm-modal
- `components/crm-icons.tsx` — Icon + I map SVG
- `app/(dashboard)/layout.tsx` — topbar kickers + bell SVG
- `app/(dashboard)/page.tsx` — dashboard rediseñado
- `app/(dashboard)/pipeline/page.tsx` — kanban arrows + controles responsive
- `src/CalendarioCitas.jsx` — vista semanal + franjas horarias
- `src/ChatView.jsx` — 3 paneles + info mobile
- `src/ChatbotConfig.jsx` — tabs + doc rows
- `src/EntrenarAgente.jsx` — container + aviso espera
- `src/ModulosConfig.jsx` — tokens
- Todas las páginas de auth y dashboard — colores actualizados
