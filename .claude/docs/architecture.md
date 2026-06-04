# Arquitectura de M&T CRM

## Visión general

CRM + Setter IA multi-tenant. Un solo frontend Next.js sirve a todos los tenants. Cada tenant tiene sus datos aislados via RLS en Supabase. Las automatizaciones corren como API Routes y Cron Jobs en Vercel.

## Diagrama de servicios

```
Landing pages (Vercel)  →  POST /api/webhooks/lead  →  Supabase (leads)
                                                             ↕
CRM Frontend (Vercel)   ←→  Supabase (PostgreSQL + RLS + Auth)
                                                             ↕
                              API Routes (Vercel)  ←→  Evolution API (WhatsApp per-tenant)
                                    ↕                  Meta Graph API (Instagram DMs per-tenant)
                              Claude Sonnet 4.6 (Anthropic)
                              GPT-4o (fallback)
                              Google Calendar (futuro)
```

## Multi-tenancy

- Cada usuario registrado es un tenant con `profiles.id` = `tenant_id`
- RLS activo en todas las tablas: `tenant_id = auth.uid()`
- API Routes usan `service_role` key (admin client) para acceso cross-tenant donde necesario
- Todo nuevo desarrollo DEBE ser multi-tenant y modular
- Evolution API: cada tenant tiene su propia instancia (`evolution_instance` en `configuracion_modulos`)
- Instagram API: cada tenant tiene su propio Page ID y Access Token (`instagram_page_id`, `instagram_access_token`)

## Registro de usuarios

- Formulario: email, contraseña, confirmar contraseña, nombre de empresa (obligatorio)
- `company_name` se envía como `user_metadata` en `supabase.auth.signUp()`
- Trigger SQL `on_auth_user_created` → función `handle_new_user()` (SECURITY DEFINER)
- Inserta en `profiles` (id, email, company_name, role='client', is_active=true)
- Constraint `profiles_role_check`: solo permite `'admin'`, `'client'`, `'user'`

## Tablas Supabase

### profiles
id (=tenant_id), email, company_name, role (CHECK: admin/client/user), is_active, created_at, suspended_at

### leads
id, tenant_id, nombre, email, telefono, empresa, estado, lead_score, asignado_a (FK team_members), chatbot_activo, canal, instagram_user_id, instagram_username, resumen_conversacion, notas, campos_extra (JSONB), debounce_token, created_at

### interacciones
id, lead_id, tipo, detalle, puntos_score, created_at

### documentos_chatbot
id, tenant_id, canal, tipo, titulo, contenido, activo, origen, readonly_ui, created_at, updated_at

- `origen`: 'usuario' (lo rellena el dueño) o 'auto_generado' (lo genera el sistema via entrenamiento/auto-learn)
- `readonly_ui`: true para docs auto-generados (identidad_voz, calificacion, ejemplos_conversacion)
- Docs de usuario (editables): negocio, disponibilidad, faqs
- Docs auto-generados (readonly en UI): identidad_voz, calificacion, ejemplos_conversacion
- Docs admin-only: tecnicas_venta

- Constraint `documentos_chatbot_tipo_check`: CHECK tipo IN ('identidad_voz', 'negocio', 'calificacion', 'disponibilidad', 'faqs', 'ejemplos_conversacion', 'tecnicas_venta', 'patrones_aprendidos')
- Constraint `documentos_chatbot_canal_check`: CHECK canal IN valores permitidos (incluye 'general', NO permite 'master')
- Si se añade un nuevo tipo o canal, HAY QUE actualizar el constraint en Supabase con ALTER TABLE
- `tecnicas_venta` usa `canal = 'general'` y es invisible para clientes
- `identidad_voz` y `ejemplos_conversacion` pueden ser generados por WF7 (entrenamiento) o WF8 (auto-learn)

### configuracion_modulos
tenant_id, campos de config (citas, recordatorios, followups, canales, estilo, evolution_instance, instagram_page_id, instagram_access_token, instagram_webhook_verify_token, nombre_negocio, mensaje_bienvenida, media)

### team_members
id, tenant_id, nombre, color, rol_label, telefono, email, avatar_url, activo, created_at, updated_at
Miembros del equipo como etiquetas asignables. NO son usuarios con login. RLS por tenant_id. Soft-delete via activo=false.

### avatar_cliente
id, tenant_id, titulo, sector, tamano_empresa, cargo_decisor, problemas, motivaciones, objeciones_tipicas, presupuesto, canales_preferidos, notas, generado_por (usuario/agente/mixto), created_at, updated_at
Perfil del cliente ideal. Editable por usuario y por agente IA. RLS por tenant_id.

### citas
id, tenant_id, lead_id, asignado_a (FK team_members), fecha, hora, fecha_hora, duracion_minutos, estado, origen, gcal_event_id, gcal_meet_link, flags recordatorio
Unique constraint: tenant+fecha+hora+lead. FK lead_id con ON DELETE CASCADE. Realtime habilitado.

