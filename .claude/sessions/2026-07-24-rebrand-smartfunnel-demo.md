# 2026-07-24 · Rebrand SmartFunnel + mejoras UI en la demo

## Qué se hizo

Se portó a la demo (localStorage, sin backend) la nueva identidad **SmartFunnel** y las mejoras
de UI del CRM oficial, a partir de una copia de solo lectura en
`C:\Users\ekait\Developer\myt-crm-app-copia` (para no tocar los datos/repos reales).

### A — Rebrand visual
- `app/layout.tsx`: fuentes **Space Grotesk / JetBrains Mono** (`next/font/google`, sin deps nuevas),
  `title`/PWA "SmartFunnel", favicons (`favicon-32/64.png`, `smartfunnel-256/512.png`), `themeColor #0B0F14`.
  (Se omitió el `ServiceWorkerRegister`: la demo eliminó el SW a propósito.)
- `app/globals.css`: copiado íntegro desde SmartFunnel (era el mismo design system con branding viejo).
  Paleta `--tide #16D998`, `--ink #0B0F14`, `--tide-ink #0A8F66`, `--tide-tint`; todos los
  `rgba(20,200,164…)` → `22,217,152`; bloques nuevos `.period-nav`, `.dp` (date range), `.crm-modal__close`,
  `.crm-sidebar__symbol/__wordmark`.
- `components/Sidebar.tsx`: brand = símbolo de barras (CSS puro, 3 `<span>`) + wordmark "Smart·Funnel"
  (sin `useTier`, `<small>` fijo "CRM · M&T").
- `app/(dashboard)/layout.tsx`: renames M&T→SmartFunnel en `PAGE_TITLES`; hamburguesa `☰`→`I.menu`,
  candado `🔒`→`I.lock`; eliminada var muerta `icon` con emojis del dropdown de notificaciones.
- `public/`: assets `smartfunnel-*` + favicons copiados; `manifest.json` reescrito (name/colores/icons).

### B — Mejoras de UI (sin backend)
- `components/crm-icons.tsx`: reemplazado por el set completo de SmartFunnel (~68 iconos + `ColumnIcon`,
  `COLUMN_ICON_KEYS`, `EMOJI_TO_ICON`). Prerrequisito del resto. (UI-pura, copiado íntegro.)
- `components/DateRangeCalendar.tsx`: **nuevo** (copiado, UI-pura).
- `app/(dashboard)/page.tsx`, `LeadCard.tsx`, `LeadDetail.tsx`, `KanbanColumn.tsx`, `empresa/page.tsx`:
  copiados íntegros desde SmartFunnel (0 dependencias de backend; mismo cliente mock vía
  `@/lib/supabase/client`). Aportan: period-nav + rangos móviles + DateRangeCalendar en dashboard,
  StatCards con iconos, campo "Agente IA" (Auto/Ventas/Soporte) + UTM conjunto/anuncio en LeadDetail,
  emoji→iconos en todo.
- `app/(dashboard)/pipeline/page.tsx`: copiado y **quitado** el `fetch('/api/workflows/process')`
  (no existe en la demo). Aporta filtro por canal + `ColumnIcon`.
- `src/CalendarioCitas.tsx`: ediciones quirúrgicas (se mantuvo el tipo `DemoClient`): fix de cabecera
  **sticky/scroll** (la cabecera va dentro del contenedor con scroll) + iconos (`✕`→close, `⛶`→expand,
  `📅`→cal). No se portó el panel "Ajustes de citas" (vive en el page wrapper, usa tiers/ModulosConfig).
- `components/NewLeadModal.tsx`: ediciones quirúrgicas — empresa obligatoria ("o Particular"),
  `🌐`→`I.globe`, label contexto "(visible para el agente IA)". **No** se portó el bloque
  "Enviar WhatsApp" (storage + webhook).
- `lib/types.ts`: añadido `agente_modo?: 'ventas' | 'soporte' | null` al tipo `Lead` (lo pedía LeadDetail).

## Verificación
- `npm run build` ✅ (rutas `/`, `/pipeline`, `/calendar`, `/empresa`). Solo warnings de vars sin usar
  (heredadas de los archivos de SmartFunnel; inofensivas).

## Pendiente / no portado (necesita backend)
- Bloque C (módulos nuevos mockeables): Setter IA (`/agent`), Chat, Workflows (builder React Flow),
  Rendimiento (Meta Ads), Métricas Agente, Homepage marketing. No se tocaron.
- No viable sin backend: Integraciones (OAuth/QR), Entrenar Agente (IA), Admin Panel, Auth.
- Nota: los `fetch("/api/integrations/google/sync-cita")` de `CalendarioCitas.tsx` son preexistentes
  de la demo (fallan en silencio); se dejaron como estaban.

## Archivos clave tocados
`app/layout.tsx`, `app/globals.css`, `app/(dashboard)/{layout,page,pipeline/page,empresa/page}.tsx`,
`components/{Sidebar,crm-icons,DateRangeCalendar,LeadCard,LeadDetail,KanbanColumn,NewLeadModal}.tsx`,
`src/CalendarioCitas.tsx`, `lib/types.ts`, `public/manifest.json` + assets `public/**`.

