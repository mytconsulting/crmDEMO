# Integraciones externas

## Supabase

- **Proyecto producción**: conectado via `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Admin client**: `SUPABASE_SERVICE_ROLE_KEY` en API Routes (bypass RLS)
- **Cliente Next.js**: `lib/supabase/client.ts` (browser) y `lib/supabase/server.ts` (server/admin)
- **RLS**: activo en todas las tablas, filtro por `tenant_id = auth.uid()`
- **Edge Functions**: `supabase/functions/push-notification/` para notificaciones push
- **Triggers**: `on_auth_user_created` → `handle_new_user()` (SECURITY DEFINER)
- **Storage**: bucket `welcome-media` (público) para archivos adjuntos de bienvenida. Sin política de listado: acceso solo por URL pública (`getPublicUrl`), no por `.list()`.
- **Migraciones**: via Supabase CLI (`supabase migration new`, `supabase db push`)
- **Compute size**: ⚠️ **PENDIENTE** subir de **Nano → Micro** (mismo precio en plan Pro, +RAM/CPU). Cambio en Dashboard → Project Settings → Compute and Disk. Reinicio ~1-2 min, hacerlo en ventana de bajo tráfico. Ver `decisions.md` 2026-06-03.
- **Seguridad (Security Advisor)**: vistas con `security_invoker = on`; funciones con `search_path` fijado; `is_admin()`/`is_super_admin()` se dejan ejecutables a propósito (las usa el RLS). Ver `fixes.md` 2026-06-03.

## Evolution API (WhatsApp) — Multi-tenant

- **URL**: `https://n8n-evolution-api.eh3kh7.easypanel.host`
- **API Key**: env var `EVOLUTION_API_KEY` (fallback compartido). Valor actual: `429683C4C977415CAAFCCE10F7D57E11`
- **Instancia por tenant**: campo `evolution_instance` en `configuracion_modulos`
- **Instancia M&T**: "M&T Telefono Prueba"
- **Instancia Itzalki Toldoak**: "Carlos Itzalki Toldoak" (tel: 34646901390)
- **Aislamiento**: `lib/evolution.ts` — cada función recibe `EvolutionConfig` del tenant
- **Webhook entrante**: Evolution API envía a `/api/webhooks/whatsapp` con campo `instance` en body
- **Resolución tenant**: `resolveTenantByInstance()` busca en `configuracion_modulos` por nombre de instancia
- **API URL/Key por tenant**: existen en BD pero NO editables desde UI (se gestionan por env vars compartidas)
- **Futuro**: migrar a Meta WhatsApp Business API oficial (Roadmap Fase 5)

## IA — Modelos (Vercel AI SDK)

### Claude Sonnet 4.6 (Anthropic) — PRINCIPAL
- **Uso**: agente setter IA (conversaciones WhatsApp/Instagram)
- **Model ID**: `claude-sonnet-4-6`
- **Por qué**: mejor tono natural/humano en español, sigue instrucciones de estilo
- **Coste aprox**: $0.02-0.05 por conversación completa

### GPT-4o (OpenAI) — FALLBACK
- **Uso**: fallback si Anthropic cae, análisis de conversaciones (auto-learn, follow-ups)

### Claude Haiku 4.5 (Anthropic) — TAREAS LIGERAS
- **Uso**: scoring de leads, clasificación de intención, tareas simples
- **Por qué**: rápido y barato para tareas que no necesitan calidad conversacional

### Estrategia multi-modelo
- Vercel AI SDK permite cambiar de proveedor con una línea de código
- try/catch en WF2: intenta Claude Sonnet, cae a GPT-4o si falla

## Google Calendar — Multi-tenant (Fases 0-4 completadas)

