# Spec — Webhook de Calendly `/api/webhooks/calendly`

> **Estado**: pendiente de implementar (Ekaitz).
> **Owner landing**: Eneko. Landing ya dispara pixel `Schedule` al completar reserva.
> **Dependencia comercial**: Calendly plan Standard ($10/mes/user) — webhooks v2 no están en Free.
> Eneko está en trial Standard. Validamos con el trial, luego se mantiene.

---

## 1. Contexto y objetivo

La landing `LP-m-tconsulting-001` embebe un widget Calendly inline tras el primer formulario (captura nombre / email / teléfono). El lead se crea en el CRM via `POST /api/webhooks/lead` cuando se envía el form **antes** de que Calendly aparezca.

El problema actual: **cuando el lead agenda cita en Calendly, el CRM no se entera**. El lead se queda en stage `nuevo`. El setter no tiene contexto de:

- Si el lead llegó hasta reservar o abandonó en Calendly.
- Cuándo es la reunión (fecha/hora).
- Las respuestas del lead a las preguntas custom de Calendly (tipo de centro, nº socios, reto principal, ubicación).

Este webhook soluciona todo eso.

## 2. Flujo end-to-end

```
Landing form submit
   └─→ POST /api/webhooks/lead  →  crea lead { fase: 'nuevo', origen: 'web' }

(usuario ve Calendly inline, completa reserva)
   └─→ Calendly envía webhook firmado con HMAC  →  POST /api/webhooks/calendly
         ├─ Verifica firma HMAC (CALENDLY_WEBHOOK_SIGNING_KEY)
         ├─ Resuelve tenant (por calendly_user_uri → tenants.id)
         ├─ Busca lead por email + tenant_id
         ├─ UPDATE lead  → fase = 'reunion'
         ├─ INSERT cita  → fecha_hora, duracion, origen='calendly', gcal_event_id=null
         └─ INSERT o UPDATE campos_extra con questions_and_answers

(si el lead canceló en Calendly)
   └─→ POST /api/webhooks/calendly (event=invitee.canceled)
         ├─ UPDATE cita → estado='cancelada'
         └─ UPDATE lead → fase='contactado' (no revertir a 'nuevo': ya le hablamos)
```

## 3. Endpoint

- **Ruta**: `app/api/webhooks/calendly/route.ts`
- **Método**: `POST` (+ `OPTIONS` para CORS — aunque Calendly lo envía server→server, no hace falta; mejor **no** abrir CORS aquí, es server-to-server)
- **Respuesta**: `200 OK` con `{ success: true }` o `{ success: false, error }` — Calendly reintenta si recibe 5xx o timeout. **Siempre responder rápido** (procesar en background si hay side-effects lentos, pero aquí no los hay).
- **Rate limit**: usar `rateLimit()` de `lib/rate-limit` con `maxRequests: 60/min`. Calendly puede ráfagas pero no spamea.

