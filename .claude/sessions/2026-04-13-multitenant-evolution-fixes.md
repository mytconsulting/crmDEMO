# Sesión 2026-04-13 — Multi-tenant Evolution API + fixes críticos

## Resumen

Sesión extensa centrada en: diagnóstico de API keys Anthropic, mejoras del chatbot IA, soporte internacional de teléfonos, múltiples fixes de UI/UX, y — lo más crítico — aislamiento multi-tenant de Evolution API para evitar que mensajes de WhatsApp de un tenant lleguen a otro.

## Lo que se hizo

### 1. Diagnóstico API Anthropic ($0 usage)
- **Problema**: Anthropic Console mostraba $0 de uso. El chatbot usaba GPT-4o fallback siempre.
- **Causa**: API key incorrecta (era de OpenAI, no de Anthropic) + model ID incorrecto (`claude-sonnet-4-6-20250514` → correcto es `claude-sonnet-4-6`)
- **Fix**: nueva API key generada, model ID corregido en `lib/ai/config.ts` y `app/api/webhooks/whatsapp/route.ts`

### 2. Mejoras del prompt del chatbot (WF2)
- Regla anti-precio: "NUNCA des precios concretos, redirige a la llamada"
- Brevedad: "Máximo 2 frases por mensaje"
- Resumen acumulativo de conversación
- Typing delay proporcional al largo del mensaje (simula escritura humana)
- **Archivo**: `lib/chatbot/build-prompt.ts`

### 3. Soporte internacional de teléfonos
- `lib/phone.ts`: normalizePhone() con E.164, parsePhone() para separar prefijo/nacional/bandera
- COUNTRY_PREFIXES: 27 países con banderas
- `components/LeadDetail.tsx`: muestra bandera + prefijo separado del número
- `components/NewLeadModal.tsx`: selector de prefijo con banderas en modal nuevo lead

### 4. Notificaciones (campana)
- Dropdown funcional en `app/(dashboard)/layout.tsx`
- localStorage persistence en `src/useNotifications.js` + clearHistory()

### 5. Toggle WhatsApp enforzado
- Todos los endpoints (WF1, WF2, WF4, WF5, WF6) ahora verifican `canal_whatsapp === true` (no `!== false`)
- Tenants sin config explícita no envían WhatsApp

### 6. Mensaje de bienvenida personalizable
- Campo `nombre_negocio` en configuracion_modulos
- Campo `mensaje_bienvenida` con placeholder {nombre}
- Soporte de archivo adjunto (video, imagen, PDF) via Supabase Storage bucket `welcome-media`
- Solo aplica a WF1 (landing pages), no a leads manuales (WF6)

### 7. Fix eliminación de leads (CASCADE)
- **Problema**: no se podían borrar leads que tenían citas asociadas
- **Causa**: FK de `citas.lead_id` sin CASCADE
- **Fix**: migración `20260413141000_fix_citas_cascade_delete.sql`

### 8. CORS para landing pages externas
- **Problema**: landing en `itzalki-mx3.vercel.app` no podía POST a `myt-crm-app.vercel.app`
- **Fix**: headers CORS + OPTIONS handler en `app/api/webhooks/lead/route.ts`

### 9. Multi-tenant Evolution API (CRÍTICO)
- **Problema**: M&T respondía a leads de Itzalki porque todos compartían la misma instancia global
- **Solución**: 
  - Nuevos campos en `configuracion_modulos`: `evolution_instance`, `evolution_api_url`, `evolution_api_key`
  - `lib/evolution.ts`: nuevo módulo con `getEvolutionConfig()`, `resolveTenantByInstance()`, `sendText()`, `sendMedia()`, `updatePresence()`, `getBase64FromMedia()`
  - Todos los endpoints refactorizados para usar config per-tenant
  - Índice único en `evolution_instance` para resolver tenant desde webhook entrante

### 10. Fix Chrome autofill → WF2 500 errors
- **Problema**: Chrome autorellenó email/password en campos opcionales de API URL/Key
- **Causa del 500**: `getEvolutionConfig` devolvía URL inválida (email) → fetch fallaba
- **Fix**: 
  - Eliminados campos API URL/Key del UI (no son necesarios, se usan env vars)
  - Validación en `getEvolutionConfig`: solo usa valores per-tenant si empiezan por `http`
  - Migración para limpiar valores basura de la BD
  - Logging en catch de WF2

## Migraciones aplicadas (en orden)
1. `20260413130000_add_mensaje_bienvenida.sql`
2. `20260413131000_add_welcome_media.sql`
3. `20260413140000_fix_rls_admin_delete.sql` (REVERTIDA — rompía aislamiento multi-tenant)
4. `20260413141000_fix_citas_cascade_delete.sql`
5. `20260413143000_add_nombre_negocio.sql`
6. `20260413150000_evolution_per_tenant.sql`
7. `20260413160000_clean_evolution_garbage.sql`

## Archivos clave tocados
- `lib/evolution.ts` — NUEVO, módulo multi-tenant Evolution API
- `lib/phone.ts` — NUEVO, normalización E.164
- `lib/chatbot/build-prompt.ts` — mejoras prompt
- `app/api/webhooks/whatsapp/route.ts` — refactor multi-tenant
- `app/api/webhooks/lead/route.ts` — CORS + bienvenida personalizable
- `app/api/webhooks/lead-manual/route.ts` — multi-tenant Evolution
- `app/api/cron/followups/route.ts` — multi-tenant Evolution
- `app/api/cron/recordatorios/route.ts` — multi-tenant Evolution
- `src/ModulosConfig.jsx` — nombre negocio, mensaje bienvenida, file upload, campos Evolution
- `components/NewLeadModal.tsx` — selector prefijo, modos WhatsApp
- `components/LeadDetail.tsx` — bandera + prefijo
- `app/(dashboard)/layout.tsx` — dropdown notificaciones

## Incidentes durante la sesión
1. **Deploy accidental a producción**: `vercel --prod=false` igualmente deployó. Memoria creada: NUNCA tocar producción sin permiso.
2. **RLS modificado rompió aislamiento**: se cambió policy para que admin viera todos los tenants → Itzalki veía leads de M&T. Revertido inmediatamente. Memoria creada: no tocar RLS sin preguntar.

## Pendiente
- Verificar que WF2 responde correctamente tras fix de Evolution API (probar con WhatsApp)
- 2 features nuevas que Eneko mencionó pero aplazó
- Siguiente fase del roadmap: Fase 1 (UTM tracking)
