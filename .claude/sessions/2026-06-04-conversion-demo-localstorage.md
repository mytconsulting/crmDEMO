# 2026-06-04 — Conversión a DEMO autónoma (localStorage) + publicación aislada

## Objetivo
Convertir esta copia del CRM en una **demo pública** que cualquiera pueda probar sin cuenta:
datos en `localStorage` del navegador (sin Supabase, sin servidor, sin login), con módulos
básicos y un botón de "reiniciar demo". Requisito crítico del cliente: **no tocar el CRM oficial**.

## Punto de partida peligroso (detectado al empezar)
La carpeta se llamaba `myt-crn-demo` pero **NO estaba aislada**:
- `git remote origin` → `github.com/mytconsulting/myt-crm-app` (repo OFICIAL).
- `.vercel/project.json` → proyecto `myt-crm-app` (Vercel OFICIAL).
Es decir, un push a `main` habría desplegado en producción del CRM real.

### Medidas de aislamiento (antes de tocar nada)
- `git remote remove origin` (URL guardada en `.official-remote-backup.txt`, gitignored).
- `.vercel` → renombrado a `.vercel.official.bak` (gitignored).
- Verificado que ningún `.env*` está trackeado.

## Qué se hizo (la demo)
- **`lib/demo/store.ts`**: "base de datos" en `localStorage` (clave `mtcrm_demo_v1`) con datos de
  ejemplo (10 leads por columnas, 2 team members, etiquetas, 3 citas de la semana, avatar,
  configuracion_modulos, profiles, pipeline_estados con columna `perdido`). `DEMO_USER` fijo.
  `resetDemo()` borra y resiembra.
- **`lib/demo/client.ts`**: mock del cliente Supabase. Implementa el query builder encadenable
  (`from().select/insert/update/upsert/delete + eq/neq/in/gte/lte/order/limit/single/maybeSingle`),
  resuelve los joins usados (`leads→team_member`, `lead_etiquetas→etiquetas`), y stubs de
  `auth`, `storage`, `channel/removeChannel`, `rpc`. Es *thenable* (funciona con `await` y `.then`).
- **`lib/supabase/client.ts`**: ahora solo `export { createClient } from '@/lib/demo/client'`
  → todas las páginas siguen funcionando **sin tocarlas**.
- **`components/DemoResetButton.tsx`**: botón flotante "Reiniciar demo" (abajo-izquierda) con
  confirmación; llama a `resetDemo()` y recarga.
- **Sidebar / NewLeadModal**: recortados (sin logout, sin envío WhatsApp).
- **Módulos activos**: Dashboard, Pipeline/Kanban, Calendario, Empresa (empresa/equipo/avatar).
- **Eliminado**: `app/api/**`, `app/(auth)`, `app/auth`, rutas agent/chat/admin/campaigns/modules/
  integrations/team; `middleware.ts`; libs server-only (`google-calendar`, `chatbot`, `ai`,
  `evolution`, `instagram`, `messaging`, `rate-limit`, `site-url`, `crypto`, `supabase/server`);
  legacy `src/*.jsx`; **Sentry** completo; `supabase/**` (ver fix de secreto); crons de `vercel.json`.

## Incidencias resueltas (ver fixes.md)
1. **Build Vercel inválido** por `middleware.ts` con `matcher: []` → eliminado el middleware.
2. **Secreto en el historial**: al subir el historial completo, GitHub detectó una *Supabase
   Service Key* en una migración (`...remote_schema.sql`, commit `f90494b`). Se **reescribió el repo
   a un único commit limpio** (orphan + force-push) y se quitó `supabase/`. ⚠️ La clave sigue
   requiriendo **rotación en Supabase** (afecta al CRM oficial) — PENDIENTE del cliente.
3. **404 en Vercel pese a build OK**: el proyecto `crm-demo` quedó en estado roto (ni `project ls`
   lo encontraba; hasta `/_next/static/*` daba `X-Vercel-Error: NOT_FOUND`). Solución: **deploy
   limpio por CLI** a un proyecto nuevo `myt-crn-demo`.

## Estado final
- **Repo**: `github.com/mytconsulting/crmDEMO` (privado, independiente del oficial), rama `main`,
  historial limpio (1 commit base).
- **Vercel**: proyecto `myt-crn-demo` (team `mytconsultings-projects`), conectado a `crmDEMO`
  → **auto-deploy** en cada push a `main`.
- **URL pública (verificada 200)**: **https://myt-crn-demo.vercel.app**
  (la URL larga del deployment da 401 por Deployment Protection en previews; el dominio de
  producción es público).
- Build local OK: `/`, `/pipeline`, `/calendar`, `/empresa` → 200.

## Pendiente
- [ ] **Cliente**: rotar la Supabase `service_role` key expuesta y actualizar el env del CRM
      oficial (Vercel `myt-crm-app`, n8n, etc.). Marcar la alerta de GitHub como *Revoked*.
- [ ] (Opcional) Borrar el proyecto Vercel viejo `crm-demo` (roto) para evitar confusión.
- [ ] (Opcional) Limpiar de la carpeta local `.vercel.official.bak/` y `.official-remote-backup.txt`.
- [ ] (Opcional) `README.md` propio del repo demo; ajustar datos de ejemplo si se quiere.

## Archivos clave tocados
`lib/demo/store.ts`, `lib/demo/client.ts`, `lib/supabase/client.ts`,
`components/DemoResetButton.tsx`, `app/(dashboard)/layout.tsx`, `components/Sidebar.tsx`,
`components/NewLeadModal.tsx`, `src/CalendarioCitas.tsx`, `next.config.js`, `vercel.json`, `CLAUDE.md`.
