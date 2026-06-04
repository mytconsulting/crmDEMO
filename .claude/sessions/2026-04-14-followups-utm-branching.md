# Sesion 2026-04-14 — Follow-ups Claude + UTM Tracking + Supabase Branching

## Que se hizo

### 1. Fix follow-ups (GPT → Claude Sonnet)
- `app/api/cron/followups/route.ts` — modelo GPT-4o → models.principal (Claude Sonnet 4.6)
- Añadida tonalidad del tenant (estilo_formalidad, estilo_emojis, estilo_longitud)
- Añadidas reglas de formato (prohibido ¡¿, sin asteriscos)
- Añadido fallback a GPT-4o si Claude falla
- `app/api/ai/train/route.ts` — GPT-4o → Claude Sonnet (2 llamadas paralelas)
- `app/api/cron/auto-learn/route.ts` — GPT-4o → Claude Sonnet

### 2. Fase 1 — UTM Tracking (parcial)
- Migración SQL: columnas UTM en leads + tabla campanas + rol super_admin
- `supabase/migrations/20260414100000_add_utm_campanas_superadmin.sql`
- API captura lead acepta UTMs: `app/api/webhooks/lead/route.ts`
- Types actualizados: `types/lead.ts`, `lib/types.ts`
- LeadDetail muestra UTMs (seccion "Origen del Lead"): `components/LeadDetail.tsx`
- Panel /campaigns (v1): `app/(dashboard)/campaigns/page.tsx`
- Sidebar: añadido item Campañas (solo admin): `components/Sidebar.tsx`
- Layout: título para /campaigns: `app/(dashboard)/layout.tsx`

### 3. Supabase Branching
- Activado branching para el proyecto M&T CRM
- Rama develop creada: `tuwwopvpbhjqlselfzhe`
- Todas las migraciones aplicadas a BD develop
- `.env.local` actualizado para apuntar a BD develop (no producción)
- Usuario admin creado en develop: contacto@mytconsulting.es
- Fix: trigger push-on-lead-change comentado en migración base (no existe en develop)

## FALLO GRAVE documentado
- Se aplicaron migraciones SQL a producción sin Supabase Branching activo
- Las migraciones eran aditivas (ADD COLUMN, CREATE TABLE) — no rompieron nada
- Pero si hubieran sido destructivas, se habrían perdido datos de clientes
- Memoria de feedback creada para que no vuelva a pasar

### 4. Modal "Perdido" con motivos
- LeadDetail: modal con 7 motivos al cambiar a estado perdido (dropdown)
- Pipeline Kanban: modal al arrastrar lead a columna perdido (drag & drop)
- Motivo guardado en campo `motivo_perdida` de leads
- Motivo visible en header de LeadDetail cuando lead está perdido
- Fix: DROP constraint `leads_estado_check` (impedía valores fuera del hardcoded)

### 5. Pipeline mejorado
- Columnas ganado/perdido protegidas: no se pueden borrar
- Flechas reordenar columnas (◀ ▶) en cada columna del Kanban
- Valor en rojo en columna Perdido (con signo negativo)
- Auto-seed de estados al registrar nuevo tenant (`handle_new_user`)

### 6. Dashboard — métricas de pérdidas
- 3 nuevas stat cards: Leads Perdidos, Revenue Perdido, Tasa de Pérdida
- Tabla de leads perdidos con nombre, valor, motivo y fecha

### 7. Script UTM para landings
- `public/utm-tracker.js` — captura UTMs del URL y los envía con el formulario

### 8. Vercel env vars separadas por entorno
- Production → BD producción (ccmcmcfzyezqtrswjpyv)
- Preview/develop → BD develop (tuwwopvpbhjqlselfzhe)

### 9. Code review pre-commit — fixes aplicados
- `.gitignore`: añadido tsconfig.tsbuildinfo
- UTM first-touch attribution: no sobreescribe UTMs existentes
- `operationRef` con try/finally (pipeline drop)
- `EstadoPipeline` = string (dinámico, ya no hardcodeado)
- `MOTIVOS_PERDIDA` compartido desde lib/constants.ts
- DROP constraint leads_estado_check (era la causa raíz del bug "Perdido")

## Que quedo pendiente
- Probar UTM tracker en una landing real (anuncios nuevos, no tocar activos)
- Meta Ads API (Opción A) para gasto automático (~1 semana)
- Instagram DMs (Fase 5, no urgente)
- UI gestión estados pipeline en ModulosConfig
- Trigger updated_at en tabla campañas (menor)

## Archivos tocados
- app/api/cron/followups/route.ts
- app/api/ai/train/route.ts
- app/api/cron/auto-learn/route.ts
- app/api/webhooks/lead/route.ts
- components/LeadDetail.tsx
- components/Sidebar.tsx
- app/(dashboard)/layout.tsx
- app/(dashboard)/campaigns/page.tsx (NUEVO)
- types/lead.ts
- lib/types.ts
- supabase/migrations/20260414100000_add_utm_campanas_superadmin.sql (NUEVO)
- supabase/migrations/20260412094446_remote_schema.sql (trigger comentado)
- .env.local (apunta a BD develop)
