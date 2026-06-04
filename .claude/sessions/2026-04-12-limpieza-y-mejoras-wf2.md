# Sesión 2026-04-12 — Limpieza WF2 + Audio + Tono + Debounce + Endpoints + Landing

## Participantes
Eneko + Claude Code

## Resumen ejecutivo
Sesión larga de limpieza, mejoras y estabilización. Se limpió debug, se arregló audio, se humanizó el tono del agente, se implementó debounce real, se verificaron los 7 endpoints, se arregló WF1, se añadió WhatsApp de bienvenida automático, y se conectó la landing de M&T Consulting al nuevo endpoint.

## Cambios realizados

### 1. Limpieza de código
- Eliminado endpoint temporal `/api/debug`
- Eliminado insert `debug_webhook` en BD
- Eliminados todos los console.log de debug del WF2
- Eliminada variable `waResp` no usada

### 2. SENTRY_AUTH_TOKEN en Vercel
- Generado token en Sentry (org: doston-motiv-solution-sl, project: mt-crm)
- Añadido como env var en Vercel (Production + Preview como sensitive, Development como normal)
- Source maps ahora se suben automáticamente en cada deploy

### 3. Audio — transcripción arreglada
- Añadido soporte para `pttMessage` (notas de voz WhatsApp) además de `audioMessage`
- Pipeline: Evolution API (base64) → OpenAI Whisper → texto
- Funciona correctamente

### 4. Tono humanizado del agente
- Prohibidos signos de apertura ¡ y ¿ (NUNCA)
- Mayúsculas al inicio de frase y después de punto (como autocorrector móvil)
- Prohibidas frases de bot: "no dudes en", "estoy aquí para", "cualquier cosa me dices", "no te preocupes", etc.
- Prohibidas negritas, listas y bullets
- No repetir info ya dicha (citas confirmadas, etc.)
- No insistir con agendar citas
- Muletillas naturales: "mira", "oye", "bueno", "te cuento"
- Resultado: Eneko aprobó el tono, "muchísimo mejor"

### 5. Debounce real (respuestas duplicadas arreglado)
- Problema: 3 mensajes rápidos → 3 funciones serverless → 3 respuestas
- Solución: campo `debounce_token` en tabla leads
- Cada función guarda su timestamp, tras 15s compara con el último token
- Solo la función cuyo token coincide procesa y responde
- Migración: `20260412175542_add_debounce_token_to_leads.sql`

### 6. Todos los endpoints verificados (7/7 OK)
- WF1 `/api/webhooks/lead` — OK (arreglado: validación UUID añadida)
- WF2 `/api/webhooks/whatsapp` — OK
- WF4 `/api/cron/recordatorios` — OK
- WF5 `/api/cron/followups` — OK
- WF6 `/api/webhooks/lead-manual` — OK
- WF7 `/api/ai/train` — OK
- WF8 `/api/cron/auto-learn` — OK
- Errores 500 anteriores eran: tenant_id no-UUID (WF1) y deploy viejo sin env vars (crons)

### 7. WhatsApp de bienvenida automático en WF1
- Al crear lead nuevo con teléfono, se envía mensaje de bienvenida
- Personalizado con nombre del negocio desde documentos_chatbot
- Respeta config `canal_whatsapp` del tenant
- Si falla, no bloquea la creación del lead

### 8. Landing M&T Consulting conectada al CRM
- Prompt entregado a Eneko para configurar LP-m-tconsulting-001
- Env vars: VITE_N8N_WEBHOOK_URL apunta al nuevo endpoint, VITE_TENANT_ID con UUID real
- Payload ajustado: email como campo propio, origen en vez de canal, UTMs en campos_extra
- Testeado y funcionando: formulario → CRM → lead creado

### 9. Google Calendar — documentado para futuro
- Integración pendiente: OAuth por tenant, crear eventos, Meet links, disponibilidad
- BD ya preparada: campos `gcal_event_id` y `gcal_meet_link` en tabla citas
- Guardado en memoria como proyecto futuro (Fase 1-2)

## Tenant IDs confirmados
- `aaad6c28-45d1-4b60-bc89-7549eed0ebdf` — Itzalki (Carlos)
- `a308bc5d-8cd6-4096-bacb-6aa184be9678` — M&T Consulting (Emanti)

## Pendiente para próxima sesión
- [ ] Planificar switchover Itzalki (Carlos) — cambiar landing de Carlos a apuntar al nuevo endpoint
- [ ] Desactivar workflows de Carlos en n8n una vez verificado
- [ ] Deploy a main (producción) — revisar env vars producción antes
- [ ] Limpiar leads de test en BD
- [ ] Seguir puliendo tono del agente con más conversaciones reales
- [ ] Google Calendar integration (Fase 1-2)

## Archivos clave tocados
- `app/api/webhooks/whatsapp/route.ts` — WF2 (debounce, audio, limpieza)
- `app/api/webhooks/lead/route.ts` — WF1 (validación UUID, WhatsApp bienvenida)
- `lib/chatbot/build-prompt.ts` — prompt del agente (tono humanizado)
- `app/api/debug/route.ts` — eliminado en esta sesión
- `supabase/migrations/20260412175542_add_debounce_token_to_leads.sql`