### fechas_bloqueadas
id, tenant_id, fecha, motivo. Unique: tenant+fecha.

### campanas_instagram
id, tenant_id, keyword, nombre, instrucciones, activa, fecha_inicio, fecha_fin. Unique: tenant+lower(keyword) donde activa=true. RLS por tenant_id. Se inyectan en el prompt del agente cuando canal=instagram.

### tenant_config
tenant_id, custom_fields JSON

### push_subscriptions
Para notificaciones push del CRM. RLS activo.

## Estados del pipeline (hardcoded)

```javascript
const COLUMNS = [
  { id: "nuevo",        label: "Nuevo",        color: "#6366f1", bg: "#eef2ff", icon: "✨" },
  { id: "contactado",   label: "Contactado",   color: "#0ea5e9", bg: "#f0f9ff", icon: "📞" },
  { id: "caliente",     label: "Caliente",     color: "#f59e0b", bg: "#fffbeb", icon: "🔥" },
  { id: "negociacion",  label: "Negociación",  color: "#8b5cf6", bg: "#f5f3ff", icon: "🤝" },
  { id: "reunion",      label: "Reunión",      color: "#f97316", bg: "#fff7ed", icon: "📅" },
  { id: "cliente",      label: "Cliente",      color: "#10b981", bg: "#ecfdf5", icon: "💎" },
];
```

**Nota**: los estados son dinámicos desde tabla `pipeline_estados`. Incluyen perdido/ganado. UI de gestión en Módulos pendiente (Fase 2B.3).

## API Routes (reemplazan n8n — migración completada)

| Route | Ex-WF | Descripción | Trigger |
|-------|-------|-------------|---------|
| `POST /api/webhooks/lead` | WF1 | Captura lead desde landing + WhatsApp bienvenida | POST desde landing |
| `POST /api/webhooks/lead-manual` | WF6 | Entrada manual lead + WhatsApp | POST desde CRM |
| `POST /api/webhooks/whatsapp` | WF2 | Chatbot WhatsApp Agente IA (Claude Sonnet) | Webhook Evolution API |
| `POST /api/ai/train` | WF7 | Entrenar agente (generar voz + calificacion + round 2) | POST desde CRM |
| `POST /api/ai/train/generate-scenarios` | — | Generar escenarios dinamicos por sector | POST desde CRM |
| `GET /api/cron/recordatorios` | WF4 | Recordatorios de citas | Vercel Cron cada hora |
| `GET /api/cron/followups` | WF5 | Follow-ups contextuales por bucket (silencio/tibio/rechazo) | Vercel Cron cada 2h |
| `GET /api/cron/auto-learn` | WF8 | Auto-learn bidireccional (éxitos + fracasos) | Vercel Cron 3AM diario |
| `GET /api/cron/monitor-agent` | — | Monitor salud agente: auto-learn, docs incompletos | Vercel Cron 8AM diario |
| `GET /api/admin/metrics` | — | Métricas del agente: estados, recuperación, auto-learn, follow-ups, docs | GET desde CRM (admin) |
| `POST /api/admin/clients` | — | Alta de cliente (createUser + email set-password). `DELETE` = baja + borra auth user | POST/DELETE desde CRM (admin) |
| `POST /api/admin/clients/resend` | — | Reenvía el email de "establecer contraseña" | POST desde CRM (admin) |
| `GET /auth/callback` | — | Puerta de los enlaces Supabase (PKCE / token_hash) → `/auth/set-password` | Click en email |

### Alta de clientes (set-password)
- Admin crea el cliente en `/admin` → `createUser({ email_confirm:true })` (el trigger `on_auth_user_created` crea profile `role='client'` + pipeline + módulos) → `resetPasswordForEmail`.
- Cliente: email → `/auth/callback` → `/auth/set-password` (define contraseña) → CRM.
- Página pública `/auth/set-password` (client) + ruta `/auth/callback` (server). Middleware deja pasar `/auth/*` siempre.
- Verificación admin server-side: `requireAdmin()` en `lib/supabase/server.ts` (chequea `profiles.role==='admin'`).
- Requiere env `NEXT_PUBLIC_SITE_URL` + Redirect URLs en Supabase (`/auth/callback`, `/auth/set-password`).

### Seguridad
- Webhooks públicos (lead, lead-manual, whatsapp): rate limiting por IP
- Endpoints admin (`/api/admin/clients*`): `requireAdmin()` + rate limit por IP
- Cron jobs: verificación de CRON_SECRET header
- Sentry configurado para error tracking

## Vistas del CRM

