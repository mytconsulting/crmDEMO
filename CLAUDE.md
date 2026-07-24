# M&T CRM — Guía de desarrollo

> ⚠️ **ESTA ES LA BUILD DEMO (no el CRM real).**
> - **Sin Supabase, sin servidor, sin cuentas.** Todos los datos viven en el `localStorage`
>   del navegador. El cliente Supabase del navegador está reemplazado por un mock
>   (`lib/demo/client.ts` + `lib/demo/store.ts`); `lib/supabase/client.ts` solo reexporta el mock.
> - **Sin login**: el `middleware.ts` es no-op; se entra directo. Usuario fijo `DEMO_USER`.
> - **Módulos activos**: Dashboard, Pipeline/Kanban, Calendario, Empresa (empresa/equipo/avatar) y
>   **Chat** (bandeja mock con `interacciones` sembradas). Además, **zonas informativas** (páginas
>   explicativas sin funcionalidad, estilo landing interno): **Agentes** (`/agent`, los 2 agentes IA
>   Setter/Soporte), **Soporte** (`/soporte`, ciclo de vida del ticket y pausa/reactivación del agente),
>   **Recursos** (`/recursos`, biblioteca de materiales del agente) y **Workflows** (`/workflows`,
>   automatizaciones). El resto (Integraciones, Admin, Campañas, Módulos, webhooks, cron) se ha **eliminado**.
> - **Solo vista de CLIENTE (tenant)**: la demo NO incluye pantallas de administrador/agencia. Por eso se
>   quitó **Rendimiento** (cockpit multi-cliente): un cliente no lo vería.
> - **Botón "Reiniciar demo"** (esquina inferior izquierda, `components/DemoResetButton.tsx`):
>   borra el localStorage y vuelve a sembrar los datos de ejemplo (`resetDemo()` en `lib/demo/store.ts`).
> - Este repo/proyecto Vercel debe ser **independiente** del CRM oficial (`mytconsulting/myt-crm-app`).
>   Gran parte de la guía de abajo (Supabase, n8n, IA, migraciones) **no aplica** a la demo.
> - **Identidad SmartFunnel (rebrand 2026-07-24)**: la demo usa la marca **SmartFunnel** (el CRM
>   oficial se renombró de "M&T CRM" a SmartFunnel). Fuentes Space Grotesk / JetBrains Mono, paleta
>   `--tide #16D998` / `--ink #0B0F14`, logo = símbolo de barras + wordmark, favicon/PWA `smartfunnel-*`.
> - **NUNCA emojis en la UI**: usar iconos monocromos de `components/crm-icons.tsx` (`Icon` + catálogo `I`).

CRM + Setter IA multi-tenant para PYMEs. Cada tenant tiene datos aislados (RLS), agente IA multi-canal (WhatsApp, Instagram), sistema de citas, follow-ups inteligentes y módulos configurables. Full-stack Next.js en Vercel, backend en Supabase.

## Stack

- **Framework**: Next.js (App Router) — Vercel
- **Backend/DB**: Supabase (PostgreSQL + RLS + Migraciones)
- **IA (agente setter)**: Claude Sonnet 4.6 (principal) — Vercel AI SDK
- **IA (fallback)**: GPT-4o (si Anthropic cae)
- **IA (tareas ligeras)**: Claude Haiku 4.5 (scoring, clasificación)
- **WhatsApp**: Evolution API self-hosted (futuro: Meta Business API)
- **Calendario**: Google Calendar OAuth2
- **Error tracking**: Sentry + alertas Slack #developers
- **Email**: NO se usa envío de emails (ni Resend, ni Gmail API). Solo WhatsApp e Instagram.
- **Migración n8n**: COMPLETADA — 7/7 workflows migrados a API Routes (n8n sigue activo como respaldo)

## Estructura del proyecto (actual en develop)

