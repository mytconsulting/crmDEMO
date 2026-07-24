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