### Esqueleto (TypeScript, patrón igual que `/api/webhooks/lead/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { verifyCalendlySignature } from '@/lib/calendly-signature'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rl = rateLimit(ip, { maxRequests: 60 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('calendly-webhook-signature') || ''
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  if (!signingKey || !verifyCalendlySignature(rawBody, signatureHeader, signingKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const eventType = payload.event // 'invitee.created' | 'invitee.canceled'

  const supabase = createAdminClient()

  if (eventType === 'invitee.created') return handleCreated(supabase, payload)
  if (eventType === 'invitee.canceled') return handleCanceled(supabase, payload)

  return NextResponse.json({ success: true, ignored: eventType })
}
```

## 4. Seguridad — Verificación de firma HMAC

Calendly firma cada webhook con HMAC-SHA256 y lo envía en el header `Calendly-Webhook-Signature` con formato:

```
t=1712345678,v1=abc123deadbeef...
```

**Algoritmo** (Calendly docs: <https://developers.calendly.com/api-docs/qvSR3SDdjqX1X-verify-webhook-signatures>):

1. Parsear el header: obtener `t` (timestamp) y `v1` (signature).
2. Construir el string firmado: `${t}.${rawBody}` (concatenación literal con punto).
3. Calcular HMAC-SHA256 con `CALENDLY_WEBHOOK_SIGNING_KEY` como clave.
4. Comparar con `v1` usando comparación time-constant (`crypto.timingSafeEqual`).
5. Rechazar si `Date.now()/1000 - t > 300` (5 min de ventana anti-replay).

Crear helper en `lib/calendly-signature.ts`:

```ts
import crypto from 'node:crypto'

export function verifyCalendlySignature(rawBody: string, header: string, signingKey: string): boolean {
  if (!header) return false

  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')))
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  // Anti-replay: rechazar si es mayor a 5 min
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (age > 300) return false

  const payload = `${timestamp}.${rawBody}`
  const expected = crypto.createHmac('sha256', signingKey).update(payload).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
```

**CRÍTICO**: leer el body con `request.text()`, NO con `request.json()`, para que la firma se calcule sobre el JSON raw exacto que envió Calendly. Parsear a JSON después.

## 5. Payload de Calendly

Calendly v2 envía un JSON como este para `invitee.created`:

```json
{
  "created_at": "2026-04-22T18:42:00Z",
  "created_by": "https://api.calendly.com/users/AAAAAAAAAAAA",
  "event": "invitee.created",
  "payload": {
    "cancel_url": "https://calendly.com/cancellations/XXXXX",
    "created_at": "2026-04-22T18:42:00Z",
    "email": "test@example.com",
    "first_name": "Eneko",
    "last_name": "Izquierdo",
    "name": "Eneko Izquierdo",
    "questions_and_answers": [
      { "question": "¿Qué tipo de centro tienes y dónde está ubicado?", "answer": "Gimnasio premium en Algorta", "position": 0 },
      { "question": "¿Cuántos socios activos tienes ahora?", "answer": "280", "position": 1 },
      { "question": "¿Cuál es tu principal reto ahora?", "answer": "Captar altas nuevas", "position": 2 }
    ],
    "reschedule_url": "https://calendly.com/reschedulings/YYYYY",
    "rescheduled": false,
    "scheduled_event": {
      "created_at": "2026-04-22T18:42:00Z",
      "end_time": "2026-04-24T10:30:00Z",
      "event_type": "https://api.calendly.com/event_types/ZZZZZ",
      "location": { "join_url": "https://meet.google.com/abc-defg-hij", "type": "google_conference" },
      "name": "Auditoría M&T Consulting",
      "start_time": "2026-04-24T10:00:00Z",
      "status": "active",
      "updated_at": "2026-04-22T18:42:00Z",
      "uri": "https://api.calendly.com/scheduled_events/WWWWW"
    },
    "status": "active",
    "text_reminder_number": null,
    "timezone": "Europe/Madrid",
    "tracking": {
      "utm_source": null,
      "utm_medium": null,
      "utm_campaign": null,
      "utm_content": null,
      "utm_term": null,
      "salesforce_uuid": null
    },
    "uri": "https://api.calendly.com/scheduled_events/WWWWW/invitees/VVVVV"
  }
}
```

Campos relevantes para el CRM:
- `payload.email` → lead lookup
- `payload.name` (y `first_name`, `last_name`) → enriquecimiento
- `payload.questions_and_answers[]` → contexto setter
- `payload.scheduled_event.start_time` / `end_time` → fecha_hora y duracion de la cita
- `payload.scheduled_event.location.join_url` → gcal_meet_link (si es google_conference)
- `payload.scheduled_event.uri` → guardar como `calendly_event_uri` para dedupe e idempotencia
- `payload.created_by` → Calendly user URI del dueño del evento → **resolución tenant**
- `payload.tracking.utm_*` → propagación UTM si viniera de campaña Meta (el widget soporta UTMs via querystring)

## 6. Resolución de tenant — añadir columna a `tenants`

Actualmente el `tenant_id` viene explícito en el body del webhook `/lead`. En Calendly no podemos inyectar eso — **resolvemos por el dueño del evento en Calendly**.

### Migración Supabase

Crear con `supabase migration new add_calendly_user_uri_to_tenants` y contenido:

```sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS calendly_user_uri TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_calendly_user_uri
  ON tenants (calendly_user_uri)
  WHERE calendly_user_uri IS NOT NULL;

COMMENT ON COLUMN tenants.calendly_user_uri IS
  'Calendly user URI completo (ej: https://api.calendly.com/users/XXXX) del dueño de los eventos. Se usa para resolver tenant en el webhook /api/webhooks/calendly.';
```

### Configuración por tenant (M&T de inicio)

Tras la migración, hacer una vez desde SQL editor de Supabase:

```sql
UPDATE tenants
   SET calendly_user_uri = 'https://api.calendly.com/users/<USER_URI_DE_MT>'
 WHERE id = '<tenant_id_de_mt>';
```

El `<USER_URI_DE_MT>` lo saca Eneko de Calendly con:
```bash
curl https://api.calendly.com/users/me -H "Authorization: Bearer <CALENDLY_PAT>"
```

Futuro: UI en admin panel para configurar `calendly_user_uri` por tenant sin SQL.

### Lógica en el webhook

```ts
const { data: tenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('calendly_user_uri', payload.created_by)
  .single()

if (!tenant) {
  // Log + devolver 200 para que Calendly no reintente (es config-missing, no error)
  console.warn('[calendly-webhook] Tenant no encontrado para', payload.created_by)
  return NextResponse.json({ success: true, ignored: 'tenant_not_configured' })
}
const tenant_id = tenant.id
```

## 7. Matching del lead y actualización

### Estrategia de matching

1. **Primario**: `email` + `tenant_id` — case-insensitive, trim.
2. **Fallback**: no hay. Si no se encuentra, **crear lead nuevo** con los datos de Calendly (caso: alguien comparte el link de Calendly directamente sin pasar por la landing).

### Código

```ts
const email = payload.payload.email?.toLowerCase().trim()
const nombre = payload.payload.name?.trim() || 'Sin nombre'
const eventUri = payload.payload.scheduled_event.uri

// Idempotencia: si ya existe una cita con este calendly_event_uri, no duplicar
const { data: existingCita } = await supabase
  .from('citas')
  .select('id, lead_id')
  .eq('calendly_event_uri', eventUri)
  .single()

if (existingCita) {
  return NextResponse.json({ success: true, ignored: 'already_processed' })
}

// Buscar lead
let { data: lead } = await supabase
  .from('leads')
  .select('id, fase, campos_extra')
  .eq('tenant_id', tenant_id)
  .ilike('email', email)
  .maybeSingle()

if (!lead) {
  // Lead no existe (accedieron a Calendly sin pasar por landing): crearlo
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert({
      tenant_id,
      nombre,
      email,
      telefono: '', // Calendly no pide teléfono por defecto; si se añade custom Q, mapear aquí
      fase: 'reunion',
      origen: 'calendly_direct',
      notas: 'Lead creado desde webhook Calendly (sin previo form en landing).',
      campos_extra: { calendly_qa: payload.payload.questions_and_answers },
    })
    .select('id')
    .single()
  if (error) throw error
  lead = newLead
} else {
  // Lead ya existe: mover fase y enriquecer campos_extra
  const enriched = {
    ...(lead.campos_extra || {}),
    calendly_qa: payload.payload.questions_and_answers,
    calendly_scheduled_at: payload.payload.scheduled_event.start_time,
    calendly_event_uri: eventUri,
  }
  await supabase
    .from('leads')
    .update({ fase: 'reunion', campos_extra: enriched })
    .eq('id', lead.id)
}

// Crear cita
const startTime = new Date(payload.payload.scheduled_event.start_time)
const endTime = new Date(payload.payload.scheduled_event.end_time)
const durationMin = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

await supabase.from('citas').insert({
  tenant_id,
  lead_id: lead.id,
  fecha: startTime.toISOString().slice(0, 10),         // 'YYYY-MM-DD'
  hora: startTime.toISOString().slice(11, 16),          // 'HH:MM'
  fecha_hora: startTime.toISOString(),
  duracion_minutos: durationMin,
  estado: 'agendada',
  origen: 'calendly',
  gcal_event_id: null, // Calendly gestiona el Google Meet aparte
  gcal_meet_link: payload.payload.scheduled_event.location?.join_url || null,
  calendly_event_uri: eventUri, // columna nueva, ver migración
})
```

### Migración para `citas.calendly_event_uri`

```sql
-- supabase migration new add_calendly_event_uri_to_citas
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS calendly_event_uri TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_calendly_event_uri
  ON citas (calendly_event_uri)
  WHERE calendly_event_uri IS NOT NULL;

COMMENT ON COLUMN citas.calendly_event_uri IS
  'URI del scheduled_event en Calendly. Usado para idempotencia del webhook y link de cancelación/reschedule.';
```

## 8. Handler de `invitee.canceled`

```ts
async function handleCanceled(supabase, payload) {
  const eventUri = payload.payload.scheduled_event.uri

  const { data: cita } = await supabase
    .from('citas')
    .select('id, lead_id, tenant_id')
    .eq('calendly_event_uri', eventUri)
    .single()

  if (!cita) return NextResponse.json({ success: true, ignored: 'cita_not_found' })

  await supabase
    .from('citas')
    .update({ estado: 'cancelada' })
    .eq('id', cita.id)

  // Lead vuelve a 'contactado' (no a 'nuevo': ya hubo contacto previo)
  await supabase
    .from('leads')
    .update({ fase: 'contactado' })
    .eq('id', cita.lead_id)

  return NextResponse.json({ success: true })
}
```

Alternativa: no mover fase automáticamente y notificar al setter en WhatsApp para que decida. Decidir con Eneko.

## 9. Preguntas custom de Calendly → visualización en el CRM

Las Q&A viven en `leads.campos_extra.calendly_qa` (JSON). Para que el setter las vea en el CRM:

- `components/LeadDetail.tsx` ya renderiza `campos_extra` (verificar). Si no, añadir bloque "Respuestas Calendly" que muestre cada pregunta con su respuesta.
- Proponer UX: caja tipo quote con tipografía mono, título "Contexto de la reserva".

## 10. Lead-source tagging (para futura feature de "fuentes de leads")

Eneko tiene planificada una vista donde se vea de dónde vienen los leads (Instagram, WhatsApp, landing, Calendly directo, etc.). Este webhook ya deja preparados los valores:

- Lead existente que agenda → se mantiene `origen` original (`web`), pero `campos_extra.scheduled_via = 'calendly'`.
- Lead nuevo creado desde Calendly directo → `origen = 'calendly_direct'`.

Valores canónicos propuestos para `origen` (a consensuar):
- `web` — form en landing
- `whatsapp` — entrada manual o inbound WA
- `instagram` — DM IG
- `calendly_direct` — reserva Calendly sin form previo
- `manual` — creación desde CRM

## 11. Variables de entorno nuevas

Añadir a Vercel (production + preview) y a `.env.local`:

```
CALENDLY_WEBHOOK_SIGNING_KEY=<lo proporciona Calendly al crear el webhook>
CALENDLY_PAT=<personal access token, si se usa API para enriquecer datos adicionales — opcional>
```

Actualizar `.env.example` con ambos.

## 12. Configuración en Calendly (lo hace Eneko)

1. Calendly → **Integrations** → **Webhooks** (o vía API `POST /webhook_subscriptions`).
2. URL: `https://myt-crm-app.vercel.app/api/webhooks/calendly` (producción).
3. Eventos a suscribir: `invitee.created`, `invitee.canceled`.
4. Scope: `user` (solo los eventos de este user) o `organization` (todos, si hay más usuarios Calendly en M&T).
5. Copiar el `signing_key` que devuelve Calendly y guardarlo en Vercel env var `CALENDLY_WEBHOOK_SIGNING_KEY`.
6. Para preview/desarrollo, se puede crear un webhook adicional apuntando a ngrok o al preview URL de Vercel.

Comando API de alternativa (si Calendly no lo deja vía UI en el plan):
```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $CALENDLY_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myt-crm-app.vercel.app/api/webhooks/calendly",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "<org_uri>",
    "user": "<user_uri>",
    "scope": "user"
  }'
```

## 13. Test / verificación

### Local con ngrok
```bash
ngrok http 3000
# Calendly → crear webhook apuntando a https://<ngrok>.ngrok.io/api/webhooks/calendly
# Agendar cita de prueba en el Calendly → verificar logs en el dev server
```

### Producción
1. Deploy del endpoint en Vercel.
2. Agendar cita de prueba desde la landing (enekotest@...).
3. Verificar en Supabase:
   - `leads.fase = 'reunion'`
   - `leads.campos_extra.calendly_qa` populado
   - Nueva row en `citas` con `origen='calendly'`, `fecha_hora` correcto
4. Cancelar la cita desde Calendly → verificar `citas.estado='cancelada'`.

### Tests automatizados
Seguir convención del repo (regla #8 del CLAUDE.md). Test suite sugerida en `app/api/webhooks/calendly/__tests__/route.test.ts`:
- Firma válida → 200 + side-effects
- Firma inválida → 401
- Timestamp viejo (>5min) → 401
- Lead existente → UPDATE fase + INSERT cita
- Lead inexistente → CREATE lead + INSERT cita
- Evento duplicado (mismo `calendly_event_uri`) → 200 con `ignored: already_processed`
- Cancelación → UPDATE cita estado
- Tenant sin `calendly_user_uri` configurado → 200 con `ignored: tenant_not_configured`

## 14. Checklist de implementación (para ir tachando)

- [ ] Crear `lib/calendly-signature.ts` con `verifyCalendlySignature()`
- [ ] Crear migración `add_calendly_user_uri_to_tenants`
- [ ] Crear migración `add_calendly_event_uri_to_citas`
- [ ] Crear `app/api/webhooks/calendly/route.ts` con POST handler
- [ ] Handlers separados para `invitee.created` y `invitee.canceled`
- [ ] Añadir `CALENDLY_WEBHOOK_SIGNING_KEY` a `.env.example` y Vercel
- [ ] Poblar `tenants.calendly_user_uri` para M&T en Supabase
- [ ] Actualizar `components/LeadDetail.tsx` para mostrar `calendly_qa`
- [ ] Tests en `app/api/webhooks/calendly/__tests__/route.test.ts`
- [ ] Configurar webhook en Calendly (Eneko)
- [ ] Smoke test producción con cita de prueba
- [ ] Actualizar `.claude/docs/integrations.md` — sección Calendly
- [ ] Entrada en `.claude/docs/fixes.md` o `decisions.md` si se toman decisiones de diseño

## 15. Notas de decisión pendientes (para alinear con Eneko antes de implementar)

1. **En cancelación, ¿revertir fase del lead a `contactado` o dejarlo en `reunion` con la cita marcada cancelada?** Propuesta: `contactado`, porque operativamente el setter querrá recuperarlo.
2. **¿Notificar al setter por WhatsApp automáticamente** cuando hay reserva o cancelación? Hoy no, pero es natural extender con un `sendText(...)` al tenant owner.
3. **¿Añadir las Q&A al prompt del agente setter IA** para personalizar los primeros mensajes? Gran valor — marcar como siguiente feature, fuera de scope de este spec.
4. **Pasar UTMs de Calendly → lead**: si la URL del Calendly embebido incluye UTMs, Calendly las reenvía en `payload.tracking`. Enriquecer `campos_extra` con esto si vienen y el lead ya existe pero no tenía UTMs.

---

**Referencias Calendly**:
- API docs: <https://developers.calendly.com/api-docs>
- Webhook payload reference: <https://developers.calendly.com/api-docs/7bbaa8ff9562c-invitee-webhook-payload>
- Firma HMAC: <https://developers.calendly.com/api-docs/qvSR3SDdjqX1X-verify-webhook-signatures>
