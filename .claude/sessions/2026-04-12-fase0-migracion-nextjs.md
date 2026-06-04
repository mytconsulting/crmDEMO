# Sesión 2026-04-12 — Fase 0: Migración a Next.js

## Participantes
Eneko + Ekaitz + Claude Code

## Qué se hizo

### Bloque 1 — Ramas Git
- Creadas ramas `develop` y `staging` desde `main`
- Todo el trabajo en `develop`, producción intacta

### Bloque 2 — Configurar Vercel
- Verificado: `main` es producción, preview deployments activos
- Framework preset cambiado de Vite a Next.js
- Variables de entorno `NEXT_PUBLIC_SUPABASE_*` añadidas

### Bloque 3 — Migración Vite → Next.js (el gordo)
- Next.js 15.5 instalado, Vite eliminado de dependencias
- TypeScript + ESLint configurados
- `app/layout.tsx` con metadata y estilos globales
- `middleware.ts` — autenticación Supabase SSR
- Login y Registro migrados a `app/(auth)/`
- Dashboard layout con sidebar, notificaciones, top bar dinámico
- Dashboard page con estadísticas y gráficos Recharts
- Pipeline completo: Kanban (drag-and-drop), Lista (sort, expandible), búsqueda
- Componentes extraídos: Sidebar, LeadCard, KanbanColumn, LeadDetail, NewLeadModal, ScoreBadge
- Vistas restantes via wrappers: Agent, Train, Calendar, Chat, Modules
- Admin Panel reescrito completo con TenantConfigModal
- Sistema de notificaciones con sonido via Context + portal en top bar
- Deploy preview en Vercel funcionando

### Bloque 4 — Supabase Branching
- Supabase CLI instalado (v2.84.2) + `supabase init` + `supabase link`
- `supabase db pull` — schema completo como migración base (1454 líneas)
- Supabase Branching activado (GitHub Integration + Vercel Integration)
- Variables de Supabase inyectadas automáticamente en Vercel

### Bloque 5 — Calidad
- Sentry instalado: error tracking, session replay, tracing, logs, tunnel
- Alertas Sentry → Slack #developers configuradas
- AI SDK: @ai-sdk/anthropic + @ai-sdk/openai + lib/ai/config.ts
- Types TypeScript: Lead, Profile, Cita, ConfiguracionModulos
- Docker Desktop instalado (necesario para Supabase CLI)

## Fixes aplicados durante la sesión
- `useMemo(() => createClient(), [])` en todos los archivos — evitar loop infinito de re-renders
- `usePathname()` movido antes de returns condicionales — fix hooks order
- `typeof window` guard en notifications.js — fix SSR prerender
- Notifications Context + portal — sonido desde gesto de usuario
- Placeholder client en Supabase — evitar fallo prerender sin env vars
- next.config.js corregido — mezcla export default / module.exports por Sentry wizard

## Qué quedó pendiente
- [x] Crear API key Anthropic para M&T Consulting (hecho 2026-04-13)
- [x] Añadir ANTHROPIC_API_KEY y OPENAI_API_KEY en Vercel (hecho 2026-04-13)
- [x] Fase 0.5: migrar workflows n8n a API Routes (hecho 2026-04-12)
- [x] Borrar `app/sentry-example-page/` después de verificar (hecho 2026-04-19)
- [ ] Pulir responsive (no revisado a fondo)
- [ ] Configurar Sentry con Telegram (alternativa a Slack)

## Archivos clave tocados
- `app/` — toda la estructura Next.js
- `components/` — 6 componentes extraídos
- `lib/` — supabase, ai, constants, types, notifications-context
- `types/` — 4 archivos de tipos
- `middleware.ts` — auth guard
- `next.config.js` — config Next.js + Sentry
- `supabase/` — config.toml, migrations
- `package.json` — dependencias actualizadas
- `src/notifications.js` — fix SSR

## Commits en develop
1. `feat: migrar de Vite a Next.js App Router`
2. `fix: evitar fallo de prerender cuando faltan variables Supabase`
3. `chore: trigger Vercel preview deployment para develop`
4. `chore: trigger Vercel preview con framework Next.js configurado`
5. `feat: configurar Supabase CLI con migración base del schema`
6. `feat: configurar Sentry, AI SDK y types base — Bloque 5`
