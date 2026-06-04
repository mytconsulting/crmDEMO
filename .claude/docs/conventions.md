# Convenciones de código

## Idioma

- **Código**: inglés para nombres de variables/funciones, español para strings de UI
- **Commits**: español, formato: `feat: descripción` / `fix: descripción` / `docs: descripción`
- **Documentación**: español

## Estructura de archivos (Next.js App Router)

```
app/                        # Next.js App Router
├── (auth)/                 # Rutas de autenticación
├── (dashboard)/            # Rutas protegidas del CRM
│   ├── pipeline/
│   ├── calendar/
│   ├── chat/
│   ├── agent/
│   ├── modules/
│   ├── team/
│   └── admin/
├── api/                    # API Routes (reemplazan n8n)
│   ├── webhooks/           # Webhooks (WhatsApp, Instagram, landings)
│   ├── ai/                 # Agente IA, follow-ups, auto-learn
│   ├── leads/              # CRUD leads
│   ├── cron/               # Cron jobs
│   └── integrations/       # WhatsApp, email, calendar
components/                 # Componentes React reutilizables
lib/                        # Utilidades, clients, config
types/                      # TypeScript types
```

## TypeScript

- **Todo archivo nuevo** debe ser `.tsx` / `.ts`
- Migración gradual de archivos `.jsx` existentes
- Definir types para entidades principales en `types/` (Lead, Tenant, Cita, etc.)

## Naming

- Componentes React: PascalCase (`LeadCard`, `KanbanColumn`)
- Funciones/handlers: camelCase (`handleDrop`, `fetchLeads`)
- Estados del pipeline: snake_case (`nuevo`, `contactado`, `negociacion`)
- Tablas Supabase: snake_case (`documentos_chatbot`, `configuracion_modulos`)
- Campos de BD: snake_case (`tenant_id`, `lead_score`, `chatbot_activo`)

## Supabase

- Siempre filtrar por `tenant_id` en queries del frontend
- En n8n: usar `fieldId` (no `fieldName`) en nodos Supabase
- Constraints CHECK: actualizar ANTES de intentar insertar nuevos valores
- RLS: toda tabla nueva debe tener policy `tenant_id = auth.uid()`
- GRANTs: toda migración que cree tabla debe incluir `GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabla TO authenticated; GRANT ... TO service_role;` (Supabase ya no expone tablas por defecto desde oct 2026)

## CSS

- Estilos inline para elementos críticos (evita problemas de caché en Vercel)
- Breakpoints: 1024px (tablet), 768px (mobile), 400px (small mobile)
- BEM-like naming en App.css

## Compatibilidad

- Campo nombre: usar `lead.nombre || lead.nome` para compatibilidad con datos legacy

## n8n (LEGACY — en proceso de eliminación)

> Todos los workflows se están migrando a API Routes en Next.js. Estas reglas aplican mientras n8n siga activo.

- Supabase en n8n: SIEMPRE usar fieldId (no fieldName)
- Code nodes no soportan `getCredentials`: usar nodos Supabase con fieldId o HTTP Request
- `alwaysOutputData: true` en nodos que pueden devolver 0 items
- WF2: NUNCA editar sin backup previo (47 nodos, 87KB, riesgo de truncamiento)
- Al editar WF por API: verificar que el JSON resultante tiene el mismo número de nodos

## API Routes (Next.js)

- Webhooks públicos: siempre verificar firma + rate limiting
- Supabase server client: usar `createServerClient` con service_role para operaciones cross-tenant
- Supabase browser client: usar anon key con RLS
- IA: usar Vercel AI SDK con Claude Sonnet 4.6 como modelo principal
- Cron jobs: configurar en `vercel.json` con path a API Route
- Error handling: capturar con Sentry, devolver errores genéricos al cliente

## Git

- Email: `contacto@mytconsulting.es`
- Repo: `mytconsulting/myt-crm-app`
- Nunca commit+push sin permiso del usuario
- Branch de producción: `main`
- Branch de desarrollo: `develop`
- Branch de staging: `staging`
- Feature branches: desde `develop`, merge via PR
- Migraciones Supabase: `supabase migration new [nombre]`, nunca ALTER manual
