# Roadmap M&T CRM v2 — Plan Maestro de Desarrollo

> **Fecha**: 11 de abril de 2026
> **Autores**: Eneko (M&T Consulting) + Claude Code
> **Versión**: 2.0 — Sustituye roadmap v1. Cambio de dirección: Next.js, eliminar n8n, Claude Sonnet 4.6
> **Objetivo**: Profesionalizar M&T CRM como SaaS multi-tenant escalable

---

## Contexto

M&T CRM es un CRM + Setter IA multi-tenant. Actualmente tiene 1 cliente activo (Itzalki Toldoak) y M&T Consulting como tenant propio. El sistema funciona con React (Vite) en el frontend y n8n para todas las automatizaciones.

**Problema principal**: n8n no soporta branching, no se puede versionar, no escala, y es el cuello de botella para profesionalizar el producto. Con solo 1 cliente activo, este es el momento ideal para migrar.

**Decisiones clave de esta versión**:
- Migrar de React (Vite) a **Next.js App Router** (full-stack)
- **Eliminar n8n** completamente — todos los workflows pasan a API Routes
- **Claude Sonnet 4.6** como modelo principal del setter IA
- Estrategia **multi-modelo** (Sonnet + GPT-4o fallback + Haiku para scoring)
- **Supabase Branching** activado para BD por rama
- **TypeScript** obligatorio para archivos nuevos

---

## Estado actual del sistema

| Componente | Estado | Migración necesaria |
|-----------|--------|-------------------|
| Multi-tenancy + RLS | Funcionando | No |
| Pipeline Kanban + Lista | Funcionando | Migrar a Next.js |
| Agente IA WhatsApp (WF2, n8n) | Funcionando | Migrar a API Route + AI SDK |
| Recordatorios (WF4, n8n) | Funcionando | Migrar a Cron + API Route |
| Follow-ups (WF5, n8n) | Funcionando | Migrar a Cron + API Route |
| Captura leads (WF1, n8n) | Funcionando | Migrar a API Route |
| Entrada manual (WF6, n8n) | Funcionando | Migrar a API Route |
| Entrenamiento agente (WF7, n8n) | Funcionando | Migrar a API Route |
| Auto-learn (WF8, n8n) | Funcionando | Migrar a Cron + API Route |
| Chat conversaciones | Funcionando | Migrar a Next.js |
| Módulos configurables | Funcionando | Migrar a Next.js |
| Campos UTM / atribución | **No existe** | Crear desde cero |
| Valor de negociación por lead | **No existe** | Crear desde cero |
| Métricas de ventas / profit | **No existe** | Crear desde cero |
| Pipeline configurable por tenant | **No existe** | Crear desde cero |
| Motivo de pérdida | **No existe** | Crear desde cero |
| Rol super_admin | **No existe** | Crear desde cero |
| Instagram DMs | Placeholder UI | Crear desde cero |
| Stripe / pagos | **No existe** | Crear desde cero |
| Ramas Git (develop/staging) | **No existe** | Fase 0 |
| Tests | **No existen** | Crear desde cero |
| Error tracking (Sentry) | **No existe** | Fase 0 |
| TypeScript | **No existe** | Migración gradual |
| Migraciones Supabase | **No existe** | Fase 0 |

---

## FASE 0 — Infraestructura + Migración a Next.js

**Prioridad**: CRÍTICA — Prerrequisito de todo lo demás
**Cuándo**: Sábado-Domingo 12-13 de abril de 2026
**Participantes**: Eneko + Ekaitz + Claude Code

### 0A — Ramas y despliegues

| # | Tarea | Dificultad |
|---|-------|-----------|
| 0A.1 | Crear rama `develop` desde `main` | Baja |
| 0A.2 | Crear rama `staging` desde `main` | Baja |
| 0A.3 | Configurar Vercel: `main` = producción, `staging` y `develop` = preview URLs fijas | Baja |
| 0A.4 | Activar Supabase Branching (plan Pro, ya pagado) | Baja |
| 0A.5 | Variables de entorno por entorno en Vercel (prod vs preview) | Baja |

### 0B — Migración a Next.js

| # | Tarea | Dificultad |
|---|-------|-----------|
| 0B.1 | Inicializar proyecto Next.js App Router en la rama `develop` | Media |
| 0B.2 | Migrar componentes React existentes (JSX → estructura Next.js) | Media |
| 0B.3 | Configurar Supabase client para Next.js (server + client) | Media |
| 0B.4 | Configurar autenticación con middleware Next.js | Media |
| 0B.5 | Verificar que el CRM funciona igual que antes en preview URL | Alta |
| 0B.6 | Primer componente en TypeScript (type de Lead) | Baja |

