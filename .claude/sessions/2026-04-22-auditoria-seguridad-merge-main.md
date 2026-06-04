# Sesión 2026-04-22 — Auditoría de seguridad + merge a main

## Qué se hizo

### Fix agente IA — citas obsoletas
- El agente decía la hora vieja tras cambiar cita en calendario
- Causa: historial de conversación pesaba más que datos BD en el prompt
- Fix: bloque `[⚠️ DATOS ACTUALIZADOS DE CITAS]` inyectado en chatInput + refuerzo en system prompt

### Revisión completa del proyecto
- Build + lint: 0 errores
- 3 agentes en paralelo revisaron: API routes, frontend, chatbot/IA

### Auditoría de seguridad (4 análisis en paralelo)
- Auth/RLS/middleware
- APIs/webhooks/inyección
- Secrets/env vars/dependencias
- Data exposure/IDOR/lógica de negocio

### 20+ vulnerabilidades corregidas

**Críticos:**
- CRON_SECRET obligatorio (4 crons)
- Race condition citas (unique partial index + validación hora + catch 23505)
- Promise.allSettled en auto-learn
- Auth + tenant ownership en training routes
- campaigns-data: filtro tenant en profiles e interacciones
- admin/metrics: isSuperAdmin corregido
- bot_sent_messages: RLS habilitado

**Altos:**
- campanas RLS: is_super_admin() reemplaza is_admin()
- Prompt injection: sanitizeUserInput() + instrucción anti-manipulación
- SSRF: validación media URLs
- CORS configurable via env var
- Sentry: sendDefaultPii=false, traces 10% producción
- interacciones: eliminada policy anon_insert
- scoring_reglas: eliminado bypass NULL cliente_id
- Storage: tenant isolation en welcome-media

**Medios:**
- Bare catches con logging
- Fallback IA (GPT-4o) registrado en metadata
- Token limit en prompts (truncado historial)
- auto_learn_ejecuciones: restringido a service_role
- Teléfonos eliminados de logs

### Merge develop → main
- 30 commits, 55 archivos, +5686/-1445 líneas
- Sin conflictos
- Vercel auto-deploy a producción

## Qué quedó pendiente
- C4: verificación firma webhooks (requiere config Evolution API)
- Instalar `gh` CLI y autenticarse para crear PRs desde terminal

## Archivos clave tocados
- `lib/chatbot/build-prompt.ts` — sanitización + citas actualizadas + token limit
- `app/api/webhooks/whatsapp/route.ts` — race condition, validación hora, fallback logging
- `app/api/admin/campaigns-data/route.ts` — tenant isolation
- `app/api/admin/metrics/route.ts` — isSuperAdmin fix
- `app/api/ai/train/route.ts` + `generate-scenarios/route.ts` — auth
- `app/api/cron/*` — CRON_SECRET, allSettled
- `sentry.*.config.ts` + `instrumentation-client.ts` — PII + sampling
- 3 migraciones SQL de seguridad
