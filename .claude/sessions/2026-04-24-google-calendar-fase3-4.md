# Sesión 2026-04-24 — Google Calendar Fases 3 y 4 (sync bidireccional)

## Continuación de sesión anterior (Fases 0, 1, 2)

## Qué se hizo

### Fix CRON_SECRET vacío (todos los crons afectados)
- `CRON_SECRET` estaba vacío en Vercel → todos los crons devolvían 401
- Generado token seguro, configurado en production + preview develop + development
- Nota: usar `printf` no `echo` al pipar a `vercel env add` (evita trailing newline)

### Fase 4 — Sync entrante (Google → Supabase) — ya estaba del commit anterior
- `app/api/cron/sync-google-calendar/route.ts` — cron cada 15 min
- `lib/google-calendar/sync-incoming.ts` — polling con syncToken incremental
- `vercel.json` — schedule `*/15 * * * *`
- Migración: columnas `sync_token` en connections, `origen` en citas
- Anti-loop: compara etag para ignorar ecos

### Fix timezone sync entrante
- Bug: horas se guardaban en UTC (-2h en verano España)
- Causa: `new Date().toISOString()` convertía a UTC
- Fix: parsear hora local directamente del string ISO con regex
- Borrar 4 citas incorrectas + reset sync_token + re-ejecutar cron

### Fase 3 — Sync saliente (Supabase → Google Calendar) — NUEVO
- `lib/google-calendar/sync.ts` — helper `syncCitaToGoogle(citaId, action, source)`
  - Maneja create/update/delete
  - Shadow mode si sync_enabled=false o sin conexión
  - Token revocado → marca sync_enabled=false
  - Nunca lanza excepciones al caller
  - Timezone: envía `Europe/Madrid` a Google Calendar API
- `lib/google-calendar/initial-sync.ts` — `runInitialSync(tenantId)`
  - Ejecutado al conectar Google (callback OAuth)
  - Sube citas futuras sin google_event_id
  - Rate limit: 5/sec
- `app/api/integrations/google/sync-cita/route.ts` — endpoint para CalendarioCitas (client-side)

### Integración en puntos de mutación de citas
- `webhooks/whatsapp/route.ts` — crear cita + cancelar específica + cancelar todas (fire-and-forget)
- `webhooks/instagram/route.ts` — idem
- `src/CalendarioCitas.jsx` — crear + editar + borrar (via fetch al endpoint)
- `callback/route.ts` — dispara runInitialSync al conectar

### Documentación actualizada
- `.claude/docs/decisions.md` — 3 decisiones nuevas (polling vs webhooks, timezone, endpoint frontend)
- `.claude/docs/integrations.md` — sección Google Calendar reescrita con estado completo
- `.claude/docs/fixes.md` — 3 bugs documentados (timezone, CRON_SECRET, deploy)

## Deploy
- Preview: `npx vercel --yes` (necesario porque auto-deploy de Vercel no tomaba último commit)
- Build limpio, sin errores

## Archivos nuevos
- `lib/google-calendar/sync.ts`
- `lib/google-calendar/initial-sync.ts`
- `app/api/integrations/google/sync-cita/route.ts`

## Archivos editados
- `lib/google-calendar/sync-incoming.ts` (fix timezone)
- `app/api/webhooks/whatsapp/route.ts` (3 hooks sync)
- `app/api/webhooks/instagram/route.ts` (3 hooks sync)
- `src/CalendarioCitas.jsx` (3 hooks sync)
- `app/api/integrations/google/callback/route.ts` (initial sync)
- `.claude/docs/decisions.md`
- `.claude/docs/integrations.md`
- `.claude/docs/fixes.md`

### Fixes durante testing
- `leads.nome` no existe → query sync fallaba silenciosamente
- Race condition delete: await sync antes de borrar cita de Supabase
- Summary usaba solo notas → ahora prioriza servicio → notas → lead → "Cita CRM"
- endDateTime calculado en UTC → ahora suma minutos al string directamente
- syncToken nunca se guardaba (singleEvents=true impide que Google lo devuelva)
- showDeleted=true necesario para detectar cancelaciones
- RLS bloqueaba toggles desde browser → nuevo endpoint /api/integrations/google/settings

### Google Meet
- Toggle global en /integrations (columna crear_meet en google_calendar_connections)
- Checkbox "Crear con Google Meet" en formulario nueva cita
- Campo email obligatorio cuando Meet activado (auto-rellena desde lead)
- Google envía invitación por email con link de Meet (sendUpdates=all)
- Meet link se guarda en gcal_meet_link de la cita
- Quitado Google Calendar y Meet de ModulosConfig (movido a /integrations)

### UI /integrations mejorada
- Pill: Sincronizando (verde) / Pausada (amarillo) / Desconectado (rojo)
- Botón pausar/reanudar sincronización
- Banner rojo con reconectar si token revocado
- Errores genéricos en banner amarillo
- Última sincronización en formato relativo
- Toggle Google Meet con descripción

### CalendarioCitas UX
- Título de citas: servicio → notas → nombre lead → "Sin lead"
- Checkbox Google Meet con campo email obligatorio

## Qué queda pendiente
- Tests del sync (helper + incoming + cron)
- Fase 5: verificación Google (consent screen → producción)
- Fase 6: rollout canary
- Fase 7: hardening (CalendarioCitas → TSX, selector calendario, e2e)