### 0C — Fundamentos de calidad

| # | Tarea | Dificultad |
|---|-------|-----------|
| 0C.1 | Configurar Sentry para error tracking | Baja |
| 0C.2 | Inicializar Supabase CLI + primera migración formal | Baja |
| 0C.3 | Configurar Vercel AI SDK con proveedor Anthropic + OpenAI | Media |
| 0C.4 | Documentar flujo de trabajo para el equipo | Baja |

### Resultado esperado
- `main` → producción (URL actual, React Vite, n8n funciona normal)
- `develop` → Next.js nuevo, preview URL en Vercel, BD branch de Supabase
- n8n sigue funcionando sin tocar — clientes no notan nada
- Sentry activo, migraciones configuradas, AI SDK listo

---

## FASE 0.5 — Migración de workflows n8n a código

**Prioridad**: CRÍTICA — Eliminar dependencia de n8n
**Cuándo**: Semana del 14-18 de abril de 2026
**Nota**: coordinar con Itzalki para minimizar downtime. Migrar en `develop`, testear, mergear.

### Orden de migración (de más fácil a más complejo)

| # | Workflow | API Route | Qué hace | Dificultad |
|---|---------|-----------|---------|-----------|
| 0.5.1 | **WF1** Captura Lead | `POST /api/webhooks/lead-capture` | Recibe form landing → insert Supabase → email bienvenida → WhatsApp primer mensaje | Baja |
| 0.5.2 | **WF6** Entrada Manual | `POST /api/leads/manual` | Formulario CRM → insert Supabase → WhatsApp primer mensaje | Baja |
| 0.5.3 | **WF7** Entrenar Agente | `POST /api/ai/train-agent` | Recibe escenarios → Claude genera identidad_voz → guarda en Supabase | Baja |
| 0.5.4 | **WF4** Recordatorios | `GET /api/cron/reminders` | Cada hora: buscar citas próximas → enviar recordatorio WhatsApp | Media |
| 0.5.5 | **WF5** Follow-ups | `GET /api/cron/follow-ups` | Cada 2h: buscar leads sin actividad → Claude genera follow-up → enviar WhatsApp | Media |
| 0.5.6 | **WF8** Auto-Learn | `GET /api/cron/auto-learn` | Diario 3AM: analizar conversaciones exitosas → generar ejemplos → guardar | Media |
| 0.5.7 | **WF2** Agente IA | `POST /api/webhooks/whatsapp` | Webhook WhatsApp → cargar contexto tenant → Claude Sonnet conversa → responder | Alta |

### Ventajas inmediatas de la migración
- **WF1 ya no se duplica por cliente** — un solo endpoint recibe `tenant_id` de la landing
- **WF6 ya no se duplica** — llamada directa desde el frontend con el tenant del usuario logueado
- **WF2 pasa de GPT-4o a Claude Sonnet 4.6** — mejor tono humano
- **Todo versionado en Git** — ramas, PRs, revert si algo falla

### Estrategia de cutover por workflow
1. Crear API Route en `develop`
2. Testear con lead de test del tenant M&T
3. Mergear a `staging` → test con Itzalki
4. Mergear a `main` → desactivar workflow correspondiente en n8n
5. Verificar 24h → si OK, marcar WF como legacy en n8n

### Para WF2 (el agente IA) — Arquitectura

```
POST /api/webhooks/whatsapp
  │
  ├─ Verificar firma webhook (Evolution API)
  ├─ Extraer datos mensaje (LID fix incluido)
  ├─ Identificar tenant por número de WhatsApp
  │
  ├─ Cargar contexto:
  │   ├─ documentos_chatbot del tenant
  │   ├─ configuracion_modulos
  │   ├─ historial de interacciones (últimas N)
  │   ├─ calendario en tiempo real (citas del tenant)
  │   └─ promociones activas (si existen)
  │
  ├─ Llamar a Claude Sonnet 4.6 (Vercel AI SDK):
  │   ├─ System prompt con toda la documentación
  │   ├─ Tools: consultar_calendario, agendar_cita, actualizar_score
  │   ├─ Historial de la conversación
  │   └─ Fallback a GPT-4o si Anthropic falla
  │
  ├─ Post-procesamiento:
  │   ├─ Extraer [RESUMEN:...] si existe
  │   ├─ Actualizar lead_score en Supabase
  │   ├─ Crear cita en Supabase + GCal (si aplica)
  │   └─ Registrar interacción
  │
  └─ Enviar respuesta via Evolution API
```

