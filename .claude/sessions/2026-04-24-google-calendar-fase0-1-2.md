# Sesion 2026-04-24 — Google Calendar Fases 0, 1 y 2

## Que se hizo

### Instagram (continuacion sesion anterior)
- build-prompt.ts: parametro canal (whatsapp/instagram), prompt adaptado por canal
- Nueva tabla campanas_instagram + UI CRUD en ModulosConfig
- OAuth Meta: boton "Conectar Instagram" con Facebook Login (commit 4a6de0f)
- Instagram queda pausado — pendiente acceso a developers.facebook.com

### Google Calendar Fase 0 — Setup GCP (manual)
- Proyecto GCP creado: mt-crm-calendar
- Google Calendar API habilitada
- OAuth consent screen: External, scopes calendar.events + userinfo.email
- Test users: ekaitz@mytconsulting.es + eneko
- Client ID + Secret creados (Web app)
- ENCRYPTION_KEY y GOOGLE_WEBHOOK_TOKEN generados
- 5 env vars añadidas en Vercel (Preview)

### Google Calendar Fases 1+2 — Esqueleto BD + OAuth (codigo)
- Migracion SQL: tabla google_calendar_connections + columnas en citas
- lib/crypto.ts: cifrado AES-256-GCM para refresh_token
- lib/google-calendar/client.ts: OAuth flow completo
- Endpoints: /api/integrations/google (inicio), callback, disconnect
- UI: /integrations con tarjeta Conectar/Desconectar
- Sidebar: item "Integraciones" añadido

### Probado en develop
- OAuth conectado con contacto@mytconsulting.es
- Error inicial (invalid_client) resuelto repegando env var en Vercel
- Tarjeta muestra "Conectado" correctamente

## Archivos nuevos
- supabase/migrations/20260424120000_google_calendar_connections.sql
- lib/crypto.ts
- lib/google-calendar/client.ts
- app/api/integrations/google/route.ts
- app/api/integrations/google/callback/route.ts
- app/api/integrations/google/disconnect/route.ts
- app/(dashboard)/integrations/page.tsx

## Archivos editados
- components/Sidebar.tsx — item Integraciones
- .claude/docs/integrations.md — seccion Google Calendar

## Que quedo pendiente
- Sync entrante: leer eventos de Google Calendar y volcarlos a Supabase (Fase 4 parcial)
- El agente de WhatsApp ya lee de Supabase, asi que cuando el sync funcione vera las citas automaticamente
- El calendario del CRM tambien las mostrara
