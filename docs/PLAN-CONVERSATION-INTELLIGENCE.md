# Plan — Conversation Intelligence multi-tenant

**Proyecto**: M&T CRM (`myt-crm-app`)
**Versión**: 1 (2026-05-16)
**Ubicación en repo**: `docs/PLAN-CONVERSATION-INTELLIGENCE.md`
**Uso con Claude Code**: cada fase es autocontenida. Copia el prompt de la fase que toque a Claude Code; no hace falta que lea las fases siguientes.

---

## Índice

1. [Principios de seguridad](#1-principios-de-seguridad)
2. [Decisiones de producto cerradas](#2-decisiones-de-producto-cerradas)
3. [Mapa de fases](#3-mapa-de-fases)
4. [Stack técnico y env vars](#4-stack-técnico-y-env-vars)
5. [Fase 0 — Schema + feature flag](#5-fase-0--schema--feature-flag)
6. [Fase 1 — Embudo de conversión (SQL puro)](#6-fase-1--embudo-de-conversión-sql-puro)
7. [Fase 2 — Minería de conversaciones con Haiku](#7-fase-2--minería-de-conversaciones-con-haiku)
8. [Fase 3 — Recomendaciones semanales con Sonnet](#8-fase-3--recomendaciones-semanales-con-sonnet)
9. [Fase 4 — Hardening](#9-fase-4--hardening)
10. [Checklist maestro](#10-checklist-maestro)
11. [Rollback de emergencia](#11-rollback-de-emergencia)

---

## 1. Principios de seguridad

Estos siete principios mandan sobre cualquier decisión táctica durante las fases. Si aparece un conflicto, ganan ellos.

1. **Additive-only en el schema.** Columnas y tablas nuevas siempre nullable con default seguro. Nada de renames, nada de drops, nada de `NOT NULL` sin backfill previo. Si la capa de intelligence se desenchufa entera, lo que funciona hoy sigue funcionando mañana.

2. **Feature flag por tenant, default OFF.** Concretamente: `intelligence_enabled` en `configuracion_modulos`. Ningún tenant existente nota el menor cambio hasta que explícitamente se active. Itzalki y AQTIVA no se enteran de nada hasta que tú quieras.

3. **PII anonymization antes de enviar a IA.** Todo texto de conversación pasa por `lib/intelligence/anonymize.ts` antes de llegar a Haiku o Sonnet. Se reemplazan: teléfonos, emails, nombres propios, direcciones, URLs. Los modelos de IA nunca ven datos personales reales.

4. **CRON_SECRET en todos los crons nuevos.** Misma verificación que los crons existentes (`reminder-citas`, `followups`, `auto-learn`). Sin el header correcto, 401.

5. **Zero impact en código existente.** Los webhooks de WhatsApp, Instagram, crons de recordatorio, follow-ups, auto-learn, chatbot y Evolution API no se tocan. La capa de intelligence lee datos, nunca escribe en tablas existentes (excepto su propia tabla y `configuracion_modulos` para el flag).

6. **Control de costes de inferencia.** Máximo configurable de conversaciones procesadas por noche por tenant. Modo dry-run que calcula tokens sin llamar a la API. Log de tokens consumidos por ejecución.

7. **Kill switch instantáneo.** `UPDATE configuracion_modulos SET intelligence_enabled = false WHERE tenant_id = '...'` apaga todo para ese tenant en segundos. `UPDATE configuracion_modulos SET intelligence_enabled = false` apaga para todos.

---

## 2. Decisiones de producto cerradas

### 2.1 Ruta `/intelligence`, no `/analytics`

La capa vive en `/intelligence`, no en `/analytics`. Analytics es demasiado genérico y se confunde con el dashboard principal que ya muestra KPIs, funnel y gráficas. Intelligence refleja que hay una capa de IA analizando conversaciones por encima de las métricas crudas.

### 2.2 Visible para TODOS los roles, no solo admin

`/intelligence` es accesible para clientes (rol `client`) y admins. Es un valor añadido directo para el usuario final del CRM: entiende por qué pierde leads, qué objeciones recibe, y recibe recomendaciones accionables. No tiene sentido esconderlo en un panel de admin.

### 2.3 Definición de "conversación cerrada"

Una conversación se considera cerrada (y por tanto elegible para minería) cuando CUALQUIERA de estas condiciones se cumple:

1. **Lead en estado terminal**: el `estado` del lead corresponde a un `pipeline_estados` con `es_ganado = true` O `es_perdido = true`.
2. **Rechazo confirmado**: `chatbot_activo = false` AND `ultimo_followup_bucket = 'rechazo'` AND `followups_enviados >= 2`.
3. **Silencio prolongado**: no hay nuevas interacciones en 72h (configurable por tenant en el futuro) AND el lead tiene al menos 2 interacciones de tipo mensaje.

Justificación: necesitamos analizar conversaciones completas, no conversaciones en curso. Estos tres criterios cubren los tres modos de finalización: éxito, fracaso explícito y abandono.

### 2.4 Auto-learn continúa separado

El cron `auto-learn` (`app/api/cron/auto-learn/`) ya analiza conversaciones de leads ganados/perdidos y extrae patrones para el agente. La capa de intelligence NO reemplaza ni duplica auto-learn. Son complementarios:

- **auto-learn** → alimenta al agente (mejora sus respuestas futuras). Escribe en `documentos_chatbot`.
- **intelligence** → informa al humano (dashboard de insights y recomendaciones). Escribe en `conversation_insights` y `intelligence_recommendations`.

Ambos leen de `interacciones` pero con fines distintos y escriben en tablas distintas.

### 2.5 Límite de 50 conversaciones por tenant por noche

Haiku procesa máximo 50 conversaciones cerradas por tenant por ejecución nocturna. Configurable vía constante. Prioridad: las más recientes primero. Si un tenant acumula más de 50 conversaciones pendientes, se procesan en noches sucesivas.

Justificación: control de costes. Haiku 4.5 es barato, pero sin límite un tenant con miles de leads podría generar un pico inesperado.

### 2.6 Mínimo 4 mensajes para analizar

Solo se analizan conversaciones con 4 o más interacciones de tipo mensaje (whatsapp_recibido, whatsapp_enviado, whatsapp_respondido, instagram_respondido). Conversaciones triviales (lead envía "hola" y no responde más) no aportan insight.

### 2.7 Anonimización: qué se reemplaza

El módulo `lib/intelligence/anonymize.ts` reemplaza con placeholders:
- Teléfonos → `[TELEFONO]`
- Emails → `[EMAIL]`
- Nombres propios (detectados por patrones y contexto) → `[NOMBRE]`
- Direcciones postales → `[DIRECCION]`
- URLs → `[URL]`

Se usa regex para teléfonos/emails/URLs. Para nombres, se usa el campo `lead.nombre` / `lead.nome` para hacer un replace exacto del nombre del lead en el texto.

### 2.8 Recomendaciones semanales, últimas 12 semanas

Sonnet genera 3 recomendaciones accionables por tenant cada lunes. Se almacenan las últimas 12 semanas (rotación automática al insertar). El dashboard muestra la última semana con opción de ver historial.

### 2.9 Pasos del embudo mapeados a datos reales

| Paso del embudo | Criterio SQL |
|---|---|
| Mensaje recibido | Lead con >= 1 interacción tipo `whatsapp_recibido` o lead existe (proxy: formulario landing) |
| Lead respondió | Lead con >= 1 interacción tipo `whatsapp_recibido` (mensaje real del lead, no formulario) |
| Servicio identificado | `lead_score >= 30` OR `estado` NOT IN estados iniciales (`nuevo`) |
| Cita propuesta | Existe al menos 1 fila en `citas` con ese `lead_id` |
| Cita agendada | Cita con `estado` IN (`confirmada`, `completada`, `no_show`) |
| Cita asistida | Cita con `estado = 'completada'` |
| Cliente | Lead con `estado` en `pipeline_estados` donde `es_ganado = true` |

Estos pasos son secuenciales y cada uno es subconjunto del anterior. Se calculan con SQL puro, sin IA.

---

## 3. Mapa de fases

| Fase | Qué hace | Ejecuta | Cuándo |
|------|----------|---------|--------|
| **0** | Migración schema + feature flag | Claude Code | Primero |
| **1** | Embudo de conversión con SQL puro, ruta `/intelligence` | Claude Code | Después de Fase 0 mergeada |
| **2** | Minería de conversaciones con Haiku + anonymization | Claude Code | Después de Fase 1 mergeada |
| **3** | Recomendaciones semanales con Sonnet | Claude Code | Después de Fase 2 estable 1 semana |
| **4** | Hardening: costes, observabilidad, admin | Claude Code | Cuando haya tiempo |

**Puntos de control (gates)**: después de cada fase, antes de arrancar la siguiente, hay que verificar los criterios de aceptación. Entre Fase 2 y 3, dejar al menos 1 semana de datos de insights acumulados para que Sonnet tenga material.

---

## 4. Stack técnico y env vars

**Stack**: SQL puro para embudo (Fase 1), Claude Haiku 4.5 para minería de conversaciones (Fase 2), Claude Sonnet 4.6 para recomendaciones (Fase 3). Vercel AI SDK para las llamadas. recharts para visualización (consistente con dashboard existente).

**Env vars existentes que se reusan** (ya están en Vercel):

| Nombre | Fase | Ya existe |
|--------|------|-----------|
| `ANTHROPIC_API_KEY` | 2, 3 | Sí (usado por chatbot) |
| `CRON_SECRET` | 2, 3 | Sí (usado por crons existentes) |

**No se necesitan env vars nuevas.** La capa de intelligence usa la misma API key de Anthropic que el chatbot y los mismos secretos de cron. Esto simplifica la gestión.

---

## 5. Fase 0 — Schema + feature flag

**Quién**: Claude Code.
**Objetivo**: crear las tablas y el feature flag en BD. No hay código de aplicación. Si esto se mergea, el sistema en producción es idéntico al actual.
**Zonas intocables**: todo el código de aplicación. Solo se toca Supabase.

### Prompt para Claude Code

````
# Tarea: Fase 0 Conversation Intelligence — schema + feature flag

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/architecture.md, conventions.md, decisions.md
- docs/PLAN-CONVERSATION-INTELLIGENCE.md (Fase 0 completa)

## Objetivo

Migración de schema sin código de aplicación. No debe cambiar el comportamiento
del sistema para ningún tenant.

## Deliverables

### 1. Migración Supabase

Usa `supabase migration new conversation_intelligence_tables`. Contenido:

```sql
-- Feature flag en configuracion_modulos
ALTER TABLE public.configuracion_modulos
  ADD COLUMN IF NOT EXISTS intelligence_enabled boolean NOT NULL DEFAULT false;

-- Tabla de insights extraídos por Haiku de conversaciones cerradas
CREATE TABLE public.conversation_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  -- Datos de la conversación analizada
  canal text NOT NULL CHECK (canal IN ('whatsapp', 'instagram', 'mixed')),
  mensajes_analizados integer NOT NULL,
  fecha_primera_interaccion timestamptz NOT NULL,
  fecha_ultima_interaccion timestamptz NOT NULL,
  -- Resultados del análisis Haiku
  resultado text NOT NULL CHECK (resultado IN ('ganado', 'perdido', 'abandonado')),
  temas jsonb NOT NULL DEFAULT '[]'::jsonb,         -- ["precio", "ubicación", "horarios"]
  objeciones jsonb NOT NULL DEFAULT '[]'::jsonb,     -- ["muy caro", "no tiene horario de tarde"]
  sentimiento text CHECK (sentimiento IN ('positivo', 'neutro', 'negativo', 'mixto')),
  punto_abandono text,                                -- descripción del punto donde el lead dejó de responder
  resumen text,                                       -- resumen breve de la conversación
  tokens_input integer,                               -- control de costes
  tokens_output integer,
  modelo_usado text,                                  -- 'claude-haiku-4-5' etc.
  duracion_ms integer,
  -- Metadata
  processed_at timestamptz NOT NULL DEFAULT now(),
  raw_response jsonb,                                 -- respuesta completa del modelo (debug)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ci_tenant_created ON public.conversation_insights(tenant_id, created_at DESC);
CREATE INDEX idx_ci_lead ON public.conversation_insights(lead_id);
CREATE INDEX idx_ci_tenant_resultado ON public.conversation_insights(tenant_id, resultado);
CREATE UNIQUE INDEX idx_ci_tenant_lead_unique ON public.conversation_insights(tenant_id, lead_id);

ALTER TABLE public.conversation_insights ENABLE ROW LEVEL SECURITY;

-- Tabla de recomendaciones semanales generadas por Sonnet
CREATE TABLE public.intelligence_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  semana_iso text NOT NULL,                           -- '2026-W20' formato ISO week
  recomendaciones jsonb NOT NULL DEFAULT '[]'::jsonb, -- array de {titulo, descripcion, prioridad, categoria}
  kpis_semana jsonb,                                  -- snapshot de KPIs usados para generar
  insights_usados integer,                            -- cuántos insights se agregaron
  tokens_input integer,
  tokens_output integer,
  modelo_usado text,
  duracion_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ir_tenant_semana ON public.intelligence_recommendations(tenant_id, semana_iso DESC);
CREATE UNIQUE INDEX idx_ir_tenant_semana_unique ON public.intelligence_recommendations(tenant_id, semana_iso);

ALTER TABLE public.intelligence_recommendations ENABLE ROW LEVEL SECURITY;
```

**RLS**: replica el patrón de las tablas existentes de config por tenant.
- SELECT: admin del tenant ve solo las suyas. Super-admin ve todas.
- INSERT/UPDATE/DELETE: solo service_role.

Mira las RLS policies de `configuracion_modulos` o `evolution_config` y usa el
mismo patrón exacto.

**UNIQUE index en conversation_insights**: `(tenant_id, lead_id)` garantiza que
un lead solo se analiza una vez. Si se necesita re-analizar (p.ej. la
conversación continuó), se hace UPSERT.

**Verificar antes de aplicar**: ejecuta mentalmente que ninguna query existente
se rompe. La columna nueva en `configuracion_modulos` tiene default `false`, las
tablas nuevas son independientes.

### 2. Documentación

- Entrada en `.claude/docs/decisions.md`: "Conversation Intelligence: tablas
  separadas de auto-learn" — decisión de no reusar `documentos_chatbot` ni
  `auto_learn_ejecuciones`, justificación (propósitos distintos: auto-learn
  alimenta al agente, intelligence informa al humano).
- Entrada en `.claude/docs/architecture.md`: sección nueva "Conversation
  Intelligence" con las 2 tablas nuevas y el flag.
- Sesión en `.claude/sessions/2026-XX-XX-conversation-intelligence-fase0.md`.

## Restricciones

- NO tocar código de aplicación. Solo migración SQL.
- NO tocar: webhooks, crons, chatbot, evolution, instagram, auto-learn.
- NO commit ni push hasta mi confirmación.

## Aceptación

- [ ] Migración aplicable sin errores.
- [ ] `npm run build` pasa sin nuevos warnings.
- [ ] `npm run lint` verde.
- [ ] Tests existentes siguen pasando.
- [ ] `configuracion_modulos` tiene la columna `intelligence_enabled` con default false.
- [ ] Tablas `conversation_insights` e `intelligence_recommendations` creadas con
      índices y RLS.
- [ ] Ninguna tabla ni query existente afectada.

## Rollback

```sql
-- Down migration
ALTER TABLE public.configuracion_modulos
  DROP COLUMN IF EXISTS intelligence_enabled;

DROP TABLE IF EXISTS public.intelligence_recommendations CASCADE;
DROP TABLE IF EXISTS public.conversation_insights CASCADE;
```
````

---

## 6. Fase 1 — Embudo de conversión (SQL puro)

**Quién**: Claude Code.
**Precondición**: Fase 0 mergeada a develop.
**Objetivo**: ruta `/intelligence` con visualización de embudo de conversión calculado con SQL puro. Sin IA, sin crons, sin procesamiento nocturno. Puro conteo de leads por paso del funnel.
**Zonas intocables**: `app/api/webhooks/`, `app/api/cron/`, `lib/chatbot/`, `lib/evolution.ts`, `lib/instagram.ts`, `lib/messaging.ts`.

### Prompt para Claude Code

````
# Tarea: Fase 1 Conversation Intelligence — embudo de conversión SQL puro

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/architecture.md, conventions.md, decisions.md
- docs/PLAN-CONVERSATION-INTELLIGENCE.md (Fase 1 completa)
- La sesión de Fase 0
- `app/(dashboard)/page.tsx` (dashboard existente, para ver patrones de recharts,
  filtros de fecha y queries a Supabase)

## Objetivo

Ruta `/intelligence` con embudo de conversión visual. Todo calculado con SQL,
sin IA. Si el feature flag `intelligence_enabled` está OFF para el tenant,
mostrar un estado vacío con explicación y botón de contacto (no un 403).

## Deliverables

### 1. API Route para datos del embudo

`app/api/intelligence/funnel/route.ts`:

- GET con query params: `dateFrom`, `dateTo`, `canal` (opcional: whatsapp,
  instagram, all), `utm_source` (opcional), `utm_campaign` (opcional),
  `landing_page` (opcional).
- Requiere sesión Supabase. Lee `tenant_id` del usuario.
- Verifica `intelligence_enabled` en `configuracion_modulos`. Si false, retorna
  `{ enabled: false }` con 200 (no error).
- Query SQL que calcula los 7 pasos del embudo para el tenant y filtros dados:

```sql
-- Paso 1: Mensaje recibido (leads con al menos 1 interacción recibida o lead existe)
-- Se cuenta el total de leads creados en el rango de fechas
SELECT COUNT(DISTINCT l.id) as mensaje_recibido
FROM leads l
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  AND ($canal IS NULL OR l.canal = $canal)
  AND ($utm_source IS NULL OR l.utm_source = $utm_source)
  AND ($utm_campaign IS NULL OR l.utm_campaign = $utm_campaign)
  AND ($landing_page IS NULL OR l.landing_page = $landing_page);

-- Paso 2: Lead respondió (tiene al menos 1 whatsapp_recibido real)
SELECT COUNT(DISTINCT l.id) as lead_respondio
FROM leads l
INNER JOIN interacciones i ON i.lead_id = l.id
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  AND i.tipo = 'whatsapp_recibido'
  AND ($canal IS NULL OR l.canal = $canal)
  -- ...mismos filtros UTM/landing

-- Paso 3: Servicio identificado
-- lead_score >= 30 OR estado != 'nuevo'
SELECT COUNT(DISTINCT l.id) as servicio_identificado
FROM leads l
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  AND (l.lead_score >= 30 OR l.estado != 'nuevo')
  -- ...mismos filtros

-- Paso 4: Cita propuesta (existe cita para el lead)
SELECT COUNT(DISTINCT l.id) as cita_propuesta
FROM leads l
INNER JOIN citas c ON c.lead_id = l.id
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  -- ...mismos filtros

-- Paso 5: Cita agendada (cita confirmada/completada/no_show)
SELECT COUNT(DISTINCT l.id) as cita_agendada
FROM leads l
INNER JOIN citas c ON c.lead_id = l.id
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  AND c.estado IN ('confirmada', 'completada', 'no_show')
  -- ...mismos filtros

-- Paso 6: Cita asistida
SELECT COUNT(DISTINCT l.id) as cita_asistida
FROM leads l
INNER JOIN citas c ON c.lead_id = l.id
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  AND c.estado = 'completada'
  -- ...mismos filtros

-- Paso 7: Cliente (estado en pipeline_estados con es_ganado=true)
SELECT COUNT(DISTINCT l.id) as cliente
FROM leads l
INNER JOIN pipeline_estados pe ON pe.clave = l.estado AND pe.tenant_id = l.tenant_id
WHERE l.tenant_id = $tenant_id
  AND l.created_at BETWEEN $dateFrom AND $dateTo
  AND pe.es_ganado = true
  -- ...mismos filtros
```

Idealmente, combina todo en una sola query con subqueries o CTEs para
eficiencia. Retorna:

```json
{
  "enabled": true,
  "funnel": [
    { "paso": "Mensaje recibido", "count": 120, "porcentaje": 100 },
    { "paso": "Lead respondió", "count": 85, "porcentaje": 70.8 },
    { "paso": "Servicio identificado", "count": 62, "porcentaje": 51.7 },
    { "paso": "Cita propuesta", "count": 30, "porcentaje": 25.0 },
    { "paso": "Cita agendada", "count": 22, "porcentaje": 18.3 },
    { "paso": "Cita asistida", "count": 15, "porcentaje": 12.5 },
    { "paso": "Cliente", "count": 8, "porcentaje": 6.7 }
  ],
  "filters": { "dateFrom": "...", "dateTo": "...", "canal": null, ... },
  "totalLeads": 120
}
```

Los porcentajes se calculan sobre el paso 1 (total de leads en el rango).

### 2. API Route para datos por canal/origen

`app/api/intelligence/breakdown/route.ts`:

- GET con los mismos query params de fecha.
- Retorna el mismo embudo pero desglosado por canal:

```json
{
  "enabled": true,
  "byCanal": {
    "whatsapp": [/* 7 pasos */],
    "instagram": [/* 7 pasos */],
    "landing": [/* 7 pasos */]
  },
  "byUtmSource": {
    "meta": [/* 7 pasos */],
    "google": [/* 7 pasos */],
    "organic": [/* 7 pasos */]
  }
}
```

### 3. Página `/intelligence`

`app/(dashboard)/intelligence/page.tsx` como client component TypeScript.

**Layout**:
- Título "Intelligence" con badge "Beta".
- Barra de filtros: selector de rango de fechas (misma lógica que dashboard:
  esta semana, mes, trimestre, año, todo, personalizado), selector de canal
  (Todos, WhatsApp, Instagram), selector de UTM source (dinámico según datos),
  selector de campaña (dinámico según datos).
- **Si `intelligence_enabled = false`**: estado vacío con icono, texto
  "Conversation Intelligence no está activado para tu cuenta. Contacta con
  tu administrador para activarlo." No mostrar error, no bloquear la ruta.

**Sección 1: Embudo de conversión**
- Gráfica de embudo usando recharts (BarChart horizontal o FunnelChart custom).
  Consistente con el estilo del dashboard existente (colores, fuentes, layout).
- Cada barra muestra: nombre del paso, conteo absoluto, porcentaje del total,
  y tasa de conversión paso-a-paso (ej. "70.8% del total, 85% del paso anterior").
- Debajo del gráfico: cards con las tasas de conversión clave:
  - "Tasa de respuesta": lead_respondio / mensaje_recibido
  - "Tasa de agendamiento": cita_agendada / mensaje_recibido
  - "Tasa de cierre": cliente / mensaje_recibido
  - "Asistencia a citas": cita_asistida / cita_agendada

**Sección 2: Comparativa por canal**
- Gráfica de barras agrupadas (recharts BarChart) comparando los pasos del
  embudo entre canales (WhatsApp vs Instagram vs Landing).
- Solo se muestra si hay datos de más de un canal.

**Sección 3: Placeholder para Insights (Fase 2)**
- Card con icono de candado y texto "Análisis de conversaciones con IA —
  disponible próximamente". Se reemplazará en Fase 2.

**Sección 4: Placeholder para Recomendaciones (Fase 3)**
- Card con icono de candado y texto "Recomendaciones semanales con IA —
  disponible próximamente". Se reemplazará en Fase 3.

### 4. Navegación

En `components/Sidebar.tsx`, añadir al array `NAV_ITEMS` después de "Pipeline"
o en posición lógica:
```ts
{ id: "intelligence", href: "/intelligence", icon: "📊", label: "Intelligence" }
```

### 5. Documentación

- Actualizar `.claude/docs/architecture.md`: sección Intelligence con la ruta
  y los endpoints.
- Sesión `.claude/sessions/2026-XX-XX-conversation-intelligence-fase1.md`.

## Restricciones

- NO tocar: webhooks, crons, chatbot, evolution, instagram, auto-learn.
- NO añadir dependencias npm nuevas. Usar recharts (ya instalado).
- NO llamadas a modelos de IA. Todo es SQL puro en esta fase.
- NO commit ni push hasta mi confirmación.
- Reusar patrones del dashboard existente: estilo de cards, colores, layout,
  date range picker, loading states, error states.

## Aceptación

- [ ] `npm run build` pasa sin nuevos warnings.
- [ ] `npm run lint` verde.
- [ ] Tests existentes siguen pasando.
- [ ] Al navegar a `/intelligence` se ve el embudo con datos reales del tenant.
- [ ] Filtros de fecha, canal y UTM funcionan y actualizan el gráfico.
- [ ] Con `intelligence_enabled = false`, se muestra estado vacío sin error.
- [ ] Con `intelligence_enabled = true`, se muestran los datos correctamente.
- [ ] Las secciones placeholder de Fase 2 y 3 están visibles.
- [ ] Item "Intelligence" en sidebar.
- [ ] El dashboard principal (`/`) sigue funcionando sin cambios.

## Test manual post-deploy

1. En preview, loguear como admin de M&T.
2. Verificar que el dashboard principal sigue igual.
3. Ir a `/intelligence` → ver el embudo.
4. Cambiar filtro de fecha → datos se actualizan.
5. Filtrar por canal WhatsApp → solo datos de WhatsApp.
6. Revisar Sentry → no debe haber errores nuevos.
7. Loguear como otro tenant sin flag → ver estado vacío amigable.

## Rollback

```sql
-- No hay cambios de schema en esta fase (ya se hicieron en Fase 0).
-- El rollback es solo revertir el código:
```
`git revert` del merge. La ruta `/intelligence` desaparece. El sidebar vuelve
al estado anterior. Sin impacto en BD.
````

---

## 7. Fase 2 — Minería de conversaciones con Haiku

**Quién**: Claude Code.
**Precondición**: Fase 1 mergeada a develop. Embudo funcionando con datos reales.
**Objetivo**: cron nocturno que procesa conversaciones cerradas con Haiku 4.5, extrayendo temas, objeciones, sentimiento y punto de abandono. Dashboard en `/intelligence` mostrando los insights agregados.
**Zonas intocables**: `app/api/webhooks/`, `app/api/cron/auto-learn/`, `app/api/cron/followups/`, `app/api/cron/reminder-citas/`, `lib/chatbot/`, `lib/evolution.ts`, `lib/instagram.ts`, `lib/messaging.ts`.

### Prompt para Claude Code

````
# Tarea: Fase 2 Conversation Intelligence — minería de conversaciones con Haiku

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/architecture.md, conventions.md, decisions.md, fixes.md
- docs/PLAN-CONVERSATION-INTELLIGENCE.md (Fase 2 completa)
- La sesión de Fase 1
- `app/api/cron/auto-learn/route.ts` (para entender el patrón del cron existente
  y NO duplicar su lógica)

## Principio rector

Esta fase NO toca el cron de auto-learn ni ninguna otra pieza existente. Lee
datos de `interacciones` y `leads`, escribe SOLO en `conversation_insights`.
Si el cron falla, el CRM sigue funcionando exactamente igual.

## Deliverables

### 1. Módulo de anonimización

`lib/intelligence/anonymize.ts`:

```ts
export interface AnonymizeResult {
  text: string
  replacements: Array<{
    type: 'telefono' | 'email' | 'nombre' | 'direccion' | 'url'
    original: string
    placeholder: string
  }>
}

export function anonymize(
  text: string,
  knownNames?: string[]
): AnonymizeResult
```

Reglas de reemplazo:
- Teléfonos (españoles e internacionales): regex para +34, 6XX, 9XX, formatos
  con/sin espacios/guiones → `[TELEFONO]`
- Emails: regex estándar → `[EMAIL]`
- URLs: regex para http(s)://... y www. → `[URL]`
- Nombres: si se pasan `knownNames`, hacer replace case-insensitive de cada
  uno → `[NOMBRE]`. Útil para reemplazar el nombre del lead.
- Direcciones: patrón "Calle/C./ Av./ Avenida + texto" → `[DIRECCION]`
  (best-effort, no es crítico si alguna se escapa).

Si hay varios teléfonos, usar `[TELEFONO_1]`, `[TELEFONO_2]`, etc.

**Tests**: `lib/intelligence/__tests__/anonymize.test.ts`:
- Texto con teléfono español (+34 612 345 678) → reemplazado.
- Texto con email → reemplazado.
- Texto con nombre del lead → reemplazado.
- Texto con URL → reemplazado.
- Texto sin PII → devuelto sin cambios.
- Texto con múltiples tipos de PII → todos reemplazados.
- `knownNames` vacío → no rompe.

### 2. Cron nocturno de minería

`app/api/cron/intelligence-mining/route.ts`:

- Schedule: `30 3 * * *` (3:30 AM UTC, diario — 30 min después de auto-learn
  para no solapar).
- Verificar `CRON_SECRET` en header. Si no, 401.
- Para cada tenant con `intelligence_enabled = true`:
  1. Obtener leads con conversaciones "cerradas" (ver criterios en decisión 2.3)
     que NO tengan ya un registro en `conversation_insights` para ese lead_id.
  2. Filtrar: solo leads con >= 4 interacciones de tipo mensaje.
  3. Ordenar por `created_at` DESC (más recientes primero).
  4. Tomar máximo 50 (configurable: `MAX_CONVERSATIONS_PER_TENANT = 50`).
  5. Para cada lead:
     a. Obtener todas las interacciones ordenadas por `created_at ASC`.
     b. Reconstruir la conversación como texto (formato "Lead: ..." / "Agente: ..."
        según el tipo de interacción).
     c. Determinar canal: si hay mezcla de whatsapp_ e instagram_, canal = 'mixed'.
        Si solo whatsapp_, canal = 'whatsapp'. Si solo instagram_, canal = 'instagram'.
     d. Anonimizar con `anonymize(texto, [lead.nombre || lead.nome])`.
     e. Determinar resultado: consultar `pipeline_estados` del tenant para ver si
        el estado actual del lead es `es_ganado` (→ 'ganado'), `es_perdido`
        (→ 'perdido'), o ninguno (→ 'abandonado').
     f. Enviar a Haiku 4.5 con el prompt de extracción (ver abajo).
     g. Parsear respuesta JSON del modelo.
     h. UPSERT en `conversation_insights` (ON CONFLICT tenant_id, lead_id).
  6. Log de resumen: tenant, total procesados, ok, errores, tokens totales.

**Modo dry-run**: si se pasa query param `?dryRun=true`:
- Hace todo igual EXCEPTO llamar a Haiku.
- Calcula tokens estimados con un ratio simple (4 chars ≈ 1 token).
- Retorna resumen con tokens estimados y coste aproximado.
- NO escribe en BD.

**Prompt para Haiku** (en el código, no hardcodeado — usar constante exportable):

```
Analiza la siguiente conversación entre un agente de ventas (IA) y un lead
potencial. La conversación terminó con resultado: {{resultado}}.

Extrae la siguiente información en formato JSON:

{
  "temas": ["tema1", "tema2"],       // max 5 temas principales discutidos
  "objeciones": ["objeción1"],       // max 5 objeciones o preocupaciones del lead
  "sentimiento": "positivo|neutro|negativo|mixto",
  "punto_abandono": "descripción breve del momento donde la conversación se
    estancó o el lead dejó de responder (null si fue positiva hasta el final)",
  "resumen": "resumen de 1-2 frases de la conversación"
}

Responde SOLO con el JSON, sin texto adicional.

Conversación:
{{conversacion_anonimizada}}
```

- Usar Vercel AI SDK para la llamada (`generateText` o `generateObject` con
  schema zod).
- Modelo: `claude-haiku-4-5-20250514` (o la constante de Haiku del proyecto).
- `maxTokens: 500`.
- Timeout: 30s por conversación.
- Si el modelo no retorna JSON válido, loguear y continuar con la siguiente.

**Añadir a `vercel.json`**:
```json
{ "path": "/api/cron/intelligence-mining", "schedule": "30 3 * * *" }
```

### 3. API Route para insights agregados

`app/api/intelligence/insights/route.ts`:

- GET con query params: `dateFrom`, `dateTo`.
- Requiere sesión. Lee tenant_id.
- Verifica `intelligence_enabled`. Si false, retorna `{ enabled: false }`.
- Retorna:

```json
{
  "enabled": true,
  "totalAnalizadas": 85,
  "porResultado": {
    "ganado": 20,
    "perdido": 45,
    "abandonado": 20
  },
  "topTemas": [
    { "tema": "precio", "count": 32, "porcentaje": 37.6 },
    { "tema": "ubicación", "count": 18, "porcentaje": 21.2 }
  ],
  "topObjeciones": [
    { "objecion": "demasiado caro", "count": 15, "porcentaje": 17.6 },
    { "objecion": "no tiene horario de tarde", "count": 8, "porcentaje": 9.4 }
  ],
  "sentimientoDistribucion": {
    "positivo": 25,
    "neutro": 30,
    "negativo": 20,
    "mixto": 10
  },
  "porCanal": {
    "whatsapp": { "total": 60, "ganado": 15, "perdido": 35, "abandonado": 10 },
    "instagram": { "total": 20, "ganado": 4, "perdido": 8, "abandonado": 8 },
    "mixed": { "total": 5, "ganado": 1, "perdido": 2, "abandonado": 2 }
  }
}
```

La query es SQL puro sobre `conversation_insights`:
- `topTemas`: desanidar el jsonb array `temas`, contar ocurrencias, ordenar DESC,
  top 10.
- `topObjeciones`: igual con `objeciones`.
- Resto: COUNT + GROUP BY.

### 4. Dashboard — sección de insights

En `app/(dashboard)/intelligence/page.tsx`, reemplazar el placeholder de Fase 2
con secciones reales:

**Sección "Análisis de conversaciones"** (después del embudo):
- Card con KPIs: total analizadas, distribución ganado/perdido/abandonado
  (con colores: verde/rojo/gris).
- **Top temas** (BarChart horizontal con recharts): lista de los 10 temas más
  frecuentes con barras de porcentaje.
- **Top objeciones** (BarChart horizontal): lista de las 10 objeciones más
  frecuentes.
- **Distribución de sentimiento** (PieChart con recharts): positivo/neutro/
  negativo/mixto.
- **Desglose por canal**: tabla simple con columnas canal | total | ganado |
  perdido | abandonado.
- Loading state mientras carga.
- Si no hay datos aún (cron no ha corrido): mensaje "Los datos de análisis se
  actualizan cada noche. Vuelve mañana para ver los primeros resultados."

### 5. Documentación

- `.claude/docs/architecture.md`: actualizar sección Intelligence con el cron
  y los endpoints nuevos.
- `.claude/docs/conventions.md`: si aplica, documentar el patrón de
  anonimización.
- Si surge alguna decisión técnica, añadir a `decisions.md`.
- Sesión `.claude/sessions/2026-XX-XX-conversation-intelligence-fase2.md`.

## Restricciones

- NO tocar: webhooks, auto-learn, followups, reminder-citas, chatbot,
  evolution, instagram.
- NO escribir en tablas existentes (leads, interacciones, citas, etc.).
  Solo leer.
- NO usar Sonnet para la minería. Solo Haiku 4.5 (coste).
- NO procesar conversaciones abiertas (en curso). Solo cerradas.
- NO commit ni push hasta mi confirmación.

## Aceptación

- [ ] `npm run build` pasa sin nuevos warnings.
- [ ] `npm run lint` verde.
- [ ] Tests de anonimización pasan.
- [ ] Tests existentes siguen pasando.
- [ ] Cron ejecutable manualmente con curl:
      `curl -H "x-cron-secret: $CRON_SECRET" https://[preview]/api/cron/intelligence-mining`
- [ ] Modo dry-run retorna estimación de tokens sin escribir en BD.
- [ ] Después de una ejecución exitosa del cron, la sección de insights en
      `/intelligence` muestra datos reales.
- [ ] Top temas y objeciones reflejan el contenido real de las conversaciones.
- [ ] Tenant sin flag activado: sección muestra "no activado".
- [ ] Auto-learn sigue funcionando independientemente (ejecutar y verificar).

## Test manual post-deploy

1. Activar `intelligence_enabled = true` para M&T tenant en BD.
2. Ejecutar cron manualmente primero en dry-run: verificar estimación de tokens.
3. Ejecutar cron sin dry-run: verificar que se crean registros en
   `conversation_insights`.
4. Ir a `/intelligence` → verificar que las secciones de insights muestran datos.
5. Ejecutar cron de auto-learn → verificar que sigue funcionando sin errores.
6. Revisar Sentry → no debe haber errores nuevos.

## Rollback

```sql
-- Limpiar insights generados (no toca schema)
DELETE FROM conversation_insights WHERE tenant_id = 'TENANT_ID';
-- O limpiar todo:
TRUNCATE conversation_insights;
```
Quitar el cron de `vercel.json` + `git revert` del merge.
El embudo de Fase 1 sigue funcionando independientemente.
````

---

## 8. Fase 3 — Recomendaciones semanales con Sonnet

**Quién**: Claude Code.
**Precondición**: Fase 2 mergeada y estable al menos 1 semana (necesitamos insights acumulados para que Sonnet tenga material).
**Objetivo**: cron semanal que agrega los insights de la semana y genera 3 recomendaciones accionables por tenant. Dashboard en `/intelligence` mostrando las recomendaciones.
**Zonas intocables**: las mismas que Fase 2.

### Prompt para Claude Code

````
# Tarea: Fase 3 Conversation Intelligence — recomendaciones semanales con Sonnet

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/architecture.md, conventions.md, decisions.md
- docs/PLAN-CONVERSATION-INTELLIGENCE.md (Fase 3 completa)
- Sesiones de Fases 0, 1 y 2
- `app/api/cron/intelligence-mining/route.ts` (Fase 2 — para entender el patrón)

## Objetivo

Cron semanal que lee insights acumulados + KPIs de la semana y genera 3
recomendaciones accionables con Sonnet. Si no hay insights, no genera nada
(no inventar recomendaciones vacías).

## Deliverables

### 1. Cron semanal de recomendaciones

`app/api/cron/intelligence-recommendations/route.ts`:

- Schedule: `0 7 * * 1` (lunes 7:00 AM UTC — para que estén listas al empezar
  la semana).
- Verificar `CRON_SECRET` en header. Si no, 401.
- Para cada tenant con `intelligence_enabled = true`:
  1. Calcular la semana ISO anterior (ej. `2026-W20`).
  2. Verificar que NO exista ya un registro en `intelligence_recommendations`
     para esa semana y ese tenant (evitar duplicados si el cron se ejecuta dos
     veces).
  3. Obtener insights de `conversation_insights` de la semana anterior
     (`processed_at` en rango lunes-domingo).
  4. Si hay menos de 3 insights, skip con log "insufficient data". No generar
     recomendaciones con datos insuficientes.
  5. Agregar los insights:
     - Top 5 temas (con conteo).
     - Top 5 objeciones (con conteo).
     - Distribución de sentimiento.
     - Distribución ganado/perdido/abandonado.
     - Tasa de conversión del embudo (reusar la lógica de Fase 1).
  6. Calcular KPIs de la semana:
     - Leads nuevos.
     - Leads cerrados (ganados + perdidos).
     - Win rate.
     - Citas agendadas vs completadas.
     - Valor pipeline.
  7. Enviar a Sonnet 4.6 con el prompt de recomendaciones.
  8. Parsear respuesta.
  9. INSERT en `intelligence_recommendations`.
  10. Rotación: DELETE registros del tenant con más de 12 semanas de antigüedad.
  11. Log resumen.

**Prompt para Sonnet** (constante exportable):

```
Eres un consultor de ventas analizando los datos semanales de un CRM de PYME.
Con base en los siguientes datos de la semana {{semana_iso}}, genera exactamente
3 recomendaciones accionables para mejorar los resultados de ventas.

## Datos de la semana

### KPIs
{{kpis_json}}

### Insights de conversaciones analizadas ({{n_insights}} conversaciones)
- Temas más frecuentes: {{top_temas}}
- Objeciones más frecuentes: {{top_objeciones}}
- Sentimiento: {{sentimiento_distribucion}}
- Resultados: {{ganado}} ganados, {{perdido}} perdidos, {{abandonado}} abandonados

### Embudo de conversión
{{funnel_data}}

## Instrucciones

Genera 3 recomendaciones en formato JSON:

[
  {
    "titulo": "Título corto y accionable (max 60 chars)",
    "descripcion": "Explicación de 2-3 frases con contexto de los datos y
      acción concreta a tomar",
    "prioridad": "alta|media|baja",
    "categoria": "agente|proceso|oferta|seguimiento|canal"
  }
]

Reglas:
- Cada recomendación debe estar respaldada por los datos proporcionados.
- Sé específico: no digas "mejorar seguimiento", di "los leads que mencionan
  precio abandonan un 40% más — probar oferta de primera consulta gratis".
- Categorías: "agente" = cambios en el comportamiento del chatbot, "proceso" =
  cambios en el flujo de ventas, "oferta" = cambios en el producto/servicio,
  "seguimiento" = cambios en follow-ups, "canal" = cambios en canales de
  adquisición.
- Prioridad basada en impacto potencial según los números.

Responde SOLO con el JSON array.
```

- Modelo: Sonnet 4.6 (la constante principal del proyecto).
- `maxTokens: 1000`.
- Timeout: 60s.

**Añadir a `vercel.json`**:
```json
{ "path": "/api/cron/intelligence-recommendations", "schedule": "0 7 * * 1" }
```

### 2. API Route para recomendaciones

`app/api/intelligence/recommendations/route.ts`:

- GET con query param opcional `weeks` (default 1, max 12).
- Requiere sesión. Lee tenant_id.
- Verifica `intelligence_enabled`.
- Retorna las últimas N semanas de recomendaciones:

```json
{
  "enabled": true,
  "recommendations": [
    {
      "semana": "2026-W20",
      "fecha_generacion": "2026-05-11T07:00:00Z",
      "recomendaciones": [
        {
          "titulo": "Probar oferta de primera consulta gratis",
          "descripcion": "El 35% de los leads mencionan 'precio' como objeción principal...",
          "prioridad": "alta",
          "categoria": "oferta"
        }
      ],
      "kpis_semana": { ... }
    }
  ]
}
```

### 3. Dashboard — sección de recomendaciones

En `app/(dashboard)/intelligence/page.tsx`, reemplazar el placeholder de Fase 3
con sección real:

**Sección "Recomendaciones de la semana"** (al final de la página):
- Header con "Semana {{semana_iso}}" y selector para ver semanas anteriores.
- 3 cards de recomendación, cada una con:
  - Badge de prioridad (alta=rojo, media=amarillo, baja=verde).
  - Badge de categoría (agente/proceso/oferta/seguimiento/canal con colores
    distintos).
  - Título en negrita.
  - Descripción.
- Si no hay recomendaciones aún: "Las recomendaciones se generan cada lunes.
  Necesitas al menos 3 conversaciones analizadas en la semana."
- Si hay historial: link "Ver semanas anteriores" que expande un accordion
  con las recomendaciones pasadas.

### 4. Tests

- `app/api/cron/intelligence-recommendations/__tests__/route.test.ts`:
  - Sin CRON_SECRET → 401.
  - Tenant sin flag → skip.
  - Menos de 3 insights → skip con log.
  - Flujo feliz → registro en `intelligence_recommendations` (mock de Sonnet).
  - Duplicado (misma semana) → skip.
  - Rotación: más de 12 semanas → las antiguas se borran.

### 5. Documentación

- `.claude/docs/architecture.md`: actualizar con el cron semanal y endpoint.
- Sesión `.claude/sessions/2026-XX-XX-conversation-intelligence-fase3.md`.

## Restricciones

- NO tocar: webhooks, auto-learn, followups, reminder-citas, chatbot,
  evolution, instagram.
- NO tocar la lógica del cron de minería (Fase 2). Solo leer sus datos.
- NO generar recomendaciones sin datos suficientes (min 3 insights).
- NO commit ni push hasta mi confirmación.

## Aceptación

- [ ] `npm run build` pasa sin nuevos warnings.
- [ ] `npm run lint` verde.
- [ ] Tests del cron pasan.
- [ ] Tests existentes siguen pasando.
- [ ] Ejecutar cron manualmente tras tener >= 3 insights: genera 3
      recomendaciones coherentes.
- [ ] `/intelligence` muestra las recomendaciones con prioridades y categorías.
- [ ] Selector de semanas anteriores funciona.
- [ ] Tenant sin flag: no se generan recomendaciones.
- [ ] Ejecutar dos veces el cron para la misma semana: no duplica.
- [ ] Auto-learn y minería siguen funcionando independientemente.

## Test manual post-deploy

1. Verificar que hay >= 3 insights en `conversation_insights` para M&T tenant.
2. Ejecutar cron manualmente:
   `curl -H "x-cron-secret: $CRON_SECRET" https://[preview]/api/cron/intelligence-recommendations`
3. Verificar registro en `intelligence_recommendations`.
4. Ir a `/intelligence` → ver las 3 recomendaciones.
5. Verificar que son coherentes con los datos reales.
6. Ejecutar el cron de nuevo → no duplica.
7. Revisar Sentry → sin errores.

## Rollback

```sql
-- Limpiar recomendaciones (no toca schema)
DELETE FROM intelligence_recommendations WHERE tenant_id = 'TENANT_ID';
-- O limpiar todo:
TRUNCATE intelligence_recommendations;
```
Quitar el cron de `vercel.json` + `git revert` del merge.
Embudo e insights de Fases 1-2 siguen funcionando.
````

---

## 9. Fase 4 — Hardening

**Quién**: Claude Code.
**Precondición**: Fases 1-3 estables al menos 2 semanas en M&T tenant.
**Objetivo**: control de costes de inferencia, observabilidad completa y panel admin para monitorizar la salud de intelligence across tenants.

### Prompt para Claude Code

````
# Tarea: Fase 4 Conversation Intelligence — hardening

Antes de empezar, lee:
- CLAUDE.md
- .claude/docs/ completo
- docs/PLAN-CONVERSATION-INTELLIGENCE.md (Fase 4 completa)
- Sesiones de Fases 0-3

## Deliverables

### 1. Tracking de costes de inferencia

`lib/intelligence/cost-tracker.ts`:

```ts
interface InferenceCost {
  tenant_id: string
  modelo: string
  tokens_input: number
  tokens_output: number
  coste_estimado_usd: number  // calculado con precios conocidos
  tipo: 'mining' | 'recommendations'
  created_at: string
}
```

Tabla nueva (migración):
```sql
CREATE TABLE public.intelligence_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  periodo text NOT NULL,            -- '2026-05' formato YYYY-MM
  modelo text NOT NULL,
  tokens_input_total bigint NOT NULL DEFAULT 0,
  tokens_output_total bigint NOT NULL DEFAULT 0,
  coste_estimado_usd numeric(10,4) NOT NULL DEFAULT 0,
  ejecuciones integer NOT NULL DEFAULT 0,
  conversaciones_procesadas integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ic_tenant_periodo_modelo
  ON public.intelligence_costs(tenant_id, periodo, modelo);

ALTER TABLE public.intelligence_costs ENABLE ROW LEVEL SECURITY;
```

Los crons de Fase 2 y 3 llaman a `trackCost()` después de cada llamada al
modelo. Se hace UPSERT incrementando los contadores del mes.

Precios de referencia (actualizar si cambian):
- Haiku 4.5: $0.80/MTok input, $4.00/MTok output
- Sonnet 4.6: $3.00/MTok input, $15.00/MTok output

### 2. Observabilidad Sentry

En todos los crons de intelligence (mining y recommendations):
- Tag `feature: conversation-intelligence` en todos los errores.
- Tag `intelligence.phase: mining|recommendations`.
- Breadcrumbs con: tenant_id, leads procesados, tokens consumidos.
- Si un cron tarda más de 5 minutos, Sentry warning.

### 3. Panel admin de intelligence

Tarjeta nueva en `/admin` (solo super-admin) con:

**Vista por tenant**:
- Tabla con columnas: tenant | flag activo | insights totales | insights este
  mes | recomendaciones totales | última ejecución mining | última ejecución
  recommendations | coste acumulado mes | errores últimas 24h.
- Resaltado en rojo si última ejecución > 48h (algo falló).

**Vista global**:
- Card con coste total del mes actual (todos los tenants).
- Card con total de conversaciones procesadas este mes.
- Card con total de tokens consumidos este mes.
- Gráfica de coste diario (últimos 30 días) con recharts AreaChart.

**Acciones** (solo super-admin):
- Toggle `intelligence_enabled` por tenant desde el panel.
- Botón "Ejecutar mining ahora" (llama al cron con CRON_SECRET, útil para
  debug).
- Botón "Ejecutar dry-run" (llama al cron con ?dryRun=true).

### 4. Alertas de coste

En el cron de mining, después de procesar todos los tenants:
- Si el coste acumulado del mes supera un umbral configurable
  (`INTELLIGENCE_MONTHLY_COST_ALERT_USD`, default 50):
  - Log warning.
  - Sentry alert con tag `intelligence.cost_alert`.
  - (Futuro: Slack notification — no implementar ahora, solo dejar el hook).

### 5. Health check en monitor-agent

Si existe un cron `monitor-agent` (`app/api/cron/monitor-agent/`), añadir
checks de intelligence:
- ¿Cuándo fue la última ejecución exitosa de mining? Si > 48h, alerta.
- ¿Cuándo fue la última ejecución exitosa de recommendations? Si > 8 días,
  alerta.
- ¿Hay tenants con flag activo pero 0 insights en los últimos 7 días?

Si no existe `monitor-agent`, crear los checks como parte del panel admin
(polling desde el frontend, no cron adicional).

### 6. Documentación

- `.claude/docs/architecture.md`: actualizar con tabla de costes y panel admin.
- `.claude/docs/integrations.md`: sección "Intelligence — costes y monitoreo".
- Sesión `.claude/sessions/2026-XX-XX-conversation-intelligence-fase4.md`.

## Restricciones

- NO tocar: webhooks, auto-learn, followups, reminder-citas, chatbot,
  evolution, instagram.
- NO cambiar la lógica de mining o recommendations de Fases 2-3, solo añadir
  tracking y observabilidad.
- NO commit ni push hasta mi confirmación.

## Aceptación

- [ ] `npm run build` pasa sin nuevos warnings.
- [ ] `npm run lint` verde.
- [ ] Tests existentes siguen pasando.
- [ ] Panel admin muestra datos reales de intelligence por tenant.
- [ ] Costes se acumulan correctamente tras ejecución del cron.
- [ ] Gráfica de costes visible con datos del mes.
- [ ] Toggle desde admin activa/desactiva el flag correctamente.
- [ ] Botón "Ejecutar mining ahora" funciona desde el panel admin.
- [ ] Dry-run desde admin retorna estimación sin escribir en BD.
- [ ] Sentry tags presentes en todos los errores de intelligence.

## Test manual post-deploy

1. Loguear como super-admin.
2. Ir a `/admin` → verificar la tarjeta de intelligence.
3. Ejecutar mining desde el panel → verificar que los costes se registran.
4. Verificar gráfica de costes.
5. Desactivar intelligence para un tenant desde el panel → verificar que el
   próximo cron lo skipea.
6. Revisar Sentry → tags de intelligence presentes.

## Rollback

```sql
-- Limpiar costes (no afecta al funcionamiento de mining/recommendations)
DROP TABLE IF EXISTS public.intelligence_costs CASCADE;
```
`git revert` del merge. Mining y recommendations siguen funcionando, solo
se pierde el tracking de costes y el panel admin.
````

---

## 10. Checklist maestro

Marca según avances.

### Fase 0 — Schema + feature flag
- [ ] Migración creada con `supabase migration new`
- [ ] `intelligence_enabled` en `configuracion_modulos` con default false
- [ ] Tabla `conversation_insights` con índices y RLS
- [ ] Tabla `intelligence_recommendations` con índices y RLS
- [ ] Unique index en `(tenant_id, lead_id)` para insights
- [ ] Unique index en `(tenant_id, semana_iso)` para recommendations
- [ ] Build + lint + tests verdes
- [ ] Merge a develop

### Fase 1 — Embudo de conversión
- [ ] API route `/api/intelligence/funnel` con filtros
- [ ] API route `/api/intelligence/breakdown` con desglose por canal
- [ ] Página `/intelligence` con embudo visual (recharts)
- [ ] Filtros de fecha, canal, UTM funcionando
- [ ] Estado vacío cuando flag OFF
- [ ] Placeholders para Fases 2 y 3 visibles
- [ ] Cards de tasas de conversión
- [ ] Comparativa por canal
- [ ] Item "Intelligence" en sidebar
- [ ] Build + lint + tests verdes
- [ ] Merge a develop
- [ ] Verificado en preview con datos reales

### Fase 2 — Minería de conversaciones
- [ ] `lib/intelligence/anonymize.ts` con tests
- [ ] Tests de anonimización pasando
- [ ] Cron `intelligence-mining` en `vercel.json`
- [ ] Criterios de conversación cerrada implementados
- [ ] Filtro de mínimo 4 mensajes
- [ ] Límite de 50 por tenant
- [ ] Modo dry-run funcionando
- [ ] Prompt de Haiku optimizado
- [ ] API route `/api/intelligence/insights` con agregaciones
- [ ] Dashboard: top temas, top objeciones, sentimiento, canal
- [ ] Ejecutado en M&T tenant con datos reales
- [ ] Auto-learn verificado que sigue funcionando
- [ ] Build + lint + tests verdes
- [ ] Merge a develop
- [ ] 1 semana de datos acumulados antes de Fase 3

### Fase 3 — Recomendaciones semanales
- [ ] Cron `intelligence-recommendations` en `vercel.json`
- [ ] Mínimo 3 insights para generar
- [ ] Prompt de Sonnet genera recomendaciones coherentes
- [ ] Rotación de 12 semanas
- [ ] API route `/api/intelligence/recommendations`
- [ ] Dashboard: cards de recomendaciones con prioridad y categoría
- [ ] Selector de semanas anteriores
- [ ] Tests del cron pasando
- [ ] Ejecutado en M&T tenant
- [ ] Build + lint + tests verdes
- [ ] Merge a develop

### Fase 4 — Hardening
- [ ] Tabla `intelligence_costs` creada
- [ ] Tracking de tokens y costes en crons
- [ ] Panel admin con vista por tenant y global
- [ ] Gráfica de costes mensual
- [ ] Toggle de flag desde admin
- [ ] Botones de ejecución manual (mining + dry-run)
- [ ] Sentry tags `feature: conversation-intelligence`
- [ ] Alerta de coste mensual
- [ ] Health checks en monitor-agent
- [ ] Build + lint + tests verdes
- [ ] Merge a develop

---

## 11. Rollback de emergencia

**Regla general**: apagar antes que arreglar.

**Apagado total instantáneo** (todos los tenants):
```sql
UPDATE configuracion_modulos SET intelligence_enabled = false;
```
Ejecutado en Supabase SQL editor. Detiene TODO el procesamiento de intelligence para TODOS los tenants en segundos. El CRM, el chatbot, los crons existentes (auto-learn, followups, recordatorios) siguen funcionando exactamente igual. El embudo de Fase 1 deja de mostrarse (devuelve `enabled: false`).

**Apagado para un tenant específico**:
```sql
UPDATE configuracion_modulos SET intelligence_enabled = false WHERE tenant_id = 'TENANT_ID';
```

**Si los insights tienen datos erróneos**:
```sql
-- Ver insights recientes
SELECT * FROM conversation_insights
WHERE tenant_id = 'TENANT_ID'
  AND processed_at > '2026-05-15'::timestamptz
ORDER BY processed_at DESC;

-- Borrar los problemáticos
DELETE FROM conversation_insights
WHERE tenant_id = 'TENANT_ID'
  AND processed_at > '2026-05-15'::timestamptz;
```

**Si las recomendaciones son incoherentes**:
```sql
DELETE FROM intelligence_recommendations
WHERE tenant_id = 'TENANT_ID'
  AND semana_iso = '2026-W20';
```

**Si hay un pico de costes inesperado**:
1. Apagado total instantáneo (query arriba).
2. Revisar `intelligence_costs` para identificar qué tenant/modelo genera el pico.
3. Si es un tenant específico, desactivar solo ese.
4. Revisar logs del cron para entender por qué procesó más de lo esperado.

**Si el cron se queda colgado o tarda demasiado**:
- Los crons de Vercel tienen timeout natural (según el plan, típicamente 60s para hobby, 300s para pro).
- Si necesitas matar un cron en curso, no es posible — pero el siguiente no se ejecutará si el anterior no terminó.
- Solución: deploy rápido del cron devolviendo 200 inmediatamente (cuerpo vacío).

**Rollback completo de toda la feature** (nuclear):
```sql
-- Borrar datos generados
TRUNCATE conversation_insights;
TRUNCATE intelligence_recommendations;
TRUNCATE intelligence_costs;  -- si existe (Fase 4)

-- Quitar feature flag
ALTER TABLE configuracion_modulos DROP COLUMN IF EXISTS intelligence_enabled;

-- Borrar tablas
DROP TABLE IF EXISTS intelligence_costs CASCADE;
DROP TABLE IF EXISTS intelligence_recommendations CASCADE;
DROP TABLE IF EXISTS conversation_insights CASCADE;
```
+ `git revert` de todos los merges de las fases, de la más reciente a la más antigua.

**Nota importante**: el rollback nuclear NO afecta al chatbot, auto-learn, follow-ups, recordatorios ni ninguna otra funcionalidad del CRM. La capa de intelligence es 100% aditiva y desacoplada.

---

*Plan v1 — 2026-05-16. Autor: Ekaitz + Claude.*
