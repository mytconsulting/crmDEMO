# Sesión 2026-05-16 — Conversation Intelligence: plan creado

## Qué se hizo

1. **Dashboard Google Calendar Health** (Fase 6 parte 1) — implementado y deployado a main
   - `/admin/google-calendar` con stats, métricas de citas y tabla de conexiones por tenant
   - API `/api/admin/calendar-health` con service_role cross-tenant

2. **Migración CalendarioCitas a TypeScript** — implementada y deployada a main
   - `src/CalendarioCitas.jsx` → `src/CalendarioCitas.tsx`
   - Tipado completo: props, estados, handlers, estilos. Comportamiento idéntico.

3. **Plan Conversation Intelligence** — documento creado, sin implementar
   - `docs/PLAN-CONVERSATION-INTELLIGENCE.md` (1330 líneas)
   - 5 fases: schema, embudo SQL, minería Haiku, recomendaciones Sonnet, hardening
   - Verificación completa de premisas contra el schema real
   - Pendiente de revisión antes de empezar implementación

## Hallazgos clave del plan

- `interacciones` no tiene conversation_id ni canal explícito — se agrupa por lead_id
- No existe concepto de "conversación cerrada" — definido criterio en el plan
- `citas` no tiene columna `asistio` — se usa `estado='completada'`
- Auto-learn ya analiza conversaciones pero para alimentar al agente, no para el dashboard
- No se necesitan env vars nuevas (reutiliza ANTHROPIC_API_KEY y CRON_SECRET)
- recharts v3.7.0 ya instalado para gráficos

## Archivos tocados

- `components/crm-icons.tsx` — +1 icono (calHealth)
- `components/Sidebar.tsx` — +1 nav item (Calendar Health)
- `app/api/admin/calendar-health/route.ts` — NUEVO
- `app/(dashboard)/admin/google-calendar/page.tsx` — NUEVO
- `src/CalendarioCitas.jsx` → `src/CalendarioCitas.tsx` — migración TS
- `docs/PLAN-CONVERSATION-INTELLIGENCE.md` — NUEVO (solo plan)
- `.claude/docs/integrations.md` — actualizada

## Pendiente

- Revisar plan de Conversation Intelligence con Ekaitz
- Implementar fases cuando se apruebe
- Google Calendar: Fase 5 (verificación Google) cuando haya más clientes
