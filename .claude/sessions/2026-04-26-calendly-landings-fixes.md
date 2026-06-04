# 2026-04-26 — Calendly context, Landing Pages, fixes varios

## Que se hizo

### Calendly → CRM sync mejorado
- `sync-incoming.ts`: event.summary → `citas.servicio`, event.description → `citas.notas`
- Vinculacion automatica de cita a lead por email/nombre del attendee
- Propagacion de notas Calendly a `leads.notas`
- Lead se mueve a estado "reunion" al vincular cita

### Agente IA con contexto Calendly
- `build-prompt.ts` carga origen, servicio, notas de citas del lead
- Si tiene cita Calendly → no ofrece otra, se centra en sacar info para la reunion
- Si no tiene cita → guia a agendar

### Landing Pages en Integraciones
- Nueva tabla `landing_pages` (RLS, por tenant)
- Auto-registro cuando el formulario envia `landing_page` en el body
- `landing_path` para distinguir subpaginas (/, /sistema)
- Breakdown de paths con contador en Integraciones
- Seccion "Fuente" en ficha del lead (canal, landing page + path, UTMs)
- Webhook bloquea leads de landing pages pausadas

### Fixes UI
- Modal editar cita: scroll cuando contenido excede pantalla
- Textarea notas en ficha del lead: doble de altura
- Pipeline kanban horizontal en movil con scroll snap
- Google Meet se puede añadir al editar cita existente (antes solo al crear)

### Infra
- Deploy flow: Vercel solo deploya main, previews de develop bajo demanda
- Ignored Build Step configurado en Vercel

## Que quedo pendiente
- Probar flujo completo Calendly → CRM con lead real (email matching)
- Plantilla landing actualizada con `landing_page` + `landing_path` pero la landing actual de mytconsulting.es ya lo envia
- /sistema no debe tener formulario de captacion, solo Calendly embebido (pendiente en landing)

## Archivos clave tocados
- `lib/google-calendar/sync-incoming.ts`
- `lib/google-calendar/sync.ts`
- `lib/chatbot/build-prompt.ts`
- `app/api/webhooks/lead/route.ts`
- `app/(dashboard)/integrations/page.tsx`
- `components/LeadDetail.tsx`
- `lib/types.ts`
- `app/globals.css`
- `src/CalendarioCitas.jsx`
- `supabase/migrations/20260426180000_landing_pages.sql`
- `supabase/migrations/20260426190000_add_landing_path.sql`