---

## FASE 1 — Atribución UTM + Valor de negociación

**Prioridad**: ALTA — Campaña de Itzalki corriendo sin tracking
**Cuándo**: Semana del 21-25 de abril de 2026
**Dependencia**: Fase 0 y 0.5 completadas

### Por qué es urgente
Cada día entran leads sin saber de qué anuncio vienen. Sin atribución por creativo, no se puede cerrar el loop entre rendimiento de ads y rendimiento de cierre real.

### Tareas

| # | Tarea | Dificultad |
|---|-------|-----------|
| 1.1 | Configurar URLs de Meta Ads con variables dinámicas | Nula |
| 1.2 | Migration SQL: columnas UTM + `valor_negociacion` en leads | Baja |
| 1.3 | Script JS para landings: capturar UTMs → sessionStorage → form | Baja |
| 1.4 | Actualizar API Route de captura lead para mapear UTMs | Baja |
| 1.5 | Mostrar campos UTM en LeadDetail (solo lectura) | Baja |
| 1.6 | Campo `valor_negociacion` (€) editable en LeadDetail | Baja |
| 1.7 | Filtro en Kanban/Lista por `utm_content` (nombre del creativo) | Media |
| 1.8 | Dashboard: métricas de atribución (leads por creativo, valor por creativo) | Media |
| 1.9 | Dashboard: métricas de ventas (negociaciones abiertas, cerradas, profit total) | Media |

### Migration SQL

```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS valor_negociacion numeric(12,2);

CREATE INDEX IF NOT EXISTS idx_leads_utm_content ON leads(utm_content) WHERE utm_content IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_utm_campaign ON leads(utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_valor ON leads(valor_negociacion) WHERE valor_negociacion IS NOT NULL;
```

### Métricas de ventas en Dashboard
- Total negociaciones abiertas (suma valor_negociacion de leads activos)
- Total ventas cerradas (suma valor_negociacion de leads con estado "ganado")
- Tasa de cierre (ganados / total leads)
- Valor medio por negociación
- Gráfico de ventas cerradas por semana/mes
- Desglose por canal (UTM source) y por creativo (UTM content)

---

## FASE 2 — Lifecycle + Pipeline configurable

**Prioridad**: ALTA
**Cuándo**: Semanas del 28 de abril - 9 de mayo de 2026
**Dependencia**: Fase 1

### 2A — Estados perdido/ganado + Motivo de pérdida

| # | Tarea | Dificultad |
|---|-------|-----------|
| 2A.1 | Añadir estados "perdido" y "ganado" al pipeline | Baja |
| 2A.2 | Campo `motivo_perdida` en tabla leads | Baja |
| 2A.3 | Modal obligatorio al mover lead a "Perdido" | Media |
| 2A.4 | Motivos predefinidos: precio, competencia, no contesta, no era cliente real, otro | Baja |
| 2A.5 | Estadísticas de motivos de pérdida en Dashboard | Media |

### 2B — Pipeline 100% configurable por tenant

Cada cliente tiene un negocio diferente (clínica dental ≠ toldos ≠ inmobiliaria). Las columnas del Kanban deben ser configurables.

| # | Tarea | Dificultad |
|---|-------|-----------|
| 2B.1 | Tabla `pipeline_estados` (tenant_id, orden, clave, label, color, icon, es_final, es_ganado, es_perdido) | Media |
| 2B.2 | Estados por defecto al crear tenant (nuevo, contactado, caliente, negociación, reunión, cliente, perdido, ganado) | Baja |
| 2B.3 | UI en ModulosConfig para gestionar estados (añadir, reordenar, renombrar, eliminar) | Alta |
| 2B.4 | Adaptar Kanban para estados dinámicos desde DB | Alta |
| 2B.5 | Adaptar vista Lista para estados dinámicos | Alta |
| 2B.6 | Adaptar LeadDetail dropdown dinámico | Media |
| 2B.7 | Adaptar Dashboard para estadísticas dinámicas | Media |
| 2B.8 | Adaptar agente IA para conocer estados válidos del tenant | Media |

### Migration SQL

