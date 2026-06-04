# Plan — Integración Google Calendar multi-tenant

**Proyecto**: M&T CRM (`myt-crm-app`)
**Versión**: 2 (2026-04-23) · reemplaza versión 1
**Ubicación propuesta en repo**: `docs/PLAN-GOOGLE-CALENDAR-INTEGRATION.md`
**Uso con Claude Code**: cada fase es autocontenida. Copia el prompt de la fase que toque a Claude Code; no hace falta que lea las fases siguientes.

---

## Índice

1. [Principios de seguridad](#1-principios-de-seguridad)
2. [Decisiones de producto cerradas](#2-decisiones-de-producto-cerradas)
3. [Mapa de fases](#3-mapa-de-fases)
4. [Stack técnico y env vars](#4-stack-técnico-y-env-vars)
5. [Fase 0 — Setup Google Cloud](#5-fase-0--setup-google-cloud)
6. [Fase 1 — Esqueleto](#6-fase-1--esqueleto)
7. [Fase 2 — OAuth flow](#7-fase-2--oauth-flow)
8. [Fase 3 — Sync saliente + sync inicial](#8-fase-3--sync-saliente--sync-inicial)
9. [Fase 4 — Sync entrante](#9-fase-4--sync-entrante)
10. [Fase 5 — Verificación Google](#10-fase-5--verificación-google)
11. [Fase 6 — Rollout canary → producción](#11-fase-6--rollout-canary--producción)
12. [Fase 7 — Hardening](#12-fase-7--hardening)
13. [Checklist maestro](#13-checklist-maestro)
14. [Rollback de emergencia](#14-rollback-de-emergencia)

---

## 1. Principios de seguridad

Estos cuatro principios mandan sobre cualquier decisión táctica durante las fases. Si aparece un conflicto, ganan ellos.

1. **Additive-only en el schema.** Columnas nuevas siempre nullable con default seguro. Nada de renames, nada de drops, nada de `NOT NULL` sin backfill previo. Si la integración se desenchufa entera, lo que funciona hoy sigue funcionando mañana.
2. **Feature flag por tenant, default OFF.** Concretamente: `google_calendar_connections.sync_enabled`. Ningún cliente existente nota el menor cambio hasta que explícitamente conecte su Google. Itzalki y AQTIVA no se enteran de nada hasta que tú quieras.
3. **Shadow mode en Fase 3.** El sync saliente a Google nunca puede romper la creación/modificación de una cita en Supabase. Si la llamada a Google falla, se loguea y se sigue. Google es siempre "nice-to-have".
4. **Canary progresivo.** M&T (tu propio tenant) es el primer activado. 48h de observación sin errores en Sentry antes de activar Itzalki. Otros clientes solo después de Itzalki estable.

---

## 2. Decisiones de producto cerradas

### 2.1 Conectar equivale a activar el sync

Cuando un cliente pulsa "Conectar con Google" y autoriza en la pantalla de Google, el sync queda activo inmediatamente. No hay un toggle intermedio tipo "conectado pero pausado". El botón de pausar existe pero es secundario, para el caso de querer parar sin desconectar.

Justificación: el cliente ya ha dado consentimiento explícito en la pantalla de Google; exigirle un segundo clic para empezar a usar la integración es fricción innecesaria.

**Excepción interna del equipo**: durante el desarrollo de Fase 2 (antes de que exista el helper de sync), `sync_enabled` queda en `false` en el callback. A partir del merge de Fase 3, el callback lo deja en `true` y dispara el sync inicial.

### 2.2 Ruta dedicada `/integrations`

La integración vive en una ruta nueva `/integrations`, no dentro de `/modules`.

Justificación: Módulos son flags internos de funcionalidades (citas activas, chatbot activo, recordatorios). Integraciones son conexiones a servicios externos con OAuth y credenciales — categoría distinta. Además deja sitio para futuras integraciones (Meta Business API, Stripe, etc.) sin mezclar conceptos.

### 2.3 Sync inicial al conectar

Cuando un tenant conecta su Google Calendar, además de registrar la conexión, se hace un sync retroactivo de TODAS las citas activas desde el día de hoy hacia adelante (no las pasadas). Se ejecuta en background fire-and-forget, no bloquea el callback.

Justificación: sin esto, el cliente conecta y ve su Google Calendar vacío. La percepción es "está roto". Con sync inicial, al abrir Google Calendar ve sus próximas citas ya reflejadas.

### 2.4 Timing de la verificación Google (aclaración importante)

Fase 0 se hace HOY. Es crear el proyecto en Google Cloud Console y configurar las credenciales OAuth. Sin esto, las Fases 1-4 no pueden avanzar.

El proyecto arranca y permanece en modo **Testing** durante todo el desarrollo (Fases 1-4) y puede usarse con clientes piloto añadidos como test users (tú, Eneko, Itzalki).

La Fase 5 (enviar la app a verificación Google) sucede DESPUÉS de que todo esté desarrollado y probado. Mientras Google revisa (1-3 semanas típicas), sigues operando en Testing con los pilotos.

Solo cuando Google aprueba la verificación se puede hacer el rollout abierto a cualquier cliente sin restricciones (Fase 6).

### 2.5 Solo calendario primario

Esta primera versión solo sincroniza el calendario `primary` de cada cuenta Google. No se ofrece selección de calendario secundario. Si un cliente lo pide, es Fase 7+.

### 2.6 No se soportan eventos recurrentes

Si llega un evento recurrente desde Google, se ignora y se loguea. El CRM no crea citas recurrentes, así que esto solo aplica a la dirección entrante.

---

## 3. Mapa de fases

| Fase | Qué hace | Ejecuta | Cuándo |
|------|----------|---------|--------|
| **0** | Setup Google Cloud + env vars | Tú manual, en la consola | **Hoy, primero** |
| **1** | Migración Supabase + tabla + UI muda | Claude Code | Después de Fase 0 |
| **2** | OAuth flow real + UI funcional | Claude Code | Después de Fase 1 mergeada |
| **3** | Sync saliente shadow + sync inicial | Claude Code | Después de Fase 2 mergeada |
| **4** | Sync entrante + watch channels + cron | Claude Code | Después de Fase 3 estable 48h |
| **5** | Enviar a verificación Google | Tú prepara contenidos, yo ayudo con textos | Después de Fase 4 estable |
| **6** | Rollout canary → Itzalki → resto | Tú decides, yo ayudo con SOP | Después de verificación aprobada |
| **7** | Hardening: migrar CalendarioCitas, e2e, etc | Claude Code | Último |

**Puntos de control (gates)**: después de cada fase, antes de arrancar la siguiente, hay que verificar los criterios de aceptación y dejar 24h de observación en Sentry. Nada de encadenar fases de tirón.

---

## 4. Stack técnico y env vars

**Stack**: OAuth 2.0 Authorization Code flow + Google Calendar API v3 + push notifications con watch channels + cifrado AES-256-GCM del refresh_token en capa de aplicación.

**Env vars que habrá que añadir a Vercel** (en los 3 environments: development, preview, production):

| Nombre | Fase | Cómo se genera |
|--------|------|----------------|
| `GOOGLE_CLIENT_ID` | 0 | Google Cloud Console → OAuth 2.0 Client IDs |
| `GOOGLE_CLIENT_SECRET` | 0 | Google Cloud Console → OAuth 2.0 Client IDs |
| `GOOGLE_REDIRECT_URI_BASE` | 0 | Base del dominio sin ruta (ej. `https://crm.mytconsulting.es`) |
| `ENCRYPTION_KEY` | 2 | `openssl rand -hex 32` (32 bytes hex) |
| `GOOGLE_WEBHOOK_TOKEN` | 4 | `openssl rand -hex 24` (secret para verificar webhooks) |

Guarda TODAS también en tu gestor de contraseñas. Si Vercel se corrompe, sin la `ENCRYPTION_KEY` los refresh_tokens cifrados en BD son irrecuperables.

---

## 5. Fase 0 — Setup Google Cloud

**Quién**: tú, manual en la consola web.
**Tiempo estimado**: 30-45 minutos.
**Output**: proyecto GCP creado, credenciales OAuth en tus manos, env vars en Vercel.

### Pasos

1. **Crear proyecto GCP**: [console.cloud.google.com](https://console.cloud.google.com) → selector de proyectos → "Nuevo proyecto" → nombre `mt-crm-calendar-integration` (o el que prefieras).

2. **Habilitar Google Calendar API**: en el proyecto recién creado, APIs & Services → Library → buscar "Google Calendar API" → Enable.

3. **Configurar OAuth consent screen**:
   - User Type: **External**.
   - App name: `M&T CRM`.
   - User support email: el tuyo.
   - Developer contact: el tuyo.
   - App logo: opcional en testing, obligatorio en verificación (Fase 5). Súbelo si lo tienes a mano, si no lo dejas para Fase 5.
   - Authorized domains: tu dominio de producción (ej. `mytconsulting.es`).
   - Scopes: añadir `.../auth/calendar.events` y `.../auth/userinfo.email`.
   - Test users: añade tu email y el de Eneko. Después podrás añadir hasta 100 más.

4. **Crear credenciales OAuth 2.0 Client ID**:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID.
   - Tipo: **Web application**.
   - Authorized redirect URIs (las tres de una vez):
     - `http://localhost:3000/api/integrations/google/callback`
     - `https://myt-crm-app-develop.vercel.app/api/integrations/google/callback` (ajusta a la URL real de tu preview branch)
     - `https://[DOMINIO-PROD]/api/integrations/google/callback`
   - Guardar Client ID y Client Secret en el gestor de contraseñas.

5. **Generar `ENCRYPTION_KEY`** en local:
   ```bash
   openssl rand -hex 32
   ```
   Guárdala en el gestor de contraseñas.

6. **Generar `GOOGLE_WEBHOOK_TOKEN`** en local (la usarás en Fase 4, pero genérala ya para tenerla):
   ```bash
   openssl rand -hex 24
   ```

7. **Añadir a Vercel** → Settings → Environment Variables. Las 5 variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI_BASE`, `ENCRYPTION_KEY`, `GOOGLE_WEBHOOK_TOKEN`), en los 3 environments (Development, Preview, Production).

### Verificación

- [ ] Proyecto GCP visible y seleccionable en la consola.
- [ ] Calendar API aparece como "Enabled".
- [ ] OAuth consent screen configurada con los 2 scopes y al menos 2 test users.
- [ ] Client ID + Secret creados, visibles en Credentials.
- [ ] Las 5 env vars están en Vercel, los 3 environments.
- [ ] Todas las credenciales guardadas en tu gestor de contraseñas.

---

## 6. Fase 1 — Esqueleto

**Quién**: Claude Code.
**Objetivo**: dejar el repo con la tabla en BD, las columnas en `citas`, la ruta `/integrations` con una tarjeta con botón deshabilitado. Nada real funciona. Si esto se mergea, el sistema en producción es idéntico al actual.
**Zonas intocables**: `app/api/webhooks/whatsapp/`, `app/api/cron/`, `lib/chatbot/`, `lib/evolution.ts`, `components/LeadDetail.tsx`, cualquier código que lea/escriba `citas`.

### Prompt para Claude Code

````
# Tarea: Fase 1 Google Calendar — esqueleto

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/architecture.md, conventions.md, decisions.md, integrations.md
- docs/PLAN-GOOGLE-CALENDAR-INTEGRATION.md (Fase 1 completa)

## Objetivo

Esqueleto sin lógica. No debe cambiar el comportamiento del sistema para ningún tenant.

## Deliverables

### 1. Migración Supabase

Usa `supabase migration new google_calendar_connections`. Contenido:

```sql
-- Tabla de conexiones
create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  google_email text not null,
  refresh_token_encrypted text not null,
  calendar_id text not null default 'primary',
  sync_enabled boolean not null default false,
  watch_channel_id text,
  watch_resource_id text,
  watch_expiration timestamptz,
  last_sync_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_gcc_tenant on public.google_calendar_connections(tenant_id);
create index idx_gcc_watch_expiration on public.google_calendar_connections(watch_expiration)
  where watch_expiration is not null;

alter table public.google_calendar_connections enable row level security;

-- Columnas nullable en citas
alter table public.citas add column if not exists google_event_id text;
alter table public.citas add column if not exists google_etag text;
alter table public.citas add column if not exists sync_source text;

create index if not exists idx_citas_google_event_id on public.citas(google_event_id)
  where google_event_id is not null;

alter table public.citas add constraint citas_sync_source_check
  check (sync_source is null or sync_source in ('crm','agent','google'));
```

**RLS importante**: antes de escribir las políticas, mira las de `evolution_config`
(o cualquier otra tabla de config por tenant) y replica el patrón. Reglas mínimas:
- SELECT: admin del tenant ve solo la suya. Super-admin ve todas.
- INSERT/UPDATE/DELETE: solo service_role. Los cambios vienen de endpoints, no de UI
  directa.

**Verifica antes de aplicar**: ejecuta mentalmente que ninguna query existente sobre
`citas` se rompe. Las 3 columnas nuevas son nullable y sin default, las queries
existentes las ignoran.

### 2. UI muda en /integrations

- `app/(dashboard)/integrations/page.tsx` como client component TypeScript.
- Una única tarjeta "Google Calendar":
  - Pill de estado "No conectado" (gris).
  - Descripción 1-2 frases: "Sincroniza las citas del CRM con tu Google Calendar.
    Los cambios que hagas en cualquiera de los dos se reflejan automáticamente en
    el otro."
  - Botón "Conectar con Google" con `disabled` + tooltip "Disponible próximamente".
- Estética consistente con `app/(dashboard)/modules/page.tsx`. Reusa estilos.

### 3. Navegación

En `components/Sidebar.tsx`, añadir al array `NAV_ITEMS` después de "Modulos":
```ts
{ id: "integrations", href: "/integrations", icon: "🔌", label: "Integraciones" }
```

### 4. Documentación

- Actualizar `.claude/docs/integrations.md`: sección nueva "Google Calendar" con
  tabla de env vars (de Fase 0), link a este plan, estado "Fase 1 completada".
- Entrada en `.claude/decisions.md`: "Arquitectura hub-and-spoke Google Calendar":
  decisión, alternativas consideradas (sync mesh A↔B↔C, descartado por complejidad
  y riesgo de loops), consecuencias (requiere watch channels + renovación cron).
- Sesión en `.claude/sessions/2026-XX-XX-google-calendar-fase1-esqueleto.md`.

## Restricciones

- NO tocar: webhook whatsapp, crons, chatbot, evolution.ts, LeadDetail, lógica
  de citas actual.
- NO añadir endpoints `/api/integrations/google/*`. Eso es Fase 2.
- NO lógica de sync. Eso es Fase 3.
- NO commit ni push hasta mi confirmación.

## Aceptación

- [ ] `npm run build` pasa sin nuevos warnings.
- [ ] `npm run lint` verde.
- [ ] `npm test` verde (los tests existentes de cron y chatbot siguen pasando).
- [ ] Al navegar a `/integrations` se ve la tarjeta con estado y botón disabled.
- [ ] Item "Integraciones" en sidebar.
- [ ] Crear una cita desde el CalendarioCitas y desde el agente WhatsApp sigue
      funcionando sin errores ni cambios perceptibles.

## Test manual post-deploy

1. En preview, loguear como admin de M&T.
2. Ir a Pipeline → crear una cita en un lead → verificar ok.
3. Enviar un mensaje al agente WhatsApp pidiendo una cita → verificar que agenda ok.
4. Ir a `/integrations` → ver la tarjeta.
5. Revisar Sentry → no debe haber errores nuevos.

## Rollback si algo sale mal

Down migration:
```sql
drop table if exists public.google_calendar_connections cascade;
alter table public.citas drop constraint if exists citas_sync_source_check;
alter table public.citas drop column if exists sync_source;
alter table public.citas drop column if exists google_etag;
alter table public.citas drop column if exists google_event_id;
```
+ `git revert` del merge.
````

---

## 7. Fase 2 — OAuth flow

**Quién**: Claude Code.
**Precondición**: Fase 1 mergeada a develop + env vars de Fase 0 disponibles.
**Objetivo**: un cliente puede conectar su Google desde `/integrations` y queda registrado. Todavía no se sincroniza ningún evento.
**Nota importante**: `sync_enabled` se queda en `false` al conectar en esta fase. En Fase 3 cambiará a `true` por defecto. Motivo: el helper de sync no existe todavía.

### Prompt para Claude Code

````
# Tarea: Fase 2 Google Calendar — OAuth flow funcional

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/integrations.md
- docs/PLAN-GOOGLE-CALENDAR-INTEGRATION.md (Fase 2 completa)
- La sesión de Fase 1

## Deliverables

### 1. Utilidad de cifrado

`lib/crypto.ts`:
- `encrypt(plaintext: string): string` — AES-256-GCM, formato `iv:authTag:ciphertext`
  en base64 concatenado con `:`.
- `decrypt(encrypted: string): string` — inverso.
- Usa `node:crypto` (Node.js runtime, no Edge).
- Clave desde `process.env.ENCRYPTION_KEY`. Si no existe o no es hex de 64 chars,
  throw al importar el módulo con mensaje claro.
- Tests en `lib/__tests__/crypto.test.ts`: round-trip ok, round-trip con clave mala
  falla, payload corrupto falla.

### 2. Cliente Google Calendar server-side

`lib/google-calendar/client.ts` con funciones:
- `getOAuthUrl(tenantId, redirectUri)`: construye URL con `state=tenantId`,
  scopes `calendar.events` + `userinfo.email`, `access_type=offline`,
  `prompt=consent` (forzar refresh_token siempre).
- `exchangeCodeForTokens(code, redirectUri)` → `{access_token, refresh_token,
  expires_in, id_token}`.
- `refreshAccessToken(refreshToken)`.
- `revokeToken(token)` contra `https://oauth2.googleapis.com/revoke`.
- `getUserEmail(accessToken)` leyendo userinfo endpoint.

Fetch directo, no hace falta `googleapis` npm.

### 3. Endpoints

**`GET /api/integrations/google/auth`**
- Requiere sesión Supabase. Lee tenant_id del usuario.
- Construye OAuth URL, guarda `tenant_id` en cookie httpOnly firmada de 5 min
  como doble verificación del state.
- Responde con redirect a Google.

**`GET /api/integrations/google/callback`**
- Recibe `code` y `state`. Verifica:
  1. `state` === cookie (anti-CSRF). Si no, 403.
  2. User logado pertenece al tenant del state. Si no, 403.
- Intercambia code por tokens.
- Obtiene email de Google.
- Cifra refresh_token.
- **Upsert** en `google_calendar_connections` (una fila por tenant). `sync_enabled`
  queda en `false` en Fase 2 (en Fase 3 se cambia a `true`).
- Redirige a `/integrations?connected=true`.
- Manejo errores: Sentry + redirect a `/integrations?error=<code>`.

**`POST /api/integrations/google/disconnect`**
- Requiere sesión.
- Lee la fila del tenant.
- Descifra y revoca el refresh_token contra Google.
- Elimina la fila entera (más limpio que mantener fila desconectada).
- Responde 200.

**`POST /api/integrations/google/toggle-sync`**
- Requiere sesión. Body: `{ enabled: boolean }`.
- Actualiza `sync_enabled`. En Fase 2 no tiene efecto real (no hay helper); en
  Fase 3 empieza a valer.

### 4. UI funcional en /integrations

Reemplaza la tarjeta muda de Fase 1.

**Estado "no conectado"**:
- Pill gris "No conectado".
- Descripción.
- Botón "Conectar con Google" → `window.location.href = '/api/integrations/google/auth'`.

**Estado "conectado"**:
- Pill verde "Conectado como [google_email]".
- Texto pequeño "Sincronización: pendiente de activación (disponible en próxima
  actualización)" (en Fase 3 esto se cambia).
- Botón secundario "Desconectar" (rojo, con modal de confirmación).

**Query params**:
- `?connected=true` → toast verde "Google Calendar conectado correctamente".
- `?error=xxx` → toast rojo con mensaje según código.

### 5. Rate limit

Los 4 endpoints pasan por `rateLimit()` de `lib/rate-limit.ts`. 10 req/min por IP.

### 6. Tests

- `app/api/integrations/google/__tests__/callback.test.ts`: state mismatch → 403,
  tenant mismatch → 403, flujo feliz → upsert correcto y redirect.
- `lib/__tests__/crypto.test.ts`: round-trip y casos de error.

### 7. Documentación

- `.claude/docs/integrations.md`: flujo OAuth y contrato de los 4 endpoints.
- Sesión `.claude/sessions/2026-XX-XX-google-calendar-fase2-oauth.md`.
- Si eliges algo técnicamente no trivial, entrada en `decisions.md`.

## Restricciones

- NO tocar `citas` ni su lógica. En Fase 2 conectar no sincroniza nada.
- NO tocar webhook whatsapp, crons, chatbot.
- El `refresh_token` en claro NUNCA se escribe en logs, Sentry, ni en mensajes de
  error. Revisa explícitamente los catches.
- NO commit ni push hasta confirmación.

## Aceptación

- [ ] Build, lint, tests verdes.
- [ ] Desde `/integrations`, pulsar "Conectar" lleva a Google, autorizo con cuenta
      de test, vuelvo a `/integrations` con toast y estado "Conectado".
- [ ] Fila nueva en `google_calendar_connections` con refresh_token ilegible.
- [ ] "Desconectar" elimina la fila y la app deja de aparecer en la pantalla
      "Apps con acceso" de la cuenta Google.
- [ ] Reconectar después de desconectar funciona (gracias a `prompt=consent`).
- [ ] State manipulado → 403.
- [ ] Ningún log contiene el refresh_token en claro.

## Rollback

Revert del merge + update masivo `sync_enabled = false` en BD (aunque en Fase 2 ya
es false por defecto). Las filas creadas pueden quedar: Fase 3 las trata.
````

---

## 8. Fase 3 — Sync saliente + sync inicial

**Quién**: Claude Code.
**Precondición**: Fase 2 mergeada, al menos una conexión de prueba en BD (M&T tenant).
**Objetivo**: cuando se crea/modifica/borra una cita en Supabase, si el tenant tiene conexión activa, se refleja en Google Calendar. Al conectar por primera vez, se hace sync inicial de citas futuras.
**Regla de oro**: si Google falla, la cita en Supabase se guarda igual.

### Prompt para Claude Code

````
# Tarea: Fase 3 Google Calendar — sync saliente en shadow mode + sync inicial

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/integrations.md
- .claude/docs/fixes.md (presta atención a los fixes recientes de citas: race
  conditions, unique partial index, agente usa BD como fuente de verdad)
- docs/PLAN-GOOGLE-CALENDAR-INTEGRATION.md (Fase 3 completa)
- Sesiones de Fases 1 y 2

## Principio rector

El sync a Google NUNCA puede romper la creación/modificación de una cita en
Supabase. Si la llamada a Google falla, se loguea y se sigue. Para cualquier
tenant con `sync_enabled = false`, el comportamiento observable debe ser EXACTAMENTE
el mismo que antes de esta fase.

## Deliverables

### 1. Helper de sync

`lib/google-calendar/sync.ts`:

```ts
export type SyncAction = 'create' | 'update' | 'delete'

export async function syncCitaToGoogle(
  citaId: string,
  action: SyncAction
): Promise<{ ok: boolean; googleEventId?: string; skipped?: boolean; error?: string }>
```

Lógica:
1. Lee cita de Supabase con admin client.
2. Lee `google_calendar_connections` del tenant. Si no existe o `sync_enabled = false`,
   retorna `{ ok: true, skipped: true }`. **Gate principal, ante todo.**
3. Descifra refresh_token. Obtiene access_token fresco (refresca si hace falta).
4. Ejecuta según action:
   - `create`: `events.insert`. Guarda `google_event_id` + `google_etag` en `citas`.
     Setea `sync_source = 'crm'` o `'agent'` según quien llame (parámetro o inferencia).
   - `update`: si `cita.google_event_id` existe, `events.patch`. Si no, insert
     (edge case: conexión se activó después).
   - `delete`: `events.delete`. Limpia `google_event_id` de la fila.
5. Actualiza `google_calendar_connections.last_sync_at = now()`.
6. Si falla: guarda `last_error` + `last_error_at`. Sentry tag
   `feature: google-calendar-sync`. Retorna `{ ok: false, error }`. **NUNCA lanzar.**
7. Si `invalid_grant` (refresh_token revocado):
   - Setea `sync_enabled = false`.
   - `last_error = 'token_revoked'`.
   - Sentry + Slack #developers.

Top-level try/catch envuelve toda la función. Si algo raro lanza (timeout, JSON mal),
retorna `{ ok: false }`.

### 2. Sync inicial al conectar

`lib/google-calendar/initial-sync.ts`:

```ts
export async function runInitialSync(tenantId: string): Promise<void>
```

- Ejecutado al final del callback de OAuth (Fase 2), fire-and-forget.
- Lee todas las citas del tenant con `fecha >= today` y sin `google_event_id`.
- Para cada una, llama a `syncCitaToGoogle(citaId, 'create')`.
- Rate limit interno: máximo 5 syncs/segundo para no pasarse de quota Google.
- Loguea un resumen al final: total, ok, fails.
- Errores individuales no paran la tanda.

### 3. Modificar el callback OAuth (Fase 2)

En `app/api/integrations/google/callback/route.ts`:
- Al crear la fila en `google_calendar_connections`, poner `sync_enabled = true`
  (antes era false en Fase 2).
- Después del upsert, disparar `runInitialSync(tenantId)` sin await:
  ```ts
  runInitialSync(tenantId).catch(err => {
    console.error('[google-sync] initial-sync failed', err)
  })
  ```

### 4. Integración en el flujo de citas

**En webhook WhatsApp** (`app/api/webhooks/whatsapp/route.ts`):

Busca los puntos actuales:
- `supabase.from('citas').insert({...})` (agente agenda) — hay uno alrededor de la
  línea 353.
- `supabase.from('citas')` con updates de cancelación (hay dos alrededor de las
  líneas 312 y 324).

Para cada uno, después de una operación exitosa en Supabase, llama fire-and-forget:
```ts
syncCitaToGoogle(cita.id, action).catch(err =>
  console.error('[google-sync] fallback catch', err)
)
```
El `.catch` final es segunda capa por si el try/catch interno falla.

Añade `sync_source: 'agent'` al insert.

**En el CalendarioCitas**:
- El componente vive en `src/CalendarioCitas.jsx` (legacy Vite aún sin migrar).
- NO lo migres entero aquí. Eso es Fase 7.
- Añade las llamadas al sync en los puntos donde hoy hace insert/update/delete a
  Supabase. Si el acceso desde JSX es incómodo, crea un hook
  `lib/hooks/useCitasSync.ts` que envuelva la lógica y usa el hook desde el JSX.
- Añade `sync_source: 'crm'` al insert.

### 5. Activación retroactiva de conexiones existentes

Para los tenants que conectaron durante Fase 2 (M&T, Eneko) y tienen `sync_enabled
= false`, crea un script one-shot `scripts/activate-existing-connections.ts` que:
- Liste conexiones con `sync_enabled = false`.
- Las actualice a `true`.
- Dispare `runInitialSync` para cada una.

Documenta en el README del script cómo ejecutarlo manualmente post-merge.

### 6. UI actualizada

En `/integrations`:
- Si `sync_enabled = true`, pill verde + texto "Sincronizando".
- Mostrar `last_sync_at` si existe ("Última sincronización: hace 3 min").
- Si `last_error` existe, banner amarillo con el error.
- Si `last_error === 'token_revoked'`, banner rojo "Tu conexión ha sido invalidada,
  vuelve a conectar".
- Botón "Pausar sincronización" (cambia `sync_enabled` vía endpoint
  `/toggle-sync` existente). Cuando está pausada, pill amarilla "Pausada" + botón
  "Reanudar".

### 7. Tests

- `lib/google-calendar/__tests__/sync.test.ts`:
  - Tenant sin conexión → skipped.
  - Tenant con `sync_enabled = false` → skipped.
  - Flujo feliz create/update/delete (mock fetch a Google).
  - `invalid_grant` → marca `sync_enabled = false` y retorna `ok: false`.
  - Error de red → `ok: false` sin excepción.
- Regresión: followups-buckets y otros tests existentes verdes.

### 8. Observabilidad

- Tag Sentry `feature: google-calendar-sync` en todos los errores del helper.
- Dashboard en Sentry con filtros por este tag (documentar en
  `.claude/docs/integrations.md`).

### 9. Documentación

- `.claude/docs/integrations.md`: sección "Sync saliente" con contrato del helper,
  tabla de comportamiento según `sync_enabled`.
- `.claude/docs/fixes.md` si surgen bugs durante implementación.
- Sesión `.claude/sessions/2026-XX-XX-google-calendar-fase3-sync-saliente.md`.

## Restricciones

- `sync_enabled = false` NUNCA cambia el comportamiento del sistema.
- NO tocar crons. Los recordatorios no tocan Google en esta fase.
- NO tocar `lib/chatbot/*`. El agente lee de Supabase como ya hace.
- NO commit ni push hasta confirmación.

## Aceptación

- [ ] Build, lint, tests verdes.
- [ ] Con `sync_enabled = false`: crear cita desde CalendarioCitas y desde agente
      funciona igual, sin tocar Google.
- [ ] Con `sync_enabled = true` en M&T tenant:
  - Crear cita desde CalendarioCitas → aparece en Google en <5s.
  - Crear cita por agente → aparece en Google.
  - Editar en CRM → se actualiza en Google.
  - Borrar en CRM → desaparece en Google.
- [ ] Desconectar y reconectar M&T → el sync inicial sube las citas futuras
      existentes al Google.
- [ ] Forzar error: cortar `GOOGLE_CLIENT_SECRET` con valor malo en preview → crear
      cita → la cita se crea correctamente en Supabase, Sentry registra el error,
      `last_error` se llena. **La cita NO se pierde.**

## Test manual canónico antes de cerrar Fase 3

1. M&T activa sync (activación retroactiva vía script o nueva conexión).
2. Crear 5 citas variadas (CRM y WhatsApp, distintos leads y horas).
3. Verificar cada una en Google Calendar.
4. Editar 2, borrar 1. Verificar reflejo.
5. Otro tenant sin conexión → crear cita → NO debe aparecer en ningún Google.
6. Dejar 24h. Revisar Sentry. Cero errores inesperados.

## Rollback

- Apagar todo al instante: `update google_calendar_connections set sync_enabled = false`.
- Si hace falta revertir código: `git revert` del merge. Las columnas quedan (son
  additive-only).
````

---

## 9. Fase 4 — Sync entrante

**Quién**: Claude Code.
**Precondición**: Fase 3 estable 48h en M&T tenant sin errores en Sentry.
**Objetivo**: cuando un cliente crea/modifica/borra una cita directamente en su Google Calendar (móvil, web, etc.), el cambio se refleja en Supabase. Usamos push notifications (watch channels), no polling.

**Esta es la fase más delicada** por: bucles de sincronización, expiración de watches cada 7 días, verificación de origen del webhook.

### Prompt para Claude Code

````
# Tarea: Fase 4 Google Calendar — sync entrante con watch channels

Antes de empezar, lee:
- CLAUDE.md y .claude/docs/ completo
- docs/PLAN-GOOGLE-CALENDAR-INTEGRATION.md (Fase 4 completa)
- Sesiones de Fases 2 y 3
- Doc oficial de Google: https://developers.google.com/calendar/api/guides/push

## Deliverables

### 1. Crear watch channel en callback OAuth

En `app/api/integrations/google/callback/route.ts`, después del upsert y del
initial-sync, crea watch channel:

```ts
const channelId = crypto.randomUUID()
const token = process.env.GOOGLE_WEBHOOK_TOKEN
const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 días

const resp = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events/watch`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: channelId,
      type: 'web_hook',
      address: `${process.env.GOOGLE_REDIRECT_URI_BASE}/api/webhooks/google-calendar`,
      token,
      expiration: expiration.toString(),
    }),
  }
)
```

Guardar en la fila: `watch_channel_id`, `watch_resource_id` (del response),
`watch_expiration`.

Si falla el watch, loguear pero NO romper el callback. La conexión queda, el cron
de renovación (más abajo) intentará crearlo.

### 2. Webhook entrante

`app/api/webhooks/google-calendar/route.ts`:

- Método POST. Headers que envía Google: `X-Goog-Channel-ID`, `X-Goog-Channel-Token`,
  `X-Goog-Resource-ID`, `X-Goog-Resource-State`, `X-Goog-Message-Number`.
- Validaciones:
  1. `X-Goog-Channel-Token` === `process.env.GOOGLE_WEBHOOK_TOKEN`. Si no, 403.
  2. `rateLimit()` (60 req/min por IP).
  3. Buscar fila en `google_calendar_connections` por `watch_channel_id`. Si no
     existe, 404 + hacer `channels.stop` para limpiar watch huérfano.
  4. Si `sync_enabled = false` en esa fila, responder 200 sin procesar (watch
     sigue vivo pero ignoramos — permite pausar sin desconectar).
- Estados `X-Goog-Resource-State`:
  - `sync`: confirmación inicial de suscripción. 200 sin hacer nada.
  - `exists`: algo cambió. Procesar.
- Para `exists`:
  - Usa `syncToken` guardado en la fila (campo nuevo, ver sección 3) para pedir
    solo los cambios desde la última sync. Si no hay `syncToken` aún, usa
    `updatedMin = last_sync_at` con `showDeleted=true`.
  - Para cada evento recibido:
    - Si `status === 'cancelled'` y existe cita con ese `google_event_id`:
      borrar/marcar la cita (sigue el patrón actual de borrado de citas del CRM).
    - Si es nuevo (no hay cita con ese id):
      - Intentar emparejar con un lead por email/teléfono del asistente.
      - Si no se puede emparejar: crear cita con `lead_id = null` y flag
        `necesita_asignacion = true` (añadir columna nullable a `citas` en esta
        fase — additive), o alternativamente solo loguear para revisión manual.
        Decide y documenta la elección en `decisions.md`.
    - Si existe: comparar `etag`. Si **etag entrante === etag guardado**, es el
      eco de nuestra propia escritura, **IGNORAR** (anti-loop). Si es distinto,
      actualizar la cita con los datos nuevos y `sync_source = 'google'`.
  - Si es evento recurrente (`recurrence` o `recurringEventId`), loguear
    "recurrente no soportado" y continuar con el siguiente.
  - Guardar el nuevo `syncToken` devuelto por Google.
- Actualizar `last_sync_at`.
- **Responder 200 siempre en <1s.** Si procesar pesa, desacoplar con fire-and-forget
  tras responder.

### 3. Columna syncToken

Migración adicional:
```sql
alter table public.google_calendar_connections add column if not exists sync_token text;
alter table public.citas add column if not exists necesita_asignacion boolean default false;
```

### 4. Cron de renovación de watches

`app/api/cron/refresh-google-watches/route.ts`:
- Schedule: `0 3 * * *` (3 AM UTC, diario).
- Verificar `CRON_SECRET` en header (mismo patrón que otros crons — ver
  `.claude/docs/fixes.md` sobre el fix reciente de CRON_SECRET obligatorio).
- Query: conexiones con `watch_expiration < now() + interval '48 hours'` y
  `sync_enabled = true`.
- Para cada una:
  1. Refrescar access_token.
  2. `channels.stop` del watch viejo (si no falla, sigue).
  3. Crear watch nuevo con channelId nuevo.
  4. Update `watch_channel_id`, `watch_resource_id`, `watch_expiration`.
- Loguear resumen. Sentry si falla alguna.

Añadir a `vercel.json`:
```json
{ "path": "/api/cron/refresh-google-watches", "schedule": "0 3 * * *" }
```
(Fusiona con los crons existentes, no sobrescribas.)

### 5. Parar watch en disconnect

En `POST /api/integrations/google/disconnect` (Fase 2), antes de revocar token,
hacer `channels.stop` con el `watch_channel_id` guardado. Si falla, seguir (el
token revocado invalida el watch eventualmente).

### 6. Edge cases

- **Revocación manual desde Google**: primera llamada con `invalid_grant` → marcar
  `sync_enabled = false`, `last_error = 'token_revoked'`, banner rojo en
  `/integrations` pidiendo reconectar.
- **Múltiples calendarios por cuenta**: esta fase solo `primary`. Selector es Fase 7+.

### 7. Anti-loop adicional

Complementar la comparación de etag con un check de timestamp: si
`cita.updated_at` es < 30s y la venía escribiendo el CRM o el agente
(`sync_source in ('crm','agent')`), ignorar el eco del webhook.

### 8. Tests

- Mock de headers de Google en el webhook: firmas ok/ko, estados sync/exists.
- Test de anti-loop: evento con etag === el guardado → no actualiza.
- Test del cron: watch que vence en 24h → se renueva.

### 9. Documentación

- `.claude/docs/integrations.md`: flujo entrante completo, diagrama ASCII, tabla
  de estados.
- `.claude/docs/architecture.md`: actualizar mapa de sistemas externos.
- Sesión Fase 4.

## Restricciones

- `sync_enabled = false` NUNCA recibe cambios de Google (pero el watch puede estar
  vivo — pausar en la fila, no en Google).
- Webhook responde en <1s siempre.
- NO commit ni push hasta confirmación.

## Aceptación

- [ ] Build, lint, tests verdes.
- [ ] En M&T tenant conectado:
  - Crear evento directamente en Google Calendar móvil → aparece en CRM en <10s.
  - Mover hora en Google → se actualiza en CRM.
  - Borrar en Google → desaparece en CRM.
- [ ] Crear cita en CRM → aparece en Google → NO se crea duplicado ni loop.
- [ ] Forzar ejecución manual del cron de renovación: renueva watches que vencen en
      <48h.
- [ ] Revocar token manualmente desde cuenta Google → próxima llamada marca
      `sync_enabled = false` y muestra banner.

## Test manual canónico

Ciclo cerrado: crear en CRM → ver en Google → editar en Google → ver en CRM →
borrar en CRM → ver que desaparece en Google. Todo sin duplicados ni loops.
Pausar sync (`sync_enabled = false`) → crear evento en Google → verificar que NO
llega a Supabase. Reactivar → siguiente cambio sí llega.

## Rollback

- `update google_calendar_connections set sync_enabled = false` + script one-shot
  para hacer `channels.stop` en todos los watch activos.
- Si se necesita matar el webhook entero: devolver 404 desde el primer byte.
````

---

## 10. Fase 5 — Verificación Google

**Quién**: tú preparas los contenidos, yo te ayudo con redacción cuando haga falta.
**Precondición**: Fase 4 estable al menos 48h en M&T tenant.
**Objetivo**: enviar la app a verificación de Google para poder operar en producción con cualquier cliente (no solo test users).
**Timing esperado**: 1-3 semanas para scopes sensitive (calendar.events cae aquí). Mientras Google responde, puedes seguir operando en Testing con los pilotos.

### Pasos

1. **Verificar dominio en Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)): añadir la propiedad del dominio de producción, seguir los pasos de verificación DNS.

2. **Preparar los contenidos obligatorios**:
   - **Logo de la app**: 120×120 px, formato cuadrado, fondo transparente (PNG preferible).
   - **URL de homepage**: tu web de producción. Debe ser accesible sin login.
   - **URL de privacy policy**: página en tu dominio explicando qué haces con los datos de Google. Claude puede ayudarte a redactarla partiendo del template oficial de Google ([link](https://developers.google.com/terms/api-services-user-data-policy)).
   - **URL de términos de servicio**: idem.
   - **Justificación del scope `calendar.events`**: 1-2 párrafos. Template:
     > M&T CRM es un CRM para pymes que incluye gestión de citas con leads. La
     > integración con Google Calendar permite a los usuarios sincronizar las citas
     > creadas en el CRM con su calendario personal/empresarial, y viceversa, para
     > que estén accesibles desde cualquier dispositivo. Necesitamos
     > `calendar.events` (y no un scope más reducido) porque debemos poder crear,
     > modificar y eliminar eventos en respuesta a las acciones del usuario en el
     > CRM, así como detectar cambios hechos directamente en Google Calendar para
     > mantener la consistencia.
   - **Demo video en YouTube** (unlisted, no público): 2-3 min mostrando:
     - Pantalla de login del CRM.
     - Ir a `/integrations` → pulsar "Conectar con Google".
     - Ver pantalla de consentimiento de Google con los scopes.
     - Autorizar.
     - Volver al CRM y mostrar la conexión activa.
     - Crear una cita en el CRM y mostrar que aparece en Google Calendar.
     - Crear un evento en Google Calendar y mostrar que aparece en el CRM.
     - Desconectar.

3. **Rellenar formulario de verificación** en Google Cloud Console → OAuth consent screen → "Publish app" → seguir los pasos → incluir todos los contenidos preparados.

4. **Monitorizar respuesta de Google**: te llegan emails a la cuenta del developer contact. A veces piden cambios; responder rápido acelera el proceso.

5. **Mientras esperas**: seguir operando en Testing mode con los piloto (Itzalki puede entrar si lo añades como test user, hasta 100).

### Prompt para Claude (chat, no Claude Code)

````
Ayúdame a redactar la privacy policy y los términos de servicio de M&T CRM
específicamente para la integración con Google Calendar. Sigue el template de
Google API Services User Data Policy y adáptalo a nuestro caso:
- Datos que accedemos: eventos del calendario primary del usuario.
- Qué hacemos con ellos: mostrarlos en el panel del CRM, crearlos/editarlos en
  respuesta a acciones del CRM o del agente de WhatsApp.
- Dónde se almacenan: base de datos Supabase (Frankfurt, EU), con RLS por tenant.
- Cómo se protegen: cifrado en reposo (refresh token con AES-256-GCM), TLS en
  tránsito, acceso restringido al equipo de M&T.
- Cómo el usuario puede revocar: desde su cuenta Google, o desde el panel del CRM.
- Cumplimiento RGPD.
Genera también el texto de justificación del scope para el formulario de Google.
````

---

## 11. Fase 6 — Rollout canary → producción

**Quién**: tú decides el ritmo, yo ayudo con SOP y monitorización.
**Precondición**: Fase 5 aprobada (o todavía en review, con clientes piloto bien identificados).

### Pasos

1. **Día 0**: M&T tenant con todo activo y funcionando. 48h observando Sentry.
2. **Día 3**: si Sentry limpio, activar Itzalki. Previa: hablar con el cliente, explicar qué va a pasar ("tus citas del CRM van a aparecer en tu Google Calendar, y los cambios que hagas ahí se reflejarán en el CRM"). Añadirlos como test user si todavía en Testing.
3. **Día 10**: si Itzalki estable 7 días, activar AQTIVA siguiendo mismo proceso.
4. **Día 17 en adelante**: comunicación al resto de clientes con opt-in desde su propio panel.

### Prompt para Claude Code

````
# Tarea: Fase 6 — Rollout + observabilidad

## Deliverables

### 1. Dashboard interno de salud (solo super-admin)

Tarjeta nueva en `/admin` que muestre por tenant:
- Estado de conexión (conectado/desconectado).
- `sync_enabled`.
- `last_sync_at` + tiempo relativo.
- `last_error` + `last_error_at`.
- `watch_expiration` + "renovación en X horas".
- Número de citas con `google_event_id` (conteo rápido).
- Errores de las últimas 24h filtrados por tag Sentry.

Query directa a `google_calendar_connections`.

### 2. Alerta Slack #developers

Webhook que dispara en:
- `last_error` cambia en cualquier tenant.
- >5 fallos de sync en 1h para un tenant.
- watch_expiration < 24h y el cron de renovación no ha corrido.

### 3. SOP de activación

`docs/SOP-activacion-google-calendar.md`:
- Checklist pre-activación (env vars, verificación aprobada, etc).
- Pasos para el cliente desde su panel (con pantallazos).
- Qué hacer si ve un banner de error.
- Límites conocidos (solo primary, no recurrentes).
- Troubleshooting rápido para el equipo de M&T.

### 4. Comunicación a clientes (plantillas)

`docs/plantillas/comunicacion-google-calendar-clientes.md`:
- Email de anuncio a clientes existentes.
- Email de explicación paso a paso para conectar.
- Email de respuesta tipo ante las dudas más comunes (RGPD, privacidad, qué pasa si
  revoco).

### 5. Métricas de adopción

Query simple que cuente:
- Tenants con conexión activa.
- Citas sincronizadas últimos 7 días.
- Ratio error/éxito.

Mostrar en dashboard admin.

## Aceptación

- [ ] Dashboard admin visible y con datos reales.
- [ ] Alerta Slack probada (forzar error).
- [ ] SOP ejecutable por Eneko sin ayuda.
- [ ] Plantillas de comunicación listas para enviar.
````

---

## 12. Fase 7 — Hardening

**Quién**: Claude Code.
**Cuándo**: cuando haya tiempo y la integración lleve meses en producción sin drama.

### Prompt para Claude Code

````
# Tarea: Fase 7 — Hardening Google Calendar

## Deliverables

### 1. Migrar CalendarioCitas

`src/CalendarioCitas.jsx` → `components/CalendarioCitas.tsx`:
- Tipado TypeScript completo.
- Actualizar import en `app/(dashboard)/calendar/page.tsx`.
- Comportamiento idéntico, solo estructura nueva.
- Eliminar `src/CalendarioCitas.jsx` al final.

### 2. Selector de calendario

En `/integrations`, si el cliente tiene varios calendarios:
- Listar `calendarList.list`.
- Guardar elegido en `google_calendar_connections.calendar_id`.
- Ajustar API calls y watches para usarlo.

### 3. Tests end-to-end

Suite en `e2e/google-calendar.spec.ts`:
- Cuenta Google de test (credenciales en secrets CI).
- Flow: conectar → crear en CRM → verificar en Google → crear en Google → verificar
  en CRM → desconectar.
- Correr bajo demanda (no en cada push, gasta cuota).

### 4. Exponential backoff para cuota Google

En el helper de sync:
- 429/500 → retry con backoff exponencial (1s, 2s, 4s, máx 3 intentos).
- Registrar quota usage en métricas.

### 5. Soporte básico de eventos recurrentes (opcional)

Si hay demanda. Por ahora no.

### 6. Documentación final

- Actualizar `CLAUDE.md`: la línea de Google Calendar ya no es aspiracional.
- Cerrar plan: último commit "docs: plan Google Calendar completado".

## Aceptación

- [ ] CalendarioCitas migrado, `src/` vacío o solo con assets.
- [ ] Selector de calendario funcional (si se incluye).
- [ ] E2E verde en cuenta de test.
- [ ] Backoff probado forzando 429.
````

---

## 13. Checklist maestro

Marca según avances. Puedes moverlo a `docs/google-calendar-checklist.md` como archivo separado si prefieres verlo aparte.

### Fase 0 — Setup GCP
- [ ] Proyecto GCP creado
- [ ] Calendar API habilitada
- [ ] OAuth consent screen configurada con 2 test users
- [ ] Client ID + Secret creados
- [ ] 5 env vars en Vercel (los 3 environments)
- [ ] Credenciales guardadas en gestor de contraseñas

### Fase 1 — Esqueleto
- [ ] Migración aplicada en develop
- [ ] Tabla `google_calendar_connections` con RLS
- [ ] Columnas nullable en `citas`
- [ ] UI muda en `/integrations`
- [ ] Item en sidebar
- [ ] Build + lint + tests verdes
- [ ] Merge a develop
- [ ] Deploy preview verificado

### Fase 2 — OAuth
- [ ] `lib/crypto.ts` con tests
- [ ] Cliente Google server-side
- [ ] 4 endpoints OAuth
- [ ] UI funcional conectar/desconectar
- [ ] Probado con cuenta test
- [ ] Merge a develop

### Fase 3 — Sync saliente
- [ ] Helper `syncCitaToGoogle` con tests
- [ ] `runInitialSync` implementado
- [ ] Callback OAuth dispara sync inicial
- [ ] Integración en webhook WhatsApp
- [ ] Integración en CalendarioCitas
- [ ] Script de activación retroactiva ejecutado para M&T/Eneko
- [ ] `sync_source` poblándose correctamente
- [ ] Test manual con M&T tenant (5 citas, edit, delete)
- [ ] 48h observando Sentry sin errores
- [ ] Merge a develop

### Fase 4 — Sync entrante
- [ ] Watch channel creado en callback OAuth
- [ ] Webhook entrante con verificación token
- [ ] Cron diario de renovación
- [ ] Anti-loop verificado (etag + timestamp)
- [ ] Ciclo cerrado probado en M&T
- [ ] Revocación desde Google marca correctamente
- [ ] Merge a develop

### Fase 5 — Verificación Google
- [ ] Dominio verificado en Search Console
- [ ] Privacy policy publicada
- [ ] Terms of service publicados
- [ ] Logo 120×120 subido
- [ ] Justificación de scope redactada
- [ ] Demo video en YouTube (unlisted)
- [ ] Formulario enviado a Google
- [ ] Respuesta recibida + cambios atendidos si los piden
- [ ] Verificación aprobada

### Fase 6 — Rollout
- [ ] M&T canary 48h OK
- [ ] Dashboard admin de salud
- [ ] Alerta Slack probada
- [ ] SOP redactado
- [ ] Itzalki activado + 7 días estable
- [ ] AQTIVA activado
- [ ] Comunicación enviada al resto

### Fase 7 — Hardening
- [ ] CalendarioCitas migrado a `components/`
- [ ] Selector de calendario (si se hace)
- [ ] Tests e2e
- [ ] Backoff exponencial

---

## 14. Rollback de emergencia

**Regla general**: apagar antes que arreglar.

**Apagado total instantáneo**:
```sql
update google_calendar_connections set sync_enabled = false;
```
Ejecutado en Supabase SQL editor. Detiene TODO el sync para TODOS los tenants en segundos. El CRM sigue funcionando igual que antes, porque Supabase es la fuente de verdad.

**Si hay filas de `citas` con datos malos venidos de Google**:
```sql
-- Aislar
select * from citas where sync_source = 'google' and created_at > [fecha_problema];
-- Limpiar/corregir manualmente
```

**Si hay que matar el webhook entero** (p.ej. Google enviando spam por bug):
- Deploy rápido de `app/api/webhooks/google-calendar/route.ts` devolviendo 404 desde el primer byte.

**Si refresh_tokens corruptos**: `update google_calendar_connections set sync_enabled = false where tenant_id in (...)`. Pedir al cliente reconectar desde su panel.

**Avisar al cliente afectado** siempre que el incidente sea visible para ellos. La transparencia siempre gana.

---

*Plan v2 — actualizado 2026-04-23. Autor: Ekaitz + Claude.*
