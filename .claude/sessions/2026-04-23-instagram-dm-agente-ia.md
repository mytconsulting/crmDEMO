# Sesion 2026-04-23/24 — Agente IA en Instagram DMs

## Que se hizo

### Sesion 1 (2026-04-23) — Core
- Implementacion completa del agente IA de Instagram DMs (replica el flujo de WhatsApp WF2)
- Migracion SQL: campos Instagram en `configuracion_modulos`, `leads`, `interacciones`
- `lib/instagram.ts`: cliente Meta Graph API (getConfig, resolveByPageId, sendDM)
- `lib/messaging.ts`: dispatcher multi-canal (sendMessage, resolveChannel, interactionType)
- `app/api/webhooks/instagram/route.ts`: webhook completo (GET challenge + POST agente IA)
- Cron jobs actualizados a multi-canal: followups (WF5) y recordatorios (WF4)
- UI ModulosConfig: seccion credenciales Instagram (Page ID, Access Token, Verify Token)
- UI ChatView: badge WA/IG, busqueda por instagram_username, isOutgoing incluye Instagram
- Types actualizados: modulos.ts + lead.ts con campos Instagram

### Sesion 2 (2026-04-24) — Prompt canal-aware + Campanas + OAuth
- `build-prompt.ts`: nuevo parametro `canal` (whatsapp/instagram), prompt adaptado por canal
- Instagram: tono mas casual, mas rapport antes de CTA, instrucciones para leads frios
- Todas las refs a "WhatsApp" en el prompt son dinamicas segun canal
- Nueva tabla `campanas_instagram` (keyword, nombre, instrucciones, activa, fechas) con RLS
- Campanas activas se inyectan en el prompt cuando canal=instagram
- UI en ModulosConfig: CRUD de campanas (crear, pausar, activar, eliminar)
- OAuth Meta: boton "Conectar Instagram" que hace Facebook Login y guarda tokens automaticamente
- Rutas OAuth: /api/auth/instagram, /api/auth/instagram/callback, /api/auth/instagram/disconnect
- UI ModulosConfig: boton Conectar/Desconectar en vez de inputs manuales para clientes

## Archivos nuevos

- `supabase/migrations/20260423130000_add_instagram_support.sql`
- `supabase/migrations/20260424100000_add_campanas_instagram.sql`
- `lib/instagram.ts`
- `lib/messaging.ts`
- `app/api/webhooks/instagram/route.ts`

## Archivos editados

- `lib/chatbot/build-prompt.ts` — parametro canal, prompt adaptado WA/IG, inyeccion campanas
- `app/api/webhooks/instagram/route.ts` — pasa canal='instagram' a buildPrompt
- `app/api/cron/followups/route.ts` — usa messaging dispatcher
- `app/api/cron/recordatorios/route.ts` — usa messaging dispatcher
- `src/ModulosConfig.jsx` — seccion Instagram (credenciales + CRUD campanas)
- `src/ChatView.jsx` — badge canal, busqueda IG, isOutgoing
- `types/modulos.ts` — campos Instagram
- `types/lead.ts` — instagram_user_id, instagram_username
- `.claude/docs/architecture.md` — diagrama + tablas actualizadas
- `.claude/docs/integrations.md` — seccion Instagram Messaging API
- `.claude/docs/decisions.md` — decisiones arquitectura Instagram

## Estado actual (2026-04-23)

- [x] Codigo completo: webhook, lib, dispatcher, UI, types, migracion SQL
- [x] Migracion SQL aplicada en Supabase (success)
- [x] Commit + push a develop (`7c388d5`)
- [x] Vercel deploy: permiso de equipo corregido, deploy en marcha
- [x] Migración SQL campanas_instagram aplicada en Supabase (success, 2026-04-24)
- [ ] **BLOQUEADO**: Acceso a developers.facebook.com — no se pudo iniciar sesion. Reintentar
- [ ] Crear app tipo Business en Meta Developer Console
- [ ] Añadir producto Instagram > Messaging
- [ ] Conectar cuenta de Instagram Business/Professional de prueba
- [ ] Generar Access Token (page token larga duracion) y apuntar Page ID
- [ ] Configurar webhook en Meta apuntando a `{preview-url}/api/webhooks/instagram`
- [ ] Pegar credenciales en ModulosConfig del tenant de prueba (canal Instagram ON)
- [ ] Test E2E: enviar DM desde otra cuenta y verificar respuesta del agente
- [ ] App Review de Meta (necesario para produccion con cuentas no-tester)