```
app/                        # Next.js App Router
├── (auth)/                 # Login + Registro
├── (dashboard)/            # Rutas protegidas del CRM
│   ├── pipeline/           # Kanban + Lista
│   ├── calendar/           # Calendario de citas
│   ├── chat/               # Conversaciones WhatsApp/IG
│   ├── agent/              # Config Agente IA
│   ├── agent/train/        # Entrenar Agente
│   ├── modules/            # Config módulos por tenant
│   ├── empresa/            # Empresa + Equipo + Avatar Cliente
│   └── admin/              # Panel admin + super-admin
├── api/                    # API Routes (reemplazan n8n)
│   ├── webhooks/lead/      # WF1: Captura lead desde landing
│   ├── webhooks/lead-manual/ # WF6: Entrada manual + WhatsApp
│   ├── webhooks/whatsapp/  # WF2: Agente IA chatbot WhatsApp
│   ├── webhooks/instagram/ # Agente IA chatbot Instagram DMs
│   ├── ai/train/           # WF7: Entrenar agente (generar voz)
│   └── cron/               # WF4: Recordatorios, WF5: Follow-ups, WF8: Auto-learn
├── layout.tsx              # Layout global
└── page.tsx                # Redirect
components/                 # Sidebar, LeadCard, KanbanColumn, LeadDetail, NewLeadModal, ScoreBadge
lib/                        # Supabase client/server, AI config, constants, types, notifications
  ├── chatbot/              # build-prompt.ts, parse-response.ts (WF2 + Instagram)
  ├── instagram.ts          # Cliente Meta Graph API (DMs Instagram)
  ├── messaging.ts          # Dispatcher multi-canal (WA/IG)
types/                      # TypeScript types
```

> **Nota**: estructura objetivo post-migración. Durante la migración, convive con `src/` hasta completar.

## Comandos

```bash
npm run dev       # Servidor desarrollo (Next.js)
npm run build     # Build producción
npm run start     # Preview del build
npm run lint      # ESLint
```

## Despliegue

- Push a `main` → Vercel auto-deploy
- Hard refresh (Cmd+Shift+R) después de deploy para evitar caché

## Reglas de desarrollo

1. **Multi-tenant siempre**: filtrar por `tenant_id` en queries y RLS
2. **No hardcodear contexto de cliente**: todo debe funcionar para cualquier tenant
3. **Modularidad**: preguntarse siempre "funciona si el modulo esta OFF?"
4. **Preguntar antes de commit/push**: nunca hacer commit+push sin permiso
5. **TypeScript**: todo archivo nuevo en `.tsx`/`.ts`. Migración gradual de `.jsx` existentes
6. **Constraints Supabase**: actualizar CHECK constraints ANTES de insertar nuevos valores
7. **Migraciones Supabase**: todo cambio de schema via `supabase migration new`, nunca ALTER manual
8. **Tests**: todo API route crítico debe tener test (agente IA, captura lead, envío mensajes)
9. **Rate limiting**: todo webhook público debe tener verificación de firma + rate limit
10. **Campo nombre**: usar `lead.nombre || lead.nome` para compatibilidad
11. **n8n (legacy)**: workflows activos en n8n hasta completar migración. No tocar sin backup

## Documentacion del proyecto

> Detalles en archivos especializados. Lee el relevante antes de empezar una tarea.

```
.claude/docs/
├── architecture.md    # Servicios, tablas, workflows, clientes, URLs, estados pipeline
├── fixes.md           # Bugs resueltos: sintoma, causa, solucion, archivos
├── decisions.md       # Decisiones tecnicas y por que se tomaron
├── conventions.md     # Naming, estilos, patrones, reglas de n8n/Supabase/Git
├── integrations.md    # APIs externas, credenciales (IDs), endpoints, webhooks

.claude/sessions/      # Logs de sesiones de trabajo

docs/
├── ROADMAP-EMANTICRM.md          # Plan maestro: 7 fases de desarrollo
├── GUIA-RAMAS-PARA-EQUIPO.md     # Guia no-tecnica de ramas para el equipo
├── SOP-onboarding-nuevo-cliente.md # Onboarding paso a paso

plantillas-agentes/
├── GUIA-CAMBIOS-N8N.md            # Guia chatbot dinamico por tenant
├── PROMPT-LANDING-BACKEND.md      # Config landing pages
```

## Reglas de documentacion

- Cuando el usuario diga "guarda esto", "apunta esto" o "actualiza la doc", NO escribas en `CLAUDE.md`. Identifica el archivo correcto en `.claude/docs/` y actualizalo ahi.
- `CLAUDE.md` solo se modifica cuando cambia el stack, los comandos, las convenciones globales o el mapa de documentacion.
- Cuando resuelvas un bug, añade una entrada en `fixes.md` automaticamente al final de la sesion, sin que te lo pida.
- Cuando tomes una decision tecnica relevante (elegir libreria, cambiar arquitectura, descartar enfoque), añade entrada en `decisions.md`.
- Al cerrar una sesion de trabajo importante, crea un archivo en `.claude/sessions/` con formato `YYYY-MM-DD-tema-corto.md` resumiendo: que se hizo, que quedo pendiente, archivos clave tocados.
- Antes de empezar una tarea nueva, si el tema tiene historial, lee primero el archivo relevante de `.claude/docs/` en lugar de asumir contexto.
- Si `CLAUDE.md` supera las 150 lineas, proponer mover secciones a archivos especializados.
