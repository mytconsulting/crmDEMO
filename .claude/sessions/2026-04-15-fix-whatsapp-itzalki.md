# Sesión 2026-04-15 — Fix WhatsApp Itzalki Toldoak

## Qué se hizo

1. **Diagnóstico envío (RESUELTO)**: Mensajes de WhatsApp no llegaban al destinatario. Se añadió logging a `sendText()` → Evolution API devolvía HTTP 401 Unauthorized. La `EVOLUTION_API_KEY` en Vercel no coincidía con la del servidor. Se actualizó y los mensajes empezaron a llegar.

2. **Diagnóstico agente IA (PENDIENTE)**: El agente no responde a mensajes entrantes. Los logs de Vercel no muestran ninguna petición a `/api/webhooks/whatsapp`. Se verificó: webhook URL correcta, MESSAGES_UPSERT activado, se re-seteó webhook via API REST. El problema: Evolution API no recibe los mensajes entrantes — el panel de chats de Evolution no los muestra aunque WhatsApp sí los recibe (Carlos los ve). La sesión de Evolution API está desincronizada.

3. **Logging añadido**: Logging detallado en `sendText()` (lib/evolution.ts), WF1 (lead/route.ts), WF6 (lead-manual/route.ts), y WF2 (whatsapp/route.ts) para diagnosticar futuros problemas.

## Qué quedó pendiente

- **MAÑANA 2026-04-16**: Reconectar instancia "Carlos Itzalki Toldoak" en Evolution API (Disconnect + QR con Carlos) para solucionar la recepción de mensajes
- Verificar que el agente IA responde tras reconectar
- Considerar: no registrar interacción como "enviada" si `sendResult.ok === false`

## Archivos tocados

- `lib/evolution.ts` — logging en sendText
- `app/api/webhooks/lead/route.ts` — logging + check resultado envío (WF1)
- `app/api/webhooks/lead-manual/route.ts` — logging mejorado (WF6)
- `app/api/webhooks/whatsapp/route.ts` — logging en puntos de decisión (WF2)
- `.claude/docs/fixes.md` — entrada del bug actualizada
- `.claude/docs/integrations.md` — instancia Itzalki + API key