- **Plan completo**: `docs/PLAN-GOOGLE-CALENDAR-INTEGRATION.md` (7 fases)
- **Estado**: Fases 0, 1, 2, 3 y 4 implementadas (OAuth + sync bidireccional)
- **Proyecto GCP**: `mt-crm-calendar`
- **OAuth**: Authorization Code flow, scopes `calendar.events` + `userinfo.email`
- **Tabla BD**: `google_calendar_connections` (tenant_id, google_email, refresh_token_encrypted, sync_enabled, sync_token, etc.)
- **Columnas en `citas`**: `google_event_id`, `google_etag`, `sync_source` ('crm' | 'agent' | 'google')
- **Cifrado**: refresh_token cifrado con AES-256-GCM (lib/crypto.ts), clave en `ENCRYPTION_KEY`
- **Env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI_BASE`, `ENCRYPTION_KEY`, `GOOGLE_WEBHOOK_TOKEN`, `CRON_SECRET`

### Rutas OAuth
- `/api/integrations/google` — inicio OAuth, redirige a Google
- `/api/integrations/google/callback` — callback, guarda tokens + dispara initial sync
- `/api/integrations/google/disconnect` — revoca token + borra conexión

### Sync saliente (CRM/Agente → Google Calendar)
- **Helper**: `lib/google-calendar/sync.ts` → `syncCitaToGoogle(citaId, action, source)`
- **Initial sync**: `lib/google-calendar/initial-sync.ts` → al conectar, sube citas futuras sin `google_event_id`
- **Endpoint frontend**: `/api/integrations/google/sync-cita` (POST, requiere sesión)
- **Shadow mode**: si `sync_enabled = false` o no hay conexión, el sync se salta silenciosamente
- **Si Google falla**: la cita se guarda en Supabase igual, error se loguea en `last_error`
- **Token revocado**: marca `sync_enabled = false` automáticamente

### Puntos de integración sync saliente
| Archivo | Operación | Source |
|---------|-----------|--------|
| `webhooks/whatsapp/route.ts` | crear, cancelar | agent |
| `webhooks/instagram/route.ts` | crear, cancelar | agent |
| `src/CalendarioCitas.tsx` | crear, editar, borrar | crm |

### Sync entrante (Google Calendar → CRM)
- **Cron**: `/api/cron/sync-google-calendar` cada 15 min (vercel.json)
- **Helper**: `lib/google-calendar/sync-incoming.ts`
- **Mecanismo**: polling con `syncToken` incremental (no watch channels)
- **Anti-loop**: compara `google_etag` — si coincide con el guardado, es eco y se ignora
- **Eventos recurrentes**: se ignoran (logueados)
- **Eventos cancelados**: marcan cita como `estado: 'cancelada'`
- **Timezone**: horas parseadas directamente del string ISO (no convertidas a UTC)
- **Detección Calendly**: si summary/description contiene "calendly", marca `origen: 'calendly'`

### UI
- `/integrations` con tarjeta Google Calendar + tarjeta Landing Pages
- Landing Pages: auto-detectadas, toggle activa/pausada, breakdown por subpáginas
- Sidebar: item "Integraciones"

### Dashboard Admin (Fase 6)
- **Página**: `/admin/google-calendar` (solo super-admin, role === 'admin')
- **API**: `/api/admin/calendar-health` (service_role, bypasa RLS para queries cross-tenant)
- **Sidebar**: item "Calendar Health" en sección ADMINISTRACIÓN
- **Stats**: conexiones totales, sincronizando, con errores, tokens revocados
- **Métricas citas**: total sincronizadas, desglose por fuente (CRM, agente, Google)
- **Tabla tenants**: estado (healthy/warning/error/disconnected), última sync, watch expiration, errores
- **Status logic**: error si last_error en <24h, warning si watch expirando <48h o sin sync >6h, disconnected si sync_enabled=false

### Pendiente
- Fase 5: verificación Google (consent screen → producción)
- Fase 6 restante: alertas Slack, SOP activación, plantillas comunicación clientes
- Fase 7 restante: selector calendario, e2e tests, exponential backoff
- Tests del sync

## Landing Pages — Auto-detección

- **Tabla BD**: `landing_pages` (id, tenant_id, nombre, url, activa, created_at)
- **Auto-registro**: el webhook `/api/webhooks/lead` auto-registra la landing cuando recibe `landing_page` en el body
- **Payload del form**: `landing_page = window.location.origin`, `landing_path = window.location.pathname`
- **Campo en leads**: `landing_page` (dominio), `landing_path` (ruta dentro del dominio)
- **Fallback**: si no llega `landing_page` pero el tenant tiene 1 sola landing, se asigna automáticamente
- **Pausar**: si la landing está marcada como inactiva, el webhook rechaza el lead (403)
- **UI**: en `/integrations`, tarjeta con lista de landing pages + breakdown de paths + toggle
- **Landing activa**: `https://landing-mt.vercel.app` → M&T Consulting (mytconsulting.es)
## Vercel

