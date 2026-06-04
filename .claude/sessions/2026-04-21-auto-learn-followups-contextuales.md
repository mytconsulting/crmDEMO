# Sesion 2026-04-21 — Auto-learn bidireccional + Follow-ups contextuales (Prompt 3)

## Que se hizo

### Auto-learn bidireccional (WF8)
- Reescritura completa de `app/api/cron/auto-learn/route.ts`
- Ahora analiza leads exitosos (es_ganado) Y fallidos (es_perdido) con prompts separados
- Genera doc `patrones_aprendidos` con secciones diferenciadas (exitos + fracasos)
- Truncado inteligente por seccion (max 10K chars, elimina entradas antiguas de la seccion mas larga)
- Telemetria: registra cada ejecucion en tabla `auto_learn_ejecuciones`
- Lee estados del pipeline dinamicamente (es_ganado/es_perdido) en vez de hardcodear

### Follow-ups contextuales (WF5)
- Reescritura completa de `app/api/cron/followups/route.ts`
- Clasificacion por buckets: SILENCIO, TIBIO, RECHAZO
- Keywords primero, Claude Haiku como fallback para ambiguos
- Mensajes adaptados al bucket y al modulo de citas del tenant
- Doble rechazo sin respuesta -> desactiva `chatbot_activo`
- Campo `ultimo_followup_bucket` en leads para tracking

### Migracion BD
- `20260421100000_auto_learn_bidirectional.sql`:
  - Tipo `patrones_aprendidos` en CHECK constraint
  - Tabla `auto_learn_ejecuciones` con RLS
  - Campo `ultimo_followup_bucket` en leads con CHECK

### Prompt del agente
- `build-prompt.ts`: inyeccion de `patrones_aprendidos` con etiqueta diferenciada
- Seccion de objeciones con principios (no frases fijas)
- Adaptacion al registro del lead
- CTA retry con cooldown de 3 turnos

### Constantes
- `PALABRAS_RECHAZO` (18+ keywords) en `lib/constants.ts`
- `MOTIVOS_PERDIDA` para UI futura

### Tests
- `app/api/cron/__tests__/followups-buckets.test.ts`: tests de clasificacion por buckets
- `lib/chatbot/__tests__/build-prompt.test.ts`: tests ampliados para objeciones, CTA retry, adaptacion al lead

### Documentacion
- `architecture.md`: actualizado con auto-learn bidireccional, follow-ups por buckets, patrones_aprendidos
- `decisions.md`: 7 decisiones nuevas (auto-learn bidireccional, patrones en doc propio, buckets, doble rechazo, objeciones con principios, CTA cooldown, adaptacion al lead)

## Archivos clave tocados
- `app/api/cron/auto-learn/route.ts` — reescritura completa
- `app/api/cron/followups/route.ts` — reescritura completa
- `supabase/migrations/20260421100000_auto_learn_bidirectional.sql` — nueva migracion
- `lib/chatbot/build-prompt.ts` — inyeccion patrones + objeciones + adaptacion
- `lib/chatbot/__tests__/build-prompt.test.ts` — tests ampliados
- `lib/constants.ts` — PALABRAS_RECHAZO + MOTIVOS_PERDIDA
- `app/api/cron/__tests__/followups-buckets.test.ts` — nuevo test
- `app/api/ai/train/generate-scenarios/route.ts` — ajustes menores
- `app/api/ai/train/route.ts` — ajuste menor
- `app/(dashboard)/agent/page.tsx` — ajuste menor
- `src/EntrenarAgente.jsx` — ajuste menor
- `.claude/docs/architecture.md` — actualizado
- `.claude/docs/decisions.md` — 7 decisiones nuevas

## Estado de prompts
- [x] Prompt 1 — Refactorizacion agente IA (completo, commit a8af4ed)
- [x] Prompt 2 — Objeciones, CTA retry, adaptacion al lead (completo, commit 84bf49a)
- [x] Prompt 3 — Auto-learn bidireccional + follow-ups contextuales (completo, commit 84bf49a)
- [x] Prompt 4 — Panel de metricas + alertas (completo, pendiente commit)

## Pendiente
- Prompt 4: endpoint metricas, UI admin, cron monitor-agent
- Testear WF5 y WF8 en develop con datos reales
- Deploy a main cuando se verifique develop

## Migracion aplicada
- `20260421100000_auto_learn_bidirectional.sql` aplicada en Supabase develop via SQL Editor (2026-04-21)
- Sentry fix `instrumentation-client.ts` commiteado y pusheado (commit 95dd6f5)
