# Sesión 2026-05-13 — Chat Realtime + Mensajes separados del agente

## Qué se hizo

### 1. Chat sidebar actualización en tiempo real
- **Problema**: El listado de conversaciones (izquierda) no actualizaba el preview del último mensaje cuando el bot respondía o llegaba un mensaje del cliente. Solo se actualizaba al navegar fuera y volver.
- **Solución**: Suscripción a Supabase Realtime en tabla `interacciones` (INSERT). Cuando llega un mensaje nuevo, se actualiza el summary del lead en el sidebar al instante.
- **Migración**: `20260513103934_enable_realtime_interacciones.sql` — añade `interacciones` a `supabase_realtime` publication.
- **Archivos**: `src/ChatView.jsx`

### 2. Agente envía párrafos como mensajes separados
- **Problema**: El agente enviaba un solo mensaje con saltos de línea cuando hablaba de temas diferentes. Poco natural.
- **Solución**: Split por `\n\n` — cada párrafo se envía como mensaje independiente con su propio delay de "composing".
- **Archivos**: `app/api/webhooks/whatsapp/route.ts`, `app/api/webhooks/instagram/route.ts`

### 3. Aclaración Google Calendar tokens
- No requiere acción manual. El refresh_token no caduca. Los watch channels (7 días) se renuevan automáticamente por cron.

## Documentación actualizada
- `.claude/docs/fixes.md` — entrada del bug del sidebar
- `.claude/docs/decisions.md` — decisiones de Realtime y mensajes separados

## Pendiente
- Nada de esta sesión.
