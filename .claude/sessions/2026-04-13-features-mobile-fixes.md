# Sesión 2026-04-13 (parte 2) — Features nuevas + adaptación móvil

## Resumen

Segunda parte de la sesión del 13 de abril. Implementación de 4 features nuevas, limpieza de código, y adaptación completa para móvil.

## Features implementadas

### 1. Etiquetas personalizadas por lead
- Tablas: `etiquetas` + `lead_etiquetas` con RLS multi-tenant
- UI en LeadDetail: crear etiquetas con nombre + 8 colores, asignar/eliminar
- Visibles en LeadCard (kanban, max 3 + "+N") y vista lista
- Bug fix: faltaba `tenant_id` al crear etiqueta

### 2. Valor del trato (€)
- Campo `valor_negociacion` en leads (numeric EUR)
- Editable en LeadDetail, visible en LeadCard
- Suma total por columna en header del kanban
- Dashboard: 4 nuevas stat cards (Valor Pipeline, Revenue Cerrado, Ticket Medio, Win Rate)

### 3. Auto-pause chatbot
- Cuando el dueño escribe manualmente por WhatsApp → chatbot se pausa
- Tabla `bot_sent_messages` para distinguir bot vs humano (ambos fromMe=true)
- `sendText()` ahora devuelve JSON parseado (message ID)
- Interacción `chatbot_pausado` registrada

### 4. Pipeline dinámico
- Tabla `pipeline_estados` con RLS multi-tenant
- 7 columnas por defecto (incluyendo "perdido") seeded para todos los tenants
- Hook `usePipelineColumns`: carga, crear, editar (doble-click), eliminar
- Botón "+ Columna" con selector color + icono
- Al eliminar columna con leads → se mueven a columna adyacente
- Bug fix: faltaba userId fresco al crear columna

### 5. Lead scoring dinámico
- `lib/pipeline-scoring.ts` — rangos proporcionales al número de columnas
- Agente IA recibe rangos exactos en su prompt
- Drag-and-drop actualiza score al punto medio del rango de la nueva columna
- `scoreToEstado()` acepta columnas dinámicas

### 6. Limpieza y seguridad
- Rate limiting por IP en webhooks (lead: 30/min, lead-manual: 20/min, whatsapp: 60/min)
- Eliminado `vite.config.js`, URL n8n reemplazada en App.jsx
- Docs actualizados: `architecture.md`, `integrations.md`, `fixes.md`, `decisions.md`
- Fix audio WhatsApp: parámetro incorrecto en `getBase64FromMedia`

### 7. Adaptación móvil
- Pipeline: barra búsqueda a ancho completo
- Notificaciones: dropdown posición fixed, ancho completo en móvil
- LeadDetail: 3 pestañas (Info, Agente IA, Notas) — chatbot y resumen en pestaña propia
- Chat: estilo WhatsApp (lista → chat → botón volver), scroll sin auto-bajada
- Chat header: layout limpio sin aplastamiento
- Agente IA: editor full width, menos padding, fuente más grande
- Módulos: SettingRow con flex-wrap

## Migraciones aplicadas
1. `20260413170000_add_etiquetas.sql`
2. `20260413171000_add_valor_negociacion.sql`
3. `20260413172000_add_bot_sent_messages.sql`
4. `20260413180000_add_pipeline_estados.sql`

## Archivos clave tocados
- `lib/types.ts` — Tag interface, valor_negociacion, etiquetas en Lead
- `lib/pipeline-scoring.ts` — NUEVO, scoring dinámico
- `lib/rate-limit.ts` — NUEVO, rate limiter
- `lib/hooks/usePipelineColumns.ts` — NUEVO, hook columnas dinámicas
- `lib/evolution.ts` — sendText devuelve JSON
- `lib/chatbot/build-prompt.ts` — rangos dinámicos en prompt
- `lib/chatbot/parse-response.ts` — scoreToEstado con columnas
- `components/LeadDetail.tsx` — 3 pestañas, etiquetas, valor
- `components/LeadCard.tsx` — tags + valor visible
- `components/KanbanColumn.tsx` — suma valor + editar/eliminar columna
- `app/(dashboard)/pipeline/page.tsx` — columnas dinámicas + scoring
- `app/(dashboard)/page.tsx` — dashboard métricas dinero
- `app/api/webhooks/whatsapp/route.ts` — auto-pause + bot message tracking
- `src/ChatView.jsx` — móvil tipo WhatsApp + scroll inteligente
- `src/App.css` — responsive móvil completo

## Incidentes
- Vercel Pro: 76% créditos consumidos por demasiados builds ($16.76 en Build Minutes)
- Solución: agrupar pushes, probar en localhost

## Pendiente para siguiente sesión
- Configurar WhatsApp de Carlos (instancia Evolution "Itzalki WhatsApp")
- Carlos se registra y configura su CRM
- UTM tracking (Fase 1 restante)
- Verificar Cron Jobs de Vercel
