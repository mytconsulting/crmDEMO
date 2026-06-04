# Sesión 2026-04-12 — Fase 0 + Fase 0.5: Migración Completa

## Participantes
Eneko + Claude Code

## Resumen ejecutivo
En una sola sesión se completaron la Fase 0 (infraestructura) y la Fase 0.5 (migración de los 7 workflows de n8n a código). El CRM tiene ahora todo el backend en Next.js API Routes. El agente IA (WF2) funciona con Claude Sonnet 4.6 respondiendo por WhatsApp.

## Fase 0 — Completada
- Ramas git: main (producción/Vite), develop (Next.js), staging
- Next.js 15 con App Router, TypeScript, ESLint
- Todas las vistas migradas (Dashboard, Pipeline, Agent, Calendar, Chat, Modules, Admin)
- Supabase Branching + GitHub/Vercel Integration activados
- Sentry configurado + alertas Slack #developers
- AI SDK (Anthropic + OpenAI) instalado
- Types TypeScript base creados
- Vercel Pro activado ($20/mes)
- Deploy preview funcionando

## Fase 0.5 — Completada (7/7 workflows)

| WF | Endpoint | Tipo | Testeado |
|----|----------|------|----------|
| WF1 | `/api/webhooks/lead` | POST webhook | OK — crear, duplicar, validar |
| WF6 | `/api/webhooks/lead-manual` | POST webhook | OK — WhatsApp enviado |
| WF7 | `/api/ai/train` | POST webhook | OK — GPT-4o genera documentos |
| WF4 | `/api/cron/recordatorios` | Cron cada 1h | OK |
| WF5 | `/api/cron/followups` | Cron cada 2h | OK |
| WF8 | `/api/cron/auto-learn` | Cron diario 3AM | OK |
| WF2 | `/api/webhooks/whatsapp` | POST webhook | OK — Claude Sonnet responde por WhatsApp |

## Bugs encontrados y resueltos

### 1. Loop infinito de re-renders
- **Causa**: `createClient()` creaba nueva referencia cada render
- **Fix**: `useMemo(() => createClient(), [])`

### 2. Error de hooks order
- **Causa**: `usePathname()` después de returns condicionales
- **Fix**: mover todos los hooks antes de cualquier return

### 3. Error SSR prerender
- **Causa**: `getPermissionState()` accedía a `window` en server
- **Fix**: guard `typeof window === "undefined"`

### 4. Sonido de notificaciones
- **Causa**: AudioContext bloqueado fuera de gesto de usuario
- **Fix**: React Context + portal para llamar desde drag-and-drop

### 5. Fallo prerender en Vercel sin env vars
- **Causa**: `createBrowserClient` fallaba sin URL/key
- **Fix**: placeholder client cuando faltan variables

### 6. Framework preset Vercel
- **Causa**: Vercel configurado como Vite, buscaba carpeta `dist`
- **Fix**: cambiar Framework Preset a Next.js en Settings

### 7. Deployment Protection bloqueaba webhooks
- **Causa**: Vercel Authentication en previews bloqueaba /api/*
- **Fix**: desactivar Vercel Authentication para el proyecto

### 8. WF2 — waitUntil no ejecutaba background work
- **Causa**: waitUntil no procesaba en serverless
- **Fix**: procesamiento directo con maxDuration=60s

### 9. WF2 — MESSAGES_UPSERT case-sensitive
- **Causa**: Evolution API envía MESSAGES_UPSERT, código comparaba messages.upsert
- **Fix**: `.toLowerCase()` en la comparación

### 10. WF2 — fromMe desactivaba chatbot
- **Causa**: bot enviaba respuesta → webhook fromMe=true → chatbot desactivado
- **Fix**: ignorar fromMe sin desactivar chatbot

### 11. WF2 — Formato LID de WhatsApp (BUG PRINCIPAL)
- **Causa**: WhatsApp usa nuevo formato LID (`8993745420304@lid`), teléfono real en `remoteJidAlt`
- **Fix**: usar `remoteJidAlt` como fuente principal del teléfono

## Configuración realizada

### Vercel
- Plan Pro activado ($20/mes)
- Framework: Next.js
- Deployment Protection: desactivado
- Variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE, SENTRY_DSN (+ todas las de Supabase Integration)
- Crons: recordatorios (1h), followups (2h), auto-learn (3AM)

### Supabase
- Branching activado (GitHub + Vercel Integration)
- CLI instalado + proyecto vinculado
- Migración base del schema (1454 líneas)

### Sentry
- Error tracking + Session Replay + Tracing + Logs
- Alertas → Slack #developers
- Tunnel route /monitoring (anti-adblocker)

### Evolution API
- Webhook apunta a: `/api/webhooks/whatsapp` en Vercel preview
- Instancia: M&T Telefono Prueba
- Estado: open, conectado

## Pendiente para próxima sesión
- [ ] Restaurar debounce de 15s en WF2 (ahora procesa inmediatamente)
- [x] Quitar logs de debug del WF2 (hecho 2026-04-19, commit 7bfbaf9)
- [x] Limpiar endpoint /api/debug (ya eliminado previamente)
- [ ] Testear WF2 más a fondo (varios mensajes, audios, citas)
- [ ] Añadir SENTRY_AUTH_TOKEN en Vercel para source maps
- [ ] Limpiar leads de test en la BD
- [ ] Pulir tono del agente IA (más humano, menos formal)
- [ ] Entrenar agente con los 8 escenarios completos
- [ ] Planificar switchover landing Itzalki al nuevo endpoint
- [ ] Considerar migrar Evolution API webhook de vuelta a n8n hasta switchover completo

## Decisiones tomadas
- Sin envío de emails (solo WhatsApp e Instagram)
- waitUntil descartado para debounce, procesamiento directo con maxDuration=60s
- Claude Sonnet 4.6 como modelo principal, GPT-4o como fallback automático
- fromMe no desactiva chatbot (solo se controla desde el CRM)