```sql
CREATE TABLE IF NOT EXISTS pipeline_estados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES profiles(id) NOT NULL,
  orden integer NOT NULL,
  clave text NOT NULL,
  label text NOT NULL,
  color text DEFAULT '#6366f1',
  icon text DEFAULT '📋',
  es_final boolean DEFAULT false,
  es_ganado boolean DEFAULT false,
  es_perdido boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, clave),
  UNIQUE(tenant_id, orden)
);

-- RLS
ALTER TABLE pipeline_estados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant isolation" ON pipeline_estados
  FOR ALL USING (tenant_id = auth.uid());

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS motivo_perdida text,
  ADD COLUMN IF NOT EXISTS motivo_perdida_detalle text;
```

---

## FASE 3 — Panel Super-Admin + Métricas de ventas

**Prioridad**: MEDIA
**Cuándo**: Semana del 12-16 de mayo de 2026
**Dependencia**: Fases 1 y 2 (sin atribución ni valor_negociación, el panel no aporta)

### Tareas

| # | Tarea | Dificultad |
|---|-------|-----------|
| 3.1 | Añadir rol `super_admin` al constraint de profiles | Baja |
| 3.2 | RLS bypass read-only para super_admin | Media |
| 3.3 | Vista `/admin/clientes` con lista de tenants y métricas | Alta |
| 3.4 | Métricas por cliente: leads, ganados, perdidos, CPL, valor ventas, ROAS | Media |
| 3.5 | Métricas globales: ventas totales, profit total, tasa de cierre global | Media |
| 3.6 | Alertas: "X días sin leads en cliente Y" | Media |
| 3.7 | Exportar datos a Excel/CSV | Media |

### Fase 3.5 — Meta Ads API en super-admin (posterior)

| # | Tarea | Dificultad |
|---|-------|-----------|
| 3.5.1 | Conectar Meta Marketing API | Alta |
| 3.5.2 | Dashboard campañas por tenant (impresiones, clics, gasto, CPL) | Alta |
| 3.5.3 | Cruce de datos: Meta Ads + cierre CRM = ROAS real | Alta |

---

## FASE 4 — Mejoras de comunicación y agente IA

**Prioridad**: MEDIA-ALTA
**Cuándo**: Semanas del 19 de mayo - 6 de junio de 2026
**Dependencia**: Fase 0.5 (WF2 ya migrado a código)

### Tareas

| # | Tarea | Dificultad |
|---|-------|-----------|
| 4.1 | Plantillas de WhatsApp editables desde el CRM | Media |
| 4.2 | Plantillas con archivos/enlaces adjuntos | Media |
| 4.3 | Follow-up manual por lead (botón en pipeline) | Media |
| 4.4 | Anti prompt-injection en el agente IA | Media |
| 4.5 | Contexto de promociones activas en el agente | Media |
| 4.6 | UI para gestionar promos con fecha inicio/fin | Media |
| 4.7 | Mensajes outbound manuales visibles en chat | Baja |
| 4.8 | Humanización avanzada del agente (fine-tuning de tono por tenant) | Media |
| 4.9 | Envío de emails desde el CRM (Resend/SendGrid) | Media |

---

## FASE 5 — Meta WhatsApp Business API + Instagram

**Prioridad**: MEDIA
**Cuándo**: Junio - Julio de 2026
**Dependencia**: Fases 0-2 estables

### 5A — Meta WhatsApp Business API

| # | Tarea | Dificultad |
|---|-------|-----------|
| 5A.1 | Obtener acceso a Meta Business API | Media (burocracia) |
| 5A.2 | Configurar webhook de Meta | Media |
| 5A.3 | Adaptar API Route del agente para recibir de Meta (en vez de Evolution) | Media |
| 5A.4 | Templates de mensajes aprobados por Meta | Media |
| 5A.5 | Embedded Signup de WhatsApp en el CRM (onboarding) | Alta |

### 5B — Instagram DMs como setter IA

El agente de Instagram funciona **exactamente igual** que el de WhatsApp: mismo motor IA, misma documentación, mismo tono. Solo cambia el canal de entrada/salida.

| # | Tarea | Dificultad |
|---|-------|-----------|
| 5B.1 | App de Meta con permisos `instagram_manage_messages`, `pages_messaging` | Media |
| 5B.2 | API Route: `POST /api/webhooks/instagram` | Media |
| 5B.3 | Adaptar motor IA para multi-canal (WhatsApp + Instagram comparten lógica) | Media |
| 5B.4 | Respuesta automática a comentarios de IG | Alta |
| 5B.5 | UI en el CRM para ver conversaciones de IG | Media |
| 5B.6 | Métricas de canal (WhatsApp vs Instagram) en Dashboard | Baja |

### Arquitectura multi-canal