---

# Parte 2 · Bloque C — módulos nuevos mockeados

Tras el rebrand, se añadieron 3 módulos que la demo no tenía, sin backend (mock localStorage /
datos estáticos). Portados desde la copia de SmartFunnel. Decisión del cliente: Chat y Rendimiento
funcionales (mock); Setter IA solo como zona informativa; landing y config de agente descartados.

### Chat (`/chat`) — bandeja funcional mock
- `app/(dashboard)/chat/page.tsx` (sin `TierGate`) + `src/ChatView.jsx` (copiado de SF, **eliminados**
  el useEffect de realtime `channel/subscribe` y el polling `setInterval`; el mock igualmente los stubbea).
- Nueva tabla `interacciones` en `lib/demo/store.ts` (interface + emptyDB + seed): ~24 mensajes en 5 hilos
  (WhatsApp + Instagram) para leads L(2)…L(6). Tipos: `whatsapp_recibido/respondido`, `instagram_*`,
  `follow_up_automatico`. La lista lateral solo muestra leads con ≥1 interacción.

### Rendimiento (`/rendimiento` + `/[tenant]`) — cockpit de agencia mock
- Copiados de SF: `page.tsx` (cockpit), `[tenant]/page.tsx` (drill-down), `period.tsx`, y los 2 CSS
  modules (`rendimiento.module.css`, `[tenant]/detalle.module.css` — todos los tokens existen en globals).
- **Nuevo** `app/(dashboard)/rendimiento/mock.ts`: tipos + `buildCockpit()/buildDetail(id)/buildAds(...)`.
  5 clientes ficticios (t1–t5) con KPIs coherentes y estados CAPI variados (ok/warn/off/unset).
- Quitados: los `fetch('/api/admin/rendimiento…')`, `CapiConfigModal` + su botón, `regenFlows`, `lib/meta`.
  Las 5 pestañas del drill-down quedaron completas (incl. Meta Ads con drill campaña→conjunto→anuncio).

### Agentes (`/agent`) — zona informativa (NO funcional)
- `app/(dashboard)/agent/page.tsx` reescrito de cero: página estática que explica los **dos agentes IA**
  diferenciados por color (Setter/Ventas en verde `--tide`, Soporte/Atención en azul `--info`), con franja
  de "recorrido del cliente" mostrando el relevo tras la venta, tarjetas con capacidades y entrada
  escalonada. CSS scoped en un `<style>` local (prefijo `agp-`), sin tocar globals. Renombrado de
  "Setter IA" → **Agentes** en Sidebar y PAGE_TITLES. Sin backend.

### Cableado compartido
- `components/Sidebar.tsx`: +Chat (OPERACIONES), +Setter IA (INTELIGENCIA), +Rendimiento (ANÁLISIS).
- `app/(dashboard)/layout.tsx`: `PAGE_TITLES` para `/agent` (informativo) y `/rendimiento`.
- `lib/demo/store.ts`: **`DEMO_STORAGE_KEY` subido `v1`→`v2`** para forzar re-seed (si no, visitantes con
  localStorage viejo no verían Chat).

### Verificación parte 2
- `npm run build` ✅ 10 rutas (incl. `/agent`, `/chat`, `/rendimiento`, `/rendimiento/[tenant]`).

### Corrección posterior — Rendimiento eliminado
- Se construyó Rendimiento pero luego se **eliminó** (ruta `app/(dashboard)/rendimiento/**`, entrada de
  sidebar "ANÁLISIS" y PAGE_TITLES): es una vista de **agencia/administrador** multi-cliente, y la demo
  solo debe mostrar lo que ve un **cliente (tenant)**. Regla anotada en CLAUDE.md y memoria.

### Zonas informativas añadidas (Recursos y Workflows)
- Igual que Agentes, se añadieron 2 páginas EXPLICATIVAS (sin funcionalidad, CSS scoped local, sin backend):
  - **Recursos** (`app/(dashboard)/recursos/page.tsx`): biblioteca de materiales (imágenes/vídeos/docs/enlaces)
    que el agente envía al lead; tipos, cómo funciona (3 pasos), ejemplos. Acento índigo.
  - **Workflows** (`app/(dashboard)/workflows/page.tsx`): automatizaciones; mini-diagrama de flujo estático,
    bloques (Esperar/Condición/Enviar mensaje/Follow-up IA/Actualizar/Recordatorio), disparadores y plantillas
    reales (extraídas de `lib/workflows/templates.ts` de SF). Acento verde de marca.
- Sidebar: Recursos en INTELIGENCIA, Workflows en nueva sección AUTOMATIZACIÓN. PAGE_TITLES añadidos.

### Pendiente (no hecho)
- Workflows real (builder React Flow con `@xyflow/react`) — solo se hizo la zona informativa.
- Métricas Agente, Homepage marketing: no portados. Integraciones/Admin/Auth/Entrenar: no viables sin backend.
