# Sesion 2026-04-19 — Revision pendientes + limpieza + refactorizacion agente IA

## Que se hizo

### Revision completa de pendientes
- Se cruzaron TODAS las checklists de sesiones anteriores con commits y estado actual del codigo
- Se identificaron items ya completados que seguian marcados como pendientes
- Se actualizo el estado real de cada item

### Limpieza segura
- **Borrado `app/sentry-example-page/`**: pagina de ejemplo generada por Sentry, sin conexion con el CRM
- **`/api/debug` ya no existia**: confirmado que se elimino en sesion anterior

### Fix: variables Supabase en Vercel Development
- `vercel env pull` no traia las variables de Supabase porque solo estaban en Production/Preview
- Anadidas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` al environment Development en Vercel
- `.env.local` regenerado con todas las variables necesarias

### Fix: webpack runtime error __webpack_modules__
- Error: `__webpack_modules__[moduleId] is not a function` al cargar el dashboard
- Causa: `NotificationsProvider` exportaba `NotificationsContext.Provider` directamente
- Solucion: refactorizar como componente wrapper con children y value props
- Archivo: `lib/notifications-context.tsx`

### Refactorizacion completa del Agente IA (Cambios A + B + C)

**Cambio A — Documentos por rol:**
- Migracion BD: columnas `origen` ('usuario'|'auto_generado') y `readonly_ui` en `documentos_chatbot`
- UI ChatbotConfig rediseñada con 3 pestañas:
  - Configuracion: negocio, disponibilidad, faqs (editables por el dueño)
  - Avanzado: identidad_voz, calificacion, ejemplos_conversacion (readonly, auto-generados)
  - Tecnicas de venta: solo visible para admin
- Template negocio ampliado con seccion "CTA DESEADO" para tenants sin citas
- `app/(dashboard)/agent/page.tsx` ahora pasa `isAdmin` al componente

**Cambio B — Prompt condicional:**
- Nuevo `lib/chatbot/doc-parser.ts`: extractSection, extractCTA, extractPricingPolicy
- `build-prompt.ts` ahora calcula OBJETIVO_CONVERSACION segun citas_activo:
  - citas ON: reglas de agendacion + calendario + tags [CITA:]
  - citas OFF: excluye TODO lo de citas, inyecta CTA del doc negocio, politica de precios adaptada
- Variable `objetivoConversacion` inyectada en primera linea del system prompt

**Cambio C — Entrenamiento adaptativo:**
- Nuevo endpoint `POST /api/ai/train/generate-scenarios`: genera 8-10 escenarios especificos del sector via Claude
- EntrenarAgente carga escenarios dinamicos del API (fallback a genericos si falla)
- `/api/ai/train` ahora genera 3 docs (voz + ejemplos + calificacion) en vez de 2
- Segunda ronda: Claude Haiku detecta areas debiles, genera escenarios extra, refina docs
- Phase flow: intro → loading_scenarios → chatting → processing → round2_intro → round2 → done

**Tests:**
- Vitest configurado (vitest.config.ts + scripts en package.json)
- 14 tests unitarios: doc-parser (8) + build-prompt condicional (6)
- Todos pasan

## Commits de esta sesion

| Hash | Descripcion |
|------|-------------|
| `2591bec` | chore: limpieza sentry-example-page + actualizar pendientes |
| `399c6d7` | feat: refactorizar agente IA — docs por rol, prompt condicional, entrenamiento adaptativo |

## Estado de pendientes actualizado

### No tocar de momento (decision del usuario)
- Itzalki WhatsApp incoming (QR reconnect)
- Deploy a main (hasta verificar develop completo)
- Meta Ads API, Google Calendar, Pipeline UI
- Switchover Itzalki

### Pendiente menor
- Restaurar debounce 15s en WF2
- Testear WF2 a fondo
- SENTRY_AUTH_TOKEN en Vercel
- Limpiar leads de test en BD
- Pulir responsive
- Configurar Sentry con Telegram
- Marcar workflows n8n como disabled

### Completado en esta sesion
- [x] Borrar `app/sentry-example-page/`
- [x] Fix webpack NotificationsProvider
- [x] Variables Supabase en Vercel Development
- [x] Refactorizacion agente IA (docs por rol + prompt condicional + training adaptativo)
- [x] Tests unitarios (14 tests, vitest)
- [x] Documentacion actualizada (architecture.md, decisions.md, fixes.md)

## Archivos clave tocados
- `supabase/migrations/20260419105601_agent_docs_roles.sql` — nueva migracion
- `lib/chatbot/doc-parser.ts` — nuevo, extractor de secciones markdown
- `lib/chatbot/build-prompt.ts` — prompt condicional segun citas_activo
- `src/ChatbotConfig.jsx` — UI 3 pestanas + template CTA
- `src/EntrenarAgente.jsx` — escenarios dinamicos + round 2
- `app/api/ai/train/route.ts` — genera calificacion + round 2
- `app/api/ai/train/generate-scenarios/route.ts` — nuevo endpoint
- `app/(dashboard)/agent/page.tsx` — pasa isAdmin
- `lib/notifications-context.tsx` — fix webpack
- `vitest.config.ts` + `lib/chatbot/__tests__/` — tests
- `.claude/docs/architecture.md` — actualizado
- `.claude/docs/decisions.md` — 4 decisiones nuevas
- `.claude/docs/fixes.md` — 2 bugs nuevos