```
/api/webhooks/whatsapp  ──┐
                          ├─→ Motor IA compartido ──→ Respuesta por canal correcto
/api/webhooks/instagram ──┘
                          │
                          ├─ Mismo contexto de tenant
                          ├─ Mismos documentos_chatbot
                          ├─ Mismo Claude Sonnet 4.6
                          └─ Mismo scoring/citas/resúmenes
```

---

## FASE 6 — Monetización (SaaS)

**Prioridad**: BAJA a corto plazo
**Cuándo**: Julio - Agosto de 2026
**Dependencia**: Todo lo anterior estable

### Tareas

| # | Tarea | Dificultad |
|---|-------|-----------|
| 6.1 | Integración Stripe (Checkout Sessions + webhooks) | Alta |
| 6.2 | Tabla `planes` (id, nombre, precio, modulos_incluidos) | Media |
| 6.3 | Tabla `suscripciones` (tenant_id, plan_id, stripe_subscription_id, estado) | Media |
| 6.4 | Bloqueo de módulos por plan + banners "Actualiza tu plan" | Media |
| 6.5 | Landing page de ventas | Media |
| 6.6 | Self-service signup → pago → acceso automático | Alta |

---

## Tareas transversales (no son fase, se hacen continuamente)

| Tarea | Cuándo | Prioridad |
|-------|--------|----------|
| Romper App.jsx en componentes (< 300 líneas por archivo) | Fase 0B en adelante | Alta |
| Archivos nuevos en TypeScript | Desde Fase 0 | Alta |
| Tests para API routes críticas | Desde Fase 0.5 | Alta |
| Migraciones Supabase formales | Desde Fase 0 | Alta |
| Rate limiting en webhooks | Fase 0.5 | Alta |
| RGPD: política de privacidad + derecho al olvido | Antes de Fase 6 | Media |
| Monitorización uptime (UptimeRobot o similar) | Fase 0.5 | Media |
| Documentar onboarding automatizado | Fase 5 | Media |

---

## Avisos de ruptura potenciales

1. **Fase 0B (migración Next.js)**: Cambio más grande de infraestructura. Hacer en `develop`, testear exhaustivamente antes de mergear.
2. **Fase 0.5 (migración WF2)**: El agente IA es el corazón del producto. Testear con conversaciones reales del tenant M&T antes de activar para Itzalki.
3. **Fase 2B (pipeline configurable)**: Toca toda la app (Kanban, Lista, LeadDetail, Dashboard, agente). Implementar con cuidado.
4. **Fase 5A (migrar Evolution → Meta API)**: Rompe envío/recepción de WhatsApp. Migrar clientes nuevos primero.
5. **Constraints de Supabase**: Cada nuevo tipo en `documentos_chatbot` requiere actualizar constraint.

---

## Costes estimados mensuales (post-migración)

| Servicio | Coste | Notas |
|----------|-------|-------|
| Supabase Pro | $25/mes | Ya pagado |
| Supabase Branching | ~$5-10/mes | Solo durante desarrollo |
| Vercel Pro | $20/mes | Si es necesario (ahora gratis) |
| Claude Sonnet API | $10-25/mes | ~500 conversaciones/mes |
| GPT-4o API (fallback) | $0-5/mes | Solo si Anthropic cae |
| Claude Haiku API | $1-3/mes | Scoring y clasificación |
| Sentry | $0/mes | Plan gratis |
| Evolution API | $0/mes | Self-hosted en EasyPanel |
| **TOTAL** | **~$60-90/mes** | |

**Precio por cliente**: mínimo $100/mes → rentable desde el 1er cliente.

---

## Resumen visual

```
FASE 0 ─── Next.js + Ramas + Supabase Branching ──────── 12-13 abril
  │
FASE 0.5 ── Migrar n8n → código (WF1→WF6→...→WF2) ──── 14-18 abril
  │
FASE 1 ─── UTM + valor_negociación + métricas ventas ─── 21-25 abril
  │
FASE 2 ─── perdido/ganado + pipeline configurable ──────── 28 abril - 9 mayo
  │
FASE 3 ─── Panel super-admin M&T ──────────────────────── 12-16 mayo
  │         (Meta Ads API: Fase 3.5, después)
  │
FASE 4 ─── Plantillas, follow-up, promos, email, IA ────── 19 mayo - 6 junio
  │
FASE 5 ─── Meta WhatsApp API + Instagram setter IA ─────── Junio - Julio
  │
FASE 6 ─── Stripe + planes + self-service ──────────────── Julio - Agosto
```