| Vista | Componente | Descripción |
|-------|-----------|-------------|
| Dashboard | app/(dashboard)/page.tsx | Estadísticas y gráficos |
| Pipeline | app/(dashboard)/pipeline/ | Kanban drag-and-drop + vista Lista |
| Agente IA | app/(dashboard)/agent/ | Config agente: 3 tabs (usuario / auto-generado / admin) |
| Entrenar Agente | app/(dashboard)/agent/train/ | Escenarios dinamicos por sector + segunda ronda |
| Calendario | app/(dashboard)/calendar/ | Citas visuales |
| Chat | app/(dashboard)/chat/ | Conversaciones WhatsApp read-only |
| Módulos | app/(dashboard)/modules/ | Config por tenant |
| Empresa | app/(dashboard)/empresa/ | Datos empresa + equipo + avatar cliente (3 tabs) |
| Métricas Agente | app/(dashboard)/admin/metricas/ | Métricas del agente IA (admin) |
| Admin Panel | app/(dashboard)/admin/ | Solo rol admin |

## Componentes clave

- `components/KanbanColumn.tsx` — Columna con drag-and-drop
- `components/LeadCard.tsx` — Tarjeta de lead en kanban
- `components/LeadDetail.tsx` — Panel lateral con ficha completa del lead
- `components/NewLeadModal.tsx` — Formulario de nuevo lead con selector prefijo + WhatsApp
- `components/ScoreBadge.tsx` — Badge de score con color por nivel
- `src/ModulosConfig.jsx` — Config módulos (wrapper en app/modules/)
- `src/ChatView.jsx` — Conversaciones (wrapper en app/chat/)
- `src/ChatbotConfig.jsx` — Config agente (wrapper en app/agent/)
- `src/CalendarioCitas.jsx` — Calendario (wrapper en app/calendar/)
- `src/EntrenarAgente.jsx` — Entrenamiento (wrapper en app/agent/train/)

## System Prompt del Agente IA (build-prompt.ts)

El prompt se construye dinámicamente por tenant. Secciones principales:
1. **Contexto dinámico**: docs del tenant (identidad, negocio, calificación, etc.)
2. **Módulo citas** (condicional): solo si citas_activo=true, incluye calendario
3. **Objetivo CTA** (condicional): si citas OFF, inyecta CTA del doc negocio
4. **Formato de escritura**: reglas de WhatsApp (2 frases max, sin markdown)
5. **Reglas de comunicación**: tono, muletillas, prohibiciones
6. **Reglas de comportamiento**: con cooldown de 3 turnos para re-proponer CTA
7. **Manejo de objeciones**: principios (no frases fijas) para 6 tipos de objeción
8. **Adaptación al lead**: el agente adapta formalidad/emojis/longitud al registro del lead dentro de los límites del tenant
9. **Regla de precios**: condicional según citas ON/OFF y política del doc negocio
10. **Sistema de citas**: tags [CITA:] solo si citas ON
11. **Patrones aprendidos**: inyección de `patrones_aprendidos` (éxitos + fracasos del auto-learn)
12. **Scoring**: rangos dinámicos del pipeline
13. **Resumen**: acumulativo por conversación

## Auto-Learn (WF8) — Flujo bidireccional

1. Cron 3AM → para cada tenant activo
2. Lee estados del pipeline (`es_ganado`, `es_perdido`) del tenant
3. Busca leads exitosos (ganados) y fallidos (perdidos) actualizados en 24h
4. Extrae conversaciones de ambos grupos
5. Claude analiza patrones en paralelo: éxitos (qué funcionó) + fracasos (qué falló y alternativas)
6. Genera/actualiza doc `patrones_aprendidos` con truncado inteligente por sección (max 10K chars)
7. Registra telemetría en `auto_learn_ejecuciones`

## Follow-ups (WF5) — Clasificación por buckets

1. Cron cada 2h → para cada tenant con follow-ups activos
2. Para cada lead elegible, obtiene su ÚLTIMO mensaje
3. Clasifica en bucket: SILENCIO (interés → sin respuesta), TIBIO (respuesta vaga), RECHAZO (explícito)
4. Clasificación: keywords primero, Claude Haiku como fallback para ambiguos
5. Genera mensaje adaptado al bucket y al módulo de citas del tenant
6. Si bucket=RECHAZO y ya hubo follow-up RECHAZO previo → desactiva `chatbot_activo`
7. Registra `ultimo_followup_bucket` en el lead

## Legacy (src/)

- `src/App.jsx` — Legacy Vite. Solo se importa `App.css`. El componente no se usa.
- Los componentes individuales de src/ se importan via wrappers en app/(dashboard)/
- Migración gradual a TSX cuando se toquen para añadir features

## Clientes activos

| Cliente | Tenant ID | Estado |
|---------|-----------|--------|
| M&T Consulting | `a308bc5d-8cd6-4096-bacb-6aa184be9678` | Completo |
| Itzalki Toldoak | `aaad6c28-45d1-4b60-bc89-7549eed0ebdf` | Captura leads + chatbot |

## URLs de infraestructura

- **Evolution API**: `https://n8n-evolution-api.eh3kh7.easypanel.host`
- **CRM Frontend**: Vercel (repo `mytconsulting/myt-crm-app`)
- **n8n**: `https://n8n-n8n.eh3kh7.easypanel.host` (LEGACY — workflows desactivados, solo backup)