- **Proyecto**: `myt-crm-app`
- **Repo**: `github.com/mytconsulting/myt-crm-app`
- **Branch producción**: `main` → auto-deploy
- **Branch desarrollo**: `develop` → preview URL
- **Cron Jobs**: configurados en `vercel.json` (recordatorios, followups, auto-learn)
- **Variables de entorno**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `CRON_SECRET`
- **Sentry**: configurado para error tracking

## n8n (LEGACY — desactivado)

- **URL**: `https://n8n-n8n.eh3kh7.easypanel.host`
- **Estado**: todos los workflows desactivados, mantenido solo como backup
- **Todos los WF migrados a API Routes** (WF1, WF2, WF4, WF5, WF6, WF7, WF8)

## Instagram Messaging API — Multi-tenant (ACTIVO)

- **API**: Meta Graph API v21.0 (`https://graph.instagram.com/v21.0`)
- **Lib**: `lib/instagram.ts` — `getInstagramConfig()`, `resolveTenantByPageId()`, `sendInstagramDM()`
- **Webhook entrante**: `/api/webhooks/instagram` (GET para challenge, POST para mensajes)
- **OAuth**: Botón "Conectar Instagram" en ModulosConfig → Facebook Login → callback guarda tokens automáticamente
- **Rutas OAuth**: `/api/auth/instagram` (inicio), `/api/auth/instagram/callback` (callback), `/api/auth/instagram/disconnect` (desconectar)
- **Env vars globales**: `META_APP_ID`, `META_APP_SECRET` (de nuestra app de Meta, no por tenant)
- **Config por tenant** (auto-rellenada por OAuth): `instagram_page_id`, `instagram_access_token`, `instagram_webhook_verify_token` en `configuracion_modulos`
- **Resolución tenant**: `resolveTenantByPageId()` busca por `instagram_page_id` en BD
- **Lead lookup**: por `instagram_user_id` en `leads` (auto-crea lead si no existe)
- **Messaging dispatcher**: `lib/messaging.ts` — `sendMessage()` resuelve canal (WA/IG) y despacha automáticamente
- **Permisos Meta necesarios**: `instagram_manage_messages`, `pages_messaging`
- **App Review**: necesario para producción con cuentas no-tester

## Meta (futuro, Roadmap Fases 3.5, 5)

- **Marketing API**: para leer métricas de campañas (impresiones, clics, gasto, CPL)
- **WhatsApp Business API**: reemplazo de Evolution API (Embedded Signup)
- **Permisos adicionales**: `whatsapp_business_management`

## Calendly (pendiente de implementación)

- **Plan requerido**: Standard ($10/mes/user). Webhooks v2 NO están en Free.
- **Uso**: landing `LP-m-tconsulting-001` embebe widget inline tras el form. Al confirmar la reserva, Calendly envía webhook al CRM para mover fase del lead `nuevo → reunion`, crear row en `citas` y guardar las respuestas a preguntas custom (tipo de centro, nº socios, reto principal) en `leads.campos_extra.calendly_qa`.
- **Endpoint (a crear)**: `POST /api/webhooks/calendly`
- **Spec técnico completo**: [`specs/calendly-webhook.md`](../../specs/calendly-webhook.md) — incluye migraciones SQL, verificación HMAC, handlers `invitee.created` / `invitee.canceled`, resolución multi-tenant via nueva columna `tenants.calendly_user_uri`, y checklist de implementación.
- **Variables de entorno (a añadir)**: `CALENDLY_WEBHOOK_SIGNING_KEY`, `CALENDLY_PAT` (opcional).
- **Side del landing (ya implementado)**: pixel `Schedule` de Meta se dispara vía `postMessage` del widget al evento `calendly.event_scheduled`. Ver `src/components/BookingSection.jsx` en `LP-m-tconsulting-001`.
