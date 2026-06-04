# Bugs resueltos

> Lo más reciente arriba. Formato: fecha, síntoma, causa raíz, solución, archivos tocados.

---

## 2026-06-04 — [DEMO] Vercel: deployment "Ready/Production" pero 404 en TODAS las rutas

**Síntoma**: tras desplegar la demo, tanto el dominio como la URL propia del deployment daban
`404: NOT_FOUND` (`X-Vercel-Error: NOT_FOUND`, `cdg1::...`). El build salía verde (Ready, Production)
y el log mostraba la tabla de rutas con `○ /`. Incluso `/_next/static/*` daba 404 a nivel plataforma.

**Causa raíz**: el proyecto `crm-demo` de Vercel quedó en un **estado corrupto** (ni `vercel project ls`
lo listaba). El build se publicaba pero el host no enrutaba al output. Descartado: framework
(era Next.js), Root Directory (vacío), Output Directory (auto), build cache (redeploy sin caché
no arregló), Deployment Protection (al desactivarla, 401→404).

**Solución**: deployment limpio por **CLI** a un proyecto nuevo:
`vercel deploy --prod --yes --scope mytconsultings-projects` → proyecto `myt-crn-demo`,
URL pública verificada `https://myt-crn-demo.vercel.app` (200). Conectado a GitHub con
`vercel git connect` para auto-deploy.

**Notas**: (1) `middleware.ts` con `matcher: []` rompía antes el build con
*"Route at index 4 must define either src or source"* → se eliminó el middleware (la demo no tiene auth).
(2) Sentry (`withSentryConfig`) se quitó porque sin `SENTRY_AUTH_TOKEN` arriesgaba el build en CI.

**Archivos**: `next.config.js`, `app/global-error.tsx`, borrado `middleware.ts` y `sentry.*`/`instrumentation*`.

---

## 2026-06-04 — [DEMO] Supabase Service Key expuesta en el historial de git

**Síntoma**: GitHub avisó "Secrets detected" — *Supabase Service Key* en
`supabase/migrations/...remote_schema.sql` (commit `f90494b`) del repo demo.

**Causa raíz**: al crear el repo demo se subió **todo el historial del CRM real**, que incluía esa
migración con la clave inline (la versión actual del archivo ya estaba limpia; el secreto vivía en
un commit antiguo).

**Solución**: reescribir el repo a un **único commit limpio** (`git checkout --orphan` + quitar
`supabase/` + `git commit` + `git push --force`). El commit con el secreto deja de estar referenciado.
⚠️ Reescribir NO basta: la clave estuvo expuesta → **hay que rotarla en Supabase** y actualizar el
env del CRM oficial (PENDIENTE del cliente). Tras rotar, marcar la alerta de GitHub como *Revoked*.

---

## 2026-06-03 — Security Advisor de Supabase: 3 errores + 11 warnings

**Síntoma**: el Security Advisor mostraba 3 errores rojos (`security_definer_view`) y varios warnings amarillos (`function_search_path_mutable`, `*_security_definer_function_executable`, `public_bucket_allows_listing`).

**Causa raíz**:
- **Vistas**: `vista_leads_calientes`, `vista_leads_por_estado`, `vista_metricas_cliente` se crearon sin `security_invoker`, así que por defecto se ejecutaban como SECURITY DEFINER → ignoraban el RLS del usuario que consulta (riesgo de fuga entre tenants).
- **Funciones**: 6 funciones sin `search_path` fijado (riesgo de secuestro vía search_path mutable).
- **RPC**: `handle_new_lead` y `handle_new_user` (funciones de trigger) quedaban invocables vía `/rest/v1/rpc`.
- **Storage**: la política SELECT `to public` de `welcome-media` permitía listar todos los archivos.

**Solución** (2 migraciones, aplicadas con `supabase db push`):
- `20260603100000_security_invoker_views.sql`: `ALTER VIEW ... SET (security_invoker = on)` en las 3 vistas.
- `20260603110000_security_advisor_warnings.sql`: `SET search_path = public, pg_temp` en las 6 funciones; `REVOKE EXECUTE` de `handle_new_lead`/`handle_new_user`; `DROP POLICY` del listado público de `welcome-media`.

**NO se tocó a propósito**:
- `is_admin()`/`is_super_admin()` siguen ejecutables por anon/authenticated → el RLS (`"Admins full access"` en `profiles` y `tenant_config`, ambas `to public`) las necesita; revocar EXECUTE rompería con "permission denied for function". Esos 4 warnings son intencionales.
- `leads.anon_insert` (`WITH CHECK true`): captura pública de leads. Pendiente de confirmar si las landings insertan con anon key o vía API route (service_role) antes de tocar.
- `auth_leaked_password_protection`: toggle de Dashboard (Auth → Password), no es migración.

**Verificación**: ningún archivo del código llama a las vistas, ni a `handle_new_*` por RPC, ni hace `.list()` en welcome-media → cambios no rompen nada.

**Archivos**: `supabase/migrations/20260603100000_*`, `20260603110000_*`

## 2026-06-02 — Email de "establecer contraseña" llevaba a /login (no detectaba la cuenta)

**Síntoma**: el enlace del email de alta de cliente aterrizaba en `/login#access_token=...&type=recovery` en vez de la página para definir la contraseña.

**Causa raíz**: Supabase usa **flujo implícito** → entrega los tokens en el **hash** (`#access_token=...`), que es un fragmento client-only y **nunca llega al servidor**. El `redirectTo` apuntaba a `/auth/callback` (Route Handler de servidor) que solo puede leer `?code=`/`token_hash` de la query; al no encontrarlos hacía fallback a `/login`, arrastrando el hash.

**Solución**: apuntar `redirectTo` **directamente a la página cliente** `/auth/set-password`, que lee `window.location.hash` y llama a `supabase.auth.setSession({ access_token, refresh_token })`. `/auth/callback` se mantiene solo para un eventual flujo PKCE (`?code=`). Regla: en flujo implícito el destino del email debe ser una página cliente, NO un Route Handler.

**Archivos**: `app/api/admin/clients/route.ts`, `app/api/admin/clients/resend/route.ts`

---

## 2026-06-02 — Borrar cliente dejaba usuario huérfano en auth.users

**Síntoma**: al eliminar un cliente desde `/admin`, no se podía volver a crear una cuenta con el mismo email ("User already registered").

**Causa raíz**: el borrado antiguo (client-side) solo eliminaba la fila `profiles` y `leads`, pero NUNCA el usuario en `auth.users` (requiere service role). Quedaba un usuario auth huérfano + datos en tablas con FK a `auth.users` sin cascade.

**Solución**: nuevo `DELETE /api/admin/clients?id=` (server, service role) que borra en orden las tablas que bloquean la baja (`citas` → `leads` → `pipeline_estados`, `configuracion_modulos`, `documentos_chatbot`, `fechas_bloqueadas`, `auto_learn_ejecuciones`, `team_members`, `avatar_cliente`) y luego `admin.auth.admin.deleteUser(id)`, que cascadea el resto (`profiles`, `tenant_config`, `push_subscriptions`, `campanas_instagram`, `google_calendar_connections`, `landing_pages`). Protege contra borrarse a uno mismo o a otra cuenta `admin`.

**Archivos**: `app/api/admin/clients/route.ts`, `app/(dashboard)/admin/page.tsx`

---

## 2026-05-13 — Chat sidebar no actualiza último mensaje en tiempo real

**Síntoma**: En la zona de conversaciones, el último mensaje que aparece debajo del nombre en el listado de la izquierda no se actualizaba cuando el bot respondía o el cliente enviaba un mensaje. Solo se actualizaba al salir y volver a entrar en chat.

**Causa raíz**: `loadLeadSummaries()` (que construye el listado lateral con el preview del último mensaje) solo se ejecutaba al montar el componente o cuando cambiaba la prop `leads`. El polling de 15s solo refrescaba los mensajes del chat seleccionado (`loadMessages`), no el listado lateral.

**Solución**: Suscripción a Supabase Realtime en la tabla `interacciones` (evento INSERT). Cuando llega un mensaje nuevo:
1. Se actualiza el summary del lead en el sidebar al instante (último mensaje, hora, tipo, contador, y re-ordena la lista)
2. Si el mensaje es del lead seleccionado, se añade directamente al chat sin esperar polling
3. Se usa `selectedLeadRef` (useRef) para acceder al lead seleccionado actual desde el callback del channel (evita closure stale)
4. El polling de 15s se mantiene como fallback por si Realtime pierde algún evento

**Archivos**: `src/ChatView.jsx`

---

## 2026-04-26 — Google Meet no se añade al editar cita existente

**Síntoma**: Crear cita sin Meet, luego editarla para añadir Meet → Meet no aparece en Google Calendar.
**Causa**: El PATCH a Google Calendar no incluía `conferenceDataVersion=1` en query params, y `buildGoogleEvent` bloqueaba `conferenceData` en updates con `!isUpdate`.
**Solución**: Añadir `conferenceDataVersion=1` al PATCH URL y quitar la restricción `!isUpdate` para conferenceData.
**Archivos**: `lib/google-calendar/sync.ts`

## 2026-04-26 — Lead no se mueve a "reunion" al agendar por Calendly

**Síntoma**: Lead agenda por Calendly → cita se crea en CRM pero lead se queda en "nuevo".
**Causa**: `sync-incoming.ts` creaba la cita y propagaba notas, pero no actualizaba `lead.estado`.
**Solución**: Añadir `estado: 'reunion'` al update del lead cuando se vincula una cita.
**Archivos**: `lib/google-calendar/sync-incoming.ts`

## 2026-04-26 — Modal editar cita sin scrollbar

**Síntoma**: Notas largas en el modal de editar cita ocultan los botones de abajo.
**Causa**: `crm-modal` no tenía `overflow-y: auto` ni `max-height`.
**Solución**: Añadir `maxHeight: 85vh` y `overflowY: auto` al modal.
**Archivos**: `src/CalendarioCitas.jsx`

---

## 2026-04-25 — Múltiples fixes durante rediseño visual

**Notificaciones cross-tenant**: localStorage usaba clave fija `notif_history` para todos los tenants. Cambiado a `notif_history_{tenant_id}`.

**Sidebar iluminaba padre+hijo**: `/agent/train` activaba tanto Setter IA como Entrenamiento. isActive() ahora verifica si hay un match más específico.

**Training endpoints timeout**: generate-scenarios y train no tenían maxDuration. Añadido 60s para evitar que Vercel mate la función.

**Chat detail pane visible en mobile**: inline `display: flex` sobrescribía el `display: none` de la media query. Movido a clase CSS.

**Editar cita pedía email Meet**: validación de email para Meet bloqueaba la edición. Ahora solo aplica a citas nuevas sin Meet existente.

**Icono cerrar sesión**: carácter ⏻ no se renderizaba en móvil. Cambiado a SVG logout.

**Calendar citas desbordaban celdas**: sin overflow hidden, una cita larga empujaba toda la fila. Añadido overflow hidden + height fija.

**Próxima cita desordenada**: upcomingCitas no ordenaba por hora, solo por fecha. Añadido sort por fecha+hora.

**Type errors en deploy**: propiedades `ultimo_contacto` y `canal` faltaban en tipos TypeScript.

**Nombres largos cortados**: crm-detail__field-val tenía text-overflow ellipsis. Cambiado a word-break break-word.

**Archivos tocados**: múltiples (ver sesión 2026-04-25)

---

## 2026-04-25 — Meet se preactivaba en citas que no lo tenían

**Síntoma**: Al editar una cita sin Meet, aparecía como si tuviera Meet activado. Al pasar de una cita con Meet a otra sin, el estado se quedaba activado.

**Causa raíz**: `addMeetLink` era un estado global del componente padre CalendarioCitas que no se reseteaba al cambiar de cita. Si editabas una cita con Meet, el estado quedaba `true` para la siguiente.

**Solución**: Movido `addMeetLink` a estado local del CitaModal (`meetEnabled`), inicializado según cada cita: `true` solo si es nueva cita y googleMeetAvailable, `false` si es edición. El estado de Meet se pasa dentro del form como `_withMeet`.

**Archivos tocados**: `src/CalendarioCitas.jsx`

---

## 2026-04-25 — Entrenamiento del agente no guardaba documentos

**Síntoma**: El entrenamiento decía "Documentos generados correctamente" pero en Setter IA aparecía 0/3 documentos configurados. La tabla documentos_chatbot estaba vacía.

**Causa raíz**: El endpoint `/api/ai/train` insertaba con campo `origen: 'auto_generado'` que no existe en la tabla. Supabase devolvía error 400 pero el código no capturaba el error del insert — respondía 200 igualmente.

**Solución**: Eliminado campo `origen` del insert. Añadido error logging en `upsertDoc` para que futuros fallos de inserción sean visibles en logs.

**Archivos tocados**: `app/api/ai/train/route.ts`

**Lección**: Siempre capturar y loguear errores de queries a BD, incluso en funciones auxiliares. Un 200 sin verificar el resultado de la inserción es un bug silencioso.

---

## 2026-04-24 — Google Calendar sync entrante: horas 2h adelantadas (timezone UTC)

**Síntoma**: Citas importadas de Google Calendar aparecían 2 horas antes de lo correcto. Ej: evento a las 10:30 en Google → 08:30 en CRM.

**Causa raíz**: `parseEventDateTime()` en `sync-incoming.ts` usaba `new Date().toISOString()` (convierte a UTC) y `toTimeString()` (usa hora del servidor, que en Vercel es UTC). Google envía `dateTime` con offset incluido (ej: `2026-04-28T10:30:00+02:00`) pero la conversión a Date perdía la hora local.

**Solución**: Parsear directamente la hora local del string ISO con regex (`/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/`). Fallback con `toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' })` para formatos inesperados.

**Archivos tocados**: `lib/google-calendar/sync-incoming.ts`

---

## 2026-04-24 — CRON_SECRET vacío en Vercel → todos los crons bloqueados (401)

**Síntoma**: El nuevo cron `sync-google-calendar` y todos los demás crons (recordatorios, followups, auto-learn, monitor-agent) devolvían 401 Unauthorized.

**Causa raíz**: La env var `CRON_SECRET` existía en Vercel pero con valor vacío. La validación `!CRON_SECRET || authHeader !== Bearer ${CRON_SECRET}` fallaba siempre porque `!""` es `true`.

**Solución**: Generado token seguro con `openssl rand -hex 32`, configurado en los 3 environments de Vercel (production, preview develop, development). Importante: usar `printf` en vez de `echo` al pipar a `vercel env add` para evitar trailing newline.

**Archivos tocados**: Vercel env vars (remoto)

**Lección**: Verificar SIEMPRE que las env vars de Vercel tienen valor real después de crearlas. Un string vacío pasa la validación de "existe" pero falla en runtime.

---

## 2026-04-24 — Deploy en Vercel no incluía el último commit (cron 404)

**Síntoma**: El endpoint `/api/cron/sync-google-calendar` devolvía 404 en el preview deploy, aunque el archivo existía en el repo y el commit estaba en origin/develop.

**Causa raíz**: Los deploys recientes (8m, 13m, 21m) fueron redeploys de Vercel UI que usaron un commit anterior (`7a83fa0`) en vez del HEAD (`f8edd9f`). El build log de Sentry confirmaba el commit viejo.

**Solución**: Deploy manual con `npx vercel --yes` que toma el working directory local (con el commit correcto).

**Archivos tocados**: ninguno (problema de deploy)

---

## 2026-04-22 — Fixes finales auditoría: prompt injection, RLS legacy, storage

**H3 — Prompt injection**: Función `sanitizeUserInput()` elimina patrones de inyección ([SYSTEM], [OVERRIDE], ###SYSTEM) de nombre, empresa, contexto y mensajes del lead. Instrucción anti-manipulación añadida al system prompt del agente.

**H2 — scoring_reglas NULL bypass**: Eliminada cláusula `cliente_id IS NULL` que permitía ver filas globales a todos los usuarios. (Tabla legacy, no usada en código nuevo.)

**M1 — Storage welcome-media sin tenant isolation**: Policies de upload y delete restringidas a la carpeta del propio tenant (`auth.uid()::text = foldername(name)[1]`). Lectura pública se mantiene porque Evolution API necesita acceder.

**Archivos tocados**: `lib/chatbot/build-prompt.ts`, `supabase/migrations/20260422220000_security_rls_storage.sql`

---

## 2026-04-22 — Auditoría de seguridad completa: fixes críticos y altos

**C1 — admin/metrics isSuperAdmin bug**: `profile?.role === 'admin'` → `'super_admin'`. Antes cualquier admin podía ver métricas de otros tenants.

**C2 — campaigns-data cross-tenant leak**: profiles e interacciones se devolvían sin filtro tenant. Ahora profiles filtra por `user.id` (excepto super_admin) e interacciones filtra por lead_ids del tenant.

**H1 — campanas RLS is_admin→is_super_admin**: Creada función `is_super_admin()`. Policies de campanas actualizadas para usar la nueva función en vez de `is_admin()`.

**H4 — SSRF en media URLs**: Validación de URLs en lead-manual. Solo permite HTTPS público, bloquea localhost/redes internas.

**H5 — CORS restrictivo en webhook lead**: Configurable via `ALLOWED_WEBHOOK_ORIGINS` env var. Fallback a `*` si no está seteado.

**H6 — Sentry PII + sampling**: `sendDefaultPii: false` en los 3 configs (server, edge, client). Traces al 10% en producción, 100% en dev.

**H7 — interacciones anon INSERT**: Eliminada policy `anon_insert` (todos los inserts van por service_role).

**M2 — auto_learn_ejecuciones**: Restringido INSERT/UPDATE/DELETE a service_role.

**M3 — Teléfonos en logs**: Eliminados números de teléfono e instance names de console.log/error.

**C3 — bot_sent_messages sin RLS**: Habilitado RLS + policies de aislamiento por tenant.

**Archivos tocados**: `api/admin/metrics/route.ts`, `api/admin/campaigns-data/route.ts`, `api/webhooks/lead/route.ts`, `api/webhooks/lead-manual/route.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`, `supabase/migrations/20260422210000_security_audit_fixes.sql`

---

## 2026-04-22 — Mejoras de robustez post-auditoría (severidad media)

**Fix 1 — Bare catch blocks**: `webhooks/lead` y `webhooks/whatsapp` tenían `catch {}` sin loggear el error, haciendo debugging imposible. Añadido `console.error` con detalle en todos.

**Fix 2 — Logging fallback IA**: Cuando Claude falla y se usa GPT-4o, ahora se registra `{ ai_model: "gpt-4o-fallback" }` en el campo `metadata` de la interacción. Permite detectar uso excesivo de fallback.

**Fix 3 — Token limit en prompt**: Si el system prompt + historial excede ~150k chars, se trunca el historial por el inicio manteniendo los mensajes más recientes. Evita que tenants con docs grandes o muchas interacciones rompan la llamada IA.

**Archivos tocados**: `app/api/webhooks/lead/route.ts`, `app/api/webhooks/whatsapp/route.ts`, `lib/chatbot/build-prompt.ts`

---

## 2026-04-22 — Auditoría de seguridad: 5 vulnerabilidades críticas

**Síntoma**: Revisión completa del proyecto reveló 5 problemas críticos de seguridad/fiabilidad.

**Fix 1 — CRON_SECRET bypass**: Si el env var no estaba seteado, los 4 crons quedaban públicos. Cambiado `if (CRON_SECRET &&` → `if (!CRON_SECRET ||` para que sin secret = 401.

**Fix 2 — Race condition citas duplicadas**: Dos webhooks simultáneos podían crear la misma cita. Añadida validación de formato hora, captura de error 23505 (unique constraint), y migración con partial unique index en `citas (lead_id, fecha, hora) WHERE estado IN ('pendiente', 'confirmada')`.

**Fix 3 — Promise.all falla todo en auto-learn**: Si una llamada IA fallaba, todo el cron se caía. Cambiado a `Promise.allSettled` con log individual por tenant.

**Fix 4 — Training routes sin auth**: `/api/ai/train` y `/api/ai/train/generate-scenarios` aceptaban cualquier tenant_id sin verificar. Añadida verificación de usuario autenticado + ownership del tenant (o rol admin/super_admin).

**Fix 5 — campaigns-data sin filtro tenant**: Usaba `createAdminClient()` (bypasea RLS) sin filtrar por tenant. Ahora admin solo ve su tenant, super_admin ve todo.

**Archivos tocados**: `api/cron/auto-learn/route.ts`, `api/cron/followups/route.ts`, `api/cron/recordatorios/route.ts`, `api/cron/monitor-agent/route.ts`, `api/webhooks/whatsapp/route.ts`, `api/ai/train/route.ts`, `api/ai/train/generate-scenarios/route.ts`, `api/admin/campaigns-data/route.ts`, `supabase/migrations/20260422200000_unique_cita_activa.sql`

---

## 2026-04-22 — Agente dice hora vieja de cita tras modificación manual en calendario

**Síntoma**: Cita agendada a las 11:30 por el agente, cambiada manualmente a 12:00 en el calendario. El agente seguía diciendo 11:30 al lead.

**Causa raíz**: El agente leía la hora correcta de la BD, pero el historial de conversación contenía su mensaje previo confirmando las 11:30. El agente priorizaba su propio historial sobre los datos actuales.

**Solución (v1 — insuficiente)**: Sección "CITAS DE ESTE LEAD" con etiqueta "FUENTE DE VERDAD" y regla en system prompt. No bastó porque el modelo priorizaba el historial en el chatInput.

**Solución (v2 — definitiva)**: Además del system prompt, se inyecta un bloque `[⚠️ DATOS ACTUALIZADOS DE CITAS]` directamente en el `chatInput` (entre el historial y los mensajes del lead), con las citas actuales de la BD y la instrucción de ignorar horas diferentes del historial. El modelo presta más atención al chatInput que al system prompt.

**Archivos tocados**: `lib/chatbot/build-prompt.ts`

---

## 2026-04-22 — Agente sin nombre y primer mensaje sin presentación

**Síntoma**: El agente respondía "Soy de M&T Consulting (Develop)" al preguntar quién es. El primer mensaje automático no se presentaba — el lead recibía un WhatsApp sin saber quién escribe.

**Causa raíz**: No existía campo `nombre_agente` en la configuración del tenant. El prompt solo usaba `company_name` del profile (que incluía "(Develop)"). `buildFirstMessage` no tenía presentación.

**Solución**:
1. Campo `nombre_agente` en `configuracion_modulos` (migración `20260422100000`)
2. Editable desde Módulos > Estilo de Comunicación
3. `build-prompt.ts` inyecta nombre del agente en sección IDENTIDAD y en REGLAS DE COMUNICACION
4. `buildFirstMessage` incluye presentación: "Soy Laura de M&T Consulting."
5. Si no hay nombre de agente, solo dice el nombre de empresa. Si no hay ninguno, no se presenta.

**Archivos tocados**: `lib/chatbot/build-prompt.ts`, `app/api/webhooks/lead-manual/route.ts`, `src/ModulosConfig.jsx`, `supabase/migrations/20260422100000_add_nombre_agente.sql`

---

## 2026-04-22 — Sistema de citas del agente IA con 4 fallos graves

**Síntomas**: (1) agente se inventaba disponibilidad, (2) no cancelaba cita vieja al reagendar, (3) duplicaba citas, (4) cancelaba todas las citas en vez de una.

**Causa raíz**:
1. El prompt no mostraba huecos ocupados — el agente no sabía qué horas estaban libres
2. Solo existía `[CITA_CANCELADA]` (cancelar todo) sin tag para cancelar una cita específica ni reagendar
3. No había verificación de duplicados al crear cita
4. El orden de operaciones era crear→cancelar, así que al reagendar cancelaba la nueva también

**Solución**:
1. **Prompt**: separa "CITAS DE ESTE LEAD" y "HUECOS YA OCUPADOS" con instrucciones explícitas
2. **Nuevo tag** `[CITA_CANCELAR:YYYY-MM-DD,HH:MM]` para cancelar una cita específica por fecha/hora
3. **Reagendar** = `[CITA_CANCELAR:vieja]` + `[CITA:nueva]` en el mismo mensaje
4. **Orden**: cancelar PRIMERO, crear DESPUÉS
5. **Anti-duplicados**: verifica si la cita ya existe antes de crearla
6. **`[CITA_CANCELADA]` legacy** solo actúa si NO hay cancelación específica
7. **Reglas explícitas**: nunca inventar disponibilidad, comprobar huecos, cancelar al reagendar
8. **Regla de disponibilidad reforzada**: si no hay citas → "TODOS los huecos están libres". Si hay → lista explícita de OCUPADOS. Regla final: "si NO aparece como OCUPADO ni BLOQUEADO, esa hora ESTÁ LIBRE. No inventes restricciones."

**Archivos tocados**: `lib/chatbot/build-prompt.ts`, `lib/chatbot/parse-response.ts`, `app/api/webhooks/whatsapp/route.ts`

---

## 2026-04-21 — Campo contexto_lead para que el agente conozca al lead desde el primer mensaje

**Mejora**: Nuevo campo `contexto_lead` en leads — info sobre la empresa/persona visible para el agente IA (ej: "empresa de jardineria en Bilbao, 5 empleados"). Se muestra en el modal de nuevo lead, se inyecta en DATOS DEL LEAD para el agente, y personaliza el primer WhatsApp.

**Archivos tocados**: `components/NewLeadModal.tsx`, `app/api/webhooks/lead-manual/route.ts`, `lib/chatbot/build-prompt.ts`, `supabase/migrations/20260421150000_add_canal_detalle_leads.sql`

---

## 2026-04-21 — Canal "referido" sin contexto de quien refiere + agente sin info de origen

**Síntoma**: Al crear lead como "referido", el agente no sabía quién había referido al lead. El primer mensaje decía genéricamente "me han hablado de vosotros" sin nombre. El agente IA tampoco tenía acceso al canal de origen del lead.

**Causa raíz**: No existía campo `canal_detalle` en la tabla leads. El modal de nuevo lead no pedía info contextual por canal. El agente no recibía `canal` ni `canal_detalle` en los datos del lead.

**Solución**:
1. Campo `canal_detalle` en tabla leads (migración `20260421150000`)
2. Modal de nuevo lead: input contextual por canal (referido→quién, evento→nombre, linkedin→URL)
3. `buildFirstMessage()` usa `canal_detalle` para personalizar (ej: "Eneko me ha hablado de vosotros")
4. `build-prompt.ts`: interface Lead incluye `canal` y `canal_detalle`, inyectados en DATOS DEL LEAD para el agente IA

**Archivos tocados**: `components/NewLeadModal.tsx`, `app/api/webhooks/lead-manual/route.ts`, `lib/chatbot/build-prompt.ts`, `supabase/migrations/20260421150000_add_canal_detalle_leads.sql`

---

## 2026-04-21 — Agente IA se inventa nombre y empresa al responder

**Síntoma**: Cuando el lead pregunta "quien eres?", el agente responde con un nombre y empresa inventados ("soy Carlos, de Aka Rubia") en vez de usar los datos reales del tenant.

**Causa raíz**: El prompt no incluía el `company_name` del tenant. La identidad dependía 100% del documento `identidad_voz`, y si no estaba rellenado, el agente alucinaba datos.

**Solución**:
1. Cargar `profiles.company_name` del tenant en `build-prompt.ts`
2. Inyectar nombre de empresa en sección EMPRESA al inicio del contexto
3. Regla explícita en REGLAS DE COMUNICACION: "NUNCA inventes nombres de persona ni de empresa"
4. Regla general: "NUNCA inventes datos: ni nombres, ni empresas, ni precios, ni casos de exito"

**Archivos tocados**: `lib/chatbot/build-prompt.ts`

---

## 2026-04-21 — Primer mensaje de lead manual proponía reunión directamente

**Síntoma**: Al crear un lead manual, el primer WhatsApp decía "ver si podemos cuadrar una reunion para conocernos mejor" — demasiado directo, espantaba al lead.

**Causa raíz**: `buildFirstMessage()` en `lead-manual/route.ts` tenía textos hardcodeados que iban directos a CTA/reunión. Esta función NO usa el agente IA — los cambios en `build-prompt.ts` solo aplican cuando el lead responde.

**Solución**: Reescritura completa de `buildFirstMessage()`:
- Todos los mensajes ahora son rapport + pregunta concreta (sin CTA)
- Usa el nombre de empresa si existe para personalizar
- Cada canal tiene pregunta adaptada al contexto de origen
- Frontend pasa `empresa` al endpoint para personalización

**Archivos tocados**: `app/api/webhooks/lead-manual/route.ts`, `components/NewLeadModal.tsx`

---

## 2026-04-21 — WF6 lead manual: fallo silencioso al enviar WhatsApp

**Síntoma**: Al crear un lead manual con "Enviar WhatsApp al crear", el lead se creaba pero el WhatsApp no llegaba. Sin error visible en la UI.

**Causa raíz**: El endpoint `/api/webhooks/lead-manual` devolvía `success: true` incluso cuando Evolution API fallaba (`sendText` retornaba `ok: false`). El frontend no verificaba la respuesta del fetch. Logs insuficientes para diagnosticar.

**Solución**:
1. Endpoint ahora incluye `whatsapp_sent: boolean` en la respuesta
2. Logging detallado: tenant, lead, teléfono, instancia, resultado
3. Frontend muestra alert si el WhatsApp no se envió
4. Metadata de interacción incluye `envio_ok` para tracking

**Archivos tocados**: `app/api/webhooks/lead-manual/route.ts`, `components/NewLeadModal.tsx`

---

## 2026-04-21 — Agente IA propone reunion en primer mensaje y hace preguntas vagas

**Síntoma**: Al crear un lead manual con primer mensaje automático, el agente iba directo a proponer reunión ("ver si podemos cuadrar una reunion") y después hacía preguntas vagas ("cuéntame tú").

**Causa raíz**: El prompt no tenía reglas de primer contacto ni secuencia de cualificación obligatoria. Las reglas de CTA solo decían "cuando encaje naturalmente" sin definir un mínimo de intercambios.

**Solución**: Nueva sección "PRIMER CONTACTO" en el system prompt:
- Primer mensaje = saludo + 1 pregunta concreta. NUNCA CTA
- Prohibido "cuéntame tú/sobre ti" — preguntas siempre concretas y específicas
- Secuencia obligatoria: rapport → descubrimiento → valor → CTA (mínimo 3-4 intercambios)
- CTA solo cuando el lead muestra interés real o lo pide directamente
- El agente debe usar datos existentes del lead para personalizar preguntas

**Archivos tocados**: `lib/chatbot/build-prompt.ts`

---

## 2026-04-21 — Agente IA ignora config de estilo del tenant (emojis, longitud, formalidad)

**Síntoma**: El agente ignoraba las configuraciones de módulos del tenant. Emojis hardcodeado a "máximo 1", longitud hardcodeada a "máximo 2 frases", formalidad solo como número sin contexto.

**Causa raíz**: Las reglas de FORMATO DE ESCRITURA y ADAPTACION AL LEAD estaban hardcodeadas en `build-prompt.ts` sin consultar `modulos.estilo_emojis`, `modulos.estilo_longitud` ni `modulos.estilo_formalidad`. Los valores numéricos se inyectaban como "X/100" sin instrucción descriptiva.

**Solución**: Las 3 configuraciones ahora generan instrucciones descriptivas claras:
- Emojis 0 → "PROHIBIDO usar emojis" (reforzado en 3 puntos del prompt)
- Longitud 1 → "ultra-cortos, 1 frase" / 2 → "cortos, máximo 2 frases" / 3 → "moderados" / 4 → "detallados"
- Formalidad ≤20 → "muy informal, como un colega" / ≤60 → "equilibrado" / >80 → "muy formal, trato de usted"
- Aparecen en contexto dinámico, formato obligatorio y adaptación al lead

**Archivos tocados**: `lib/chatbot/build-prompt.ts`

---

## 2026-04-21 — Tecnicas de venta duplicadas en admin y agente IA

**Síntoma**: La sección "Técnicas de Venta" aparecía tanto en el panel admin (`/admin`) como en la config del agente IA (`ChatbotConfig`, pestaña "Técnicas de venta"). Dos editores para el mismo dato causaban confusión.

**Causa raíz**: En la refactorización del agente IA (sesión 2026-04-19) se añadió la pestaña en ChatbotConfig para admin, pero no se eliminó la sección preexistente del panel admin. Además, el fetch del admin no filtraba por `tenant_id` (bug). Y `build-prompt.ts` hacía una query duplicada para cargar técnicas.

**Solución**:
1. Eliminada sección completa de técnicas del admin panel (UI, states, funciones fetch/save)
2. Añadido template default completo en ChatbotConfig (NEPQ, gatillos mentales, estructura conversación, reglas de oro)
3. Eliminada query duplicada en `build-prompt.ts` — ahora usa `getDoc('tecnicas_venta')` como el resto de documentos

**Archivos tocados**: `app/(dashboard)/admin/page.tsx`, `src/ChatbotConfig.jsx`, `lib/chatbot/build-prompt.ts`

---

## 2026-04-21 — Sentry AbortError: Lock broken by another request with the 'steal' option

**Síntoma**: Sentry reportaba AbortError en la ruta `/` del CRM en vercel-preview. Error: `Lock broken by another request with the 'steal' option.`

**Causa raíz**: Supabase Auth (`@supabase/ssr`) usa el Web Locks API del navegador para coordinar el refresh de tokens entre pestañas. Cuando una pestaña "roba" el lock, la anterior recibe un AbortError. Es comportamiento esperado que Supabase maneja internamente, pero la promise rejection no se atrapa y Sentry la captura como error.

**Solución**: Añadir `ignoreErrors` en la config de Sentry del cliente (`instrumentation-client.ts`) para filtrar este mensaje específico.

**Archivos**: `instrumentation-client.ts`

**Lección**: No todos los errores de Sentry son bugs. Filtrar ruido conocido de librerías de terceros para mantener Sentry útil.

---

## 2026-04-19 — Webpack runtime error: __webpack_modules__[moduleId] is not a function

**Síntoma**: Al abrir cualquier página del dashboard, error runtime `__webpack_modules__[moduleId] is not a function` en `app/(dashboard)/layout.tsx:9`.

**Causa raíz**: `NotificationsProvider` se exportaba como `NotificationsContext.Provider` directamente (una referencia al objeto Provider de React). Webpack no puede serializar correctamente esta exportación como módulo, causando el error al resolver la importación en el layout.

**Solución**: Refactorizar `NotificationsProvider` como componente wrapper que recibe `children` y `value` como props, en vez de exportar `Context.Provider` directamente.

**Archivos**: `lib/notifications-context.tsx`

**Lección**: Nunca exportar `Context.Provider` directamente. Siempre crear un componente wrapper.

---

## 2026-04-19 — Variables Supabase faltaban en Vercel Development

**Síntoma**: `.env.local` generado por `vercel env pull` no incluía `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`. Middleware crasheaba con "Your project's URL and Key are required".

**Causa raíz**: Las variables de Supabase solo estaban configuradas para Production y Preview en Vercel, no para Development.

**Solución**: Añadidas las 3 variables al environment Development en Vercel via `vercel env add`.

**Archivos**: Vercel env vars (remoto), `.env.local` (local, gitignored)

---

## 2026-04-19 — RLS admin cross-tenant: migración neutralizada

**Síntoma**: Migración `20260413140000_fix_rls_admin_delete.sql` pendiente de aplicar. Si se aplicaba, rompería aislamiento multi-tenant (admins de un tenant verían datos de todos).

**Causa raíz**: La migración añadía `OR is_admin()` a policies RLS de leads/interacciones. Fue revertida en develop (SQL directo) pero el archivo seguía en el repo y podía aplicarse accidentalmente via Supabase Branching.

**Solución**: Nueva migración `20260419100000_fix_rls_restore_tenant_isolation.sql` que restaura policies a `tenant_id = auth.uid()` (sin `is_admin()`). La función `is_admin()` se mantiene porque la usan policies de `profiles`, `tenant_config` y `campanas`. El acceso admin cross-tenant se hace correctamente via `service_role` en API Routes (`/api/admin/campaigns-data`).

**Archivos**: `supabase/migrations/20260419100000_fix_rls_restore_tenant_isolation.sql`

**Lección**: RLS debe ser estricto (tenant-only). Acceso admin cross-tenant siempre via service_role en API Routes autenticadas, nunca abriendo RLS.

---

## 2026-04-19 — Limpieza console.logs de debug en producción

**Síntoma**: Logs de debug de sesiones anteriores (diagnóstico WhatsApp, diagnóstico RLS) activos en producción.

**Solución**: Eliminados todos los `console.log` de debug en WF1, WF2, WF6 y `lib/evolution.ts`. Se mantienen solo `console.error` para errores reales.

**Archivos**: `app/api/webhooks/whatsapp/route.ts`, `app/api/webhooks/lead/route.ts`, `app/api/webhooks/lead-manual/route.ts`, `lib/evolution.ts`

---

## 2026-04-15 — WhatsApp Itzalki Toldoak: envío + agente IA

### Problema 1: Mensajes no llegan al destinatario (RESUELTO)

**Síntoma**: Mensajes de WhatsApp aparecían como enviados en el CRM pero NO llegaban al teléfono. Solo afectaba a Itzalki Toldoak.

**Causa raíz**: `EVOLUTION_API_KEY` en Vercel (`E71FCBD8EF91-...`) no coincidía con la key real del servidor (`429683C4C977415CAAFCCE10F7D57E11`). HTTP 401. M&T funcionaba porque tenía key en BD.

**Solución**: Actualizar `EVOLUTION_API_KEY` en Vercel + añadir logging detallado a `sendText()`, WF1 y WF6.

### Problema 2: Agente IA no responde a mensajes entrantes (PENDIENTE)

**Síntoma**: Después de arreglar el envío, el agente IA no responde a mensajes entrantes. Los mensajes no llegan ni siquiera a Evolution API (el panel de chats de Evolution no los muestra), aunque WhatsApp sí los recibe (Carlos los ve en su teléfono).

**Causa raíz**: La sesión de Evolution API está desincronizada — aparece "Connected" pero no recibe mensajes entrantes. Se re-seteó el webhook via API REST pero el problema es que Evolution API no procesa los mensajes, no un tema de webhook.

**Solución pendiente**: Reconectar la instancia (Disconnect + escanear QR de nuevo con Carlos). Programado para 2026-04-16.

**Archivos**: `lib/evolution.ts`, `app/api/webhooks/lead/route.ts`, `app/api/webhooks/lead-manual/route.ts`, `app/api/webhooks/whatsapp/route.ts`

**Lección**: Siempre logear respuestas de APIs externas. Al onboardear un nuevo cliente, verificar envío Y recepción.

---

## 2026-04-14 — Campañas no muestra leads de otros clientes

**Síntoma**: Panel de campañas mostraba 0 leads para Itzalki y otros clientes. Solo M&T Consulting veía sus propios leads. Sentry: `filteredLeads is not defined` (MT-CRM-6/7/8).

**Causa raíz**: 
1. La migración `20260413140000_fix_rls_admin_delete.sql` (que añade `OR is_admin()` a la RLS de leads) NO se aplicó a la BD de producción. La policy original solo permite `tenant_id = auth.uid()`.
2. La columna `nome` no existe en la tabla `leads` (solo en TypeScript) → query 400.
3. Variable `filteredLeads` renombrada a `pipelineLeads` dejó referencia rota en producción.

**Solución**: 
1. Creado API route `/api/admin/campaigns-data` que usa `service_role_key` (bypasa RLS) para obtener todos los datos cross-tenant. Verifica auth + role admin.
2. Eliminada columna `nome` del select.
3. Corregidas todas las referencias a `pipelineLeads`.

**Archivos**: `app/(dashboard)/campaigns/page.tsx`, `app/api/admin/campaigns-data/route.ts` (nuevo)

**Pendiente**: Aplicar migración RLS a producción via Supabase Branching.

---

### 2026-04-14 — Lead no se quedaba en columna "Perdido"
- **Síntoma**: al mover lead a "Perdido" (drag & drop o dropdown), volvía a la columna anterior
- **Causa raíz**: CHECK constraint `leads_estado_check` solo permitía 6 estados hardcodeados (nuevo, contactado, caliente, negociacion, reunion, cliente). "perdido" no estaba. El update de Supabase fallaba silenciosamente y el polling cada 15s revertía el optimistic update.
- **Solución**: DROP constraint `leads_estado_check`. Los estados ahora son dinámicos via tabla `pipeline_estados`.
- **Archivos**: `supabase/migrations/20260414130000_drop_leads_estado_check.sql`
- **Lección**: Cuando añades nuevos estados a una tabla con CHECK constraint, SIEMPRE revisar y actualizar el constraint. Buscar con `grep CHECK.*estado` en las migraciones.

---

### 2026-04-14 — Follow-ups sonaban a ChatGPT
- **Síntoma**: mensajes de follow-up con emojis, ¡¿, "estoy aquí para ayudarte"
- **Causa raíz**: cron followups usaba `openai('gpt-4o')` directamente, no Claude. Además no leía la tonalidad del tenant.
- **Solución**: cambiar a `models.principal` (Claude Sonnet), cargar estilo del tenant, añadir reglas de formato
- **Archivos**: `app/api/cron/followups/route.ts`, `app/api/ai/train/route.ts`, `app/api/cron/auto-learn/route.ts`

---

### 2026-04-14 — Supabase Branching no configurado
- **Síntoma**: migraciones SQL se aplicaban directamente a producción
- **Causa raíz**: branching habilitado en proyecto pero rama develop no creada, .env.local apuntaba a BD producción
- **Solución**: crear branch develop, actualizar .env.local con credenciales develop
- **Lección**: NUNCA hacer `supabase db push` sin verificar que apunta a la BD correcta

---

### 2026-04-13 — Etiquetas: faltaba tenant_id al crear
- **Síntoma**: al crear etiqueta nueva, no se creaba (error silencioso)
- **Causa raíz**: insert a tabla `etiquetas` no incluía `tenant_id` (campo NOT NULL con RLS)
- **Solución**: obtener userId via `supabase.auth.getUser()` y pasarlo al insert
- **Archivos**: `components/LeadDetail.tsx`

---

### 2026-04-13 — Columnas pipeline: mismo bug tenant_id
- **Síntoma**: al crear columna nueva del pipeline, no se creaba
- **Causa raíz**: `userId` del state podía estar vacío en el closure de `addColumn`
- **Solución**: obtener userId fresco con `getUser()` al momento de crear
- **Archivos**: `lib/hooks/usePipelineColumns.ts`

---

### 2026-04-13 — Chat móvil: scroll bloqueado + sin botón volver
- **Síntoma**: chat no hacía scroll, no había forma de volver a la lista
- **Causa raíz**: contenedor sin overflow-y:auto, botón volver con display:none inline
- **Solución**: overflow-y:auto + -webkit-overflow-scrolling:touch, botón visible en móvil
- **Archivos**: `src/ChatView.jsx`, `src/App.css`

---

### 2026-04-13 — Chat: auto-scroll molesto al leer mensajes antiguos
- **Síntoma**: cada 15s el chat bajaba al fondo, interrumpiendo lectura
- **Causa raíz**: useEffect con scrollIntoView se ejecutaba en cada refresh de mensajes
- **Solución**: detectar si usuario está leyendo arriba (>80px del fondo), solo auto-scroll si está abajo
- **Archivos**: `src/ChatView.jsx`

---

### 2026-04-13 — WF2: error 500 por Chrome autofill en Evolution API config
- **Síntoma**: chatbot WF2 devolvía 500 en todas las respuestas tras refactor multi-tenant
- **Causa raíz**: Chrome autorellenó email/password en campos opcionales `evolution_api_url` y `evolution_api_key`. Como no eran vacíos, el fallback a env vars no se activaba → fetch iba a URL tipo `contacto@mytconsulting.es/message/sendText/...` → error
- **Solución**: (1) eliminar campos API URL/Key del UI de módulos (no son necesarios), (2) validar en `getEvolutionConfig` que api_url empiece por `http` antes de usarlo, (3) migración para limpiar valores basura de BD
- **Archivos**: `lib/evolution.ts`, `src/ModulosConfig.jsx`, migración `20260413160000_clean_evolution_garbage.sql`

---

### 2026-04-13 — Cross-tenant WhatsApp: M&T respondía a leads de Itzalki
- **Síntoma**: chatbot de M&T respondía mensajes de WhatsApp dirigidos a leads de Itzalki
- **Causa raíz**: instancia de Evolution API era global (env var única). Todos los webhooks entrantes se procesaban como si fueran de M&T
- **Solución**: aislamiento multi-tenant completo. Cada tenant tiene su propia `evolution_instance` en `configuracion_modulos`. El webhook entrante resuelve tenant por nombre de instancia. Nuevo módulo `lib/evolution.ts` con todas las funciones parametrizadas por tenant
- **Archivos**: `lib/evolution.ts` (nuevo), todos los endpoints de WhatsApp refactorizados, migración `20260413150000_evolution_per_tenant.sql`

---

### 2026-04-13 — Leads no se podían eliminar (FK citas sin CASCADE)
- **Síntoma**: error al intentar borrar un lead desde el CRM
- **Causa raíz**: foreign key `citas.lead_id` no tenía `ON DELETE CASCADE`
- **Solución**: migración para recrear FK con CASCADE
- **Archivos**: migración `20260413141000_fix_citas_cascade_delete.sql`

---

### 2026-04-13 — Landing pages no enviaban leads (CORS bloqueado)
- **Síntoma**: formulario de landing en `itzalki-mx3.vercel.app` no llegaba al webhook
- **Causa raíz**: sin headers CORS, el browser bloqueaba el POST cross-origin
- **Solución**: añadir `Access-Control-Allow-Origin: *` + handler OPTIONS en webhook lead
- **Archivos**: `app/api/webhooks/lead/route.ts`

---

### 2026-04-13 — WhatsApp activo para tenants sin configurar (toggle !== false vs === true)
- **Síntoma**: tenants sin config de WhatsApp igualmente intentaban enviar mensajes
- **Causa raíz**: la condición `canal_whatsapp !== false` devolvía true para `undefined` (tenants sin fila en configuracion_modulos)
- **Solución**: cambiar a `canal_whatsapp === true` (opt-in explícito)
- **Archivos**: todos los endpoints de WhatsApp (WF1, WF2, WF4, WF5, WF6)

---

### 2026-04-13 — Mensaje bienvenida mostraba "## NEGOCIO" (markdown crudo)
- **Síntoma**: primer WhatsApp al lead decía "## NEGOCIO" en vez del nombre del negocio
- **Causa raíz**: se parseaba primera línea de un documento markdown como nombre
- **Solución**: campo explícito `nombre_negocio` en configuracion_modulos + mensaje personalizable `mensaje_bienvenida`
- **Archivos**: `app/api/webhooks/lead/route.ts`, `src/ModulosConfig.jsx`, migraciones

---

### 2026-04-13 — API key Anthropic incorrecta → siempre GPT-4o fallback
- **Síntoma**: Anthropic Console $0 de uso, chatbot funcionaba con GPT-4o
- **Causa raíz**: env var ANTHROPIC_API_KEY contenía una key de OpenAI + model ID tenía sufijo de fecha incorrecto
- **Solución**: nueva API key correcta (sk-ant-...) + model ID `claude-sonnet-4-6` sin sufijo
- **Archivos**: Vercel env vars, `app/api/webhooks/whatsapp/route.ts`

---

### 2026-04-13 — RLS modificado rompió aislamiento multi-tenant (REVERTIDO)
- **Síntoma**: admin de un tenant veía leads de TODOS los tenants
- **Causa raíz**: se cambió policy RLS para permitir a admin ver todos los datos (intento de fix de eliminación)
- **Solución**: revertido inmediatamente. El problema real era la FK sin CASCADE, no RLS
- **Archivos**: migración `20260413140000_fix_rls_admin_delete.sql` (revertida via SQL directo)
- **Lección**: NUNCA modificar RLS sin preguntar primero

---

### 2026-04-12 — WF1: error 500 por tenant_id no-UUID
- **Síntoma**: `/api/webhooks/lead` devolvía 500
- **Causa raíz**: Supabase rechazaba tenant_id que no era UUID válido (ej: "test-debug-123")
- **Solución**: validar formato UUID con regex antes de hacer query. Devolver 400 con mensaje descriptivo
- **Archivos**: `app/api/webhooks/lead/route.ts`

---

### 2026-04-12 — WF2: respuestas duplicadas/triplicadas por debounce roto
- **Síntoma**: al enviar 3 mensajes seguidos, el bot respondía 3 veces (cada uno individualmente)
- **Causa raíz**: cada webhook de Evolution API lanza una función serverless independiente. Las 3 funciones dormían 15s y las 3 respondían porque no había mecanismo para que solo una procesara
- **Solución**: campo `debounce_token` en tabla leads. Cada función guarda su timestamp, tras dormir compara con el último token. Solo la función cuyo token coincide responde
- **Archivos**: `app/api/webhooks/whatsapp/route.ts`, migración `20260412175542_add_debounce_token_to_leads.sql`

---

### 2026-04-12 — WF2: audio no se transcribía (pttMessage vs audioMessage)
- **Síntoma**: audios de WhatsApp no se transcribían, bot respondía "no puedo procesar audios"
- **Causa raíz**: notas de voz de WhatsApp llegan como `pttMessage`, no solo `audioMessage`. El código solo detectaba `audioMessage`
- **Solución**: detectar ambos: `!!(message.audioMessage || message.pttMessage)`
- **Archivos**: `app/api/webhooks/whatsapp/route.ts`

---

### 2026-04-12 — WF2: tono del agente demasiado robótico
- **Síntoma**: bot usaba ¡!, ¿?, frases como "No dudes en decírmelo", repetía info de citas
- **Causa raíz**: reglas del prompt insuficientes, no prohibían signos de apertura ni frases de bot comunes
- **Solución**: reglas de formato estrictas (prohibido ¡¿, mayúsculas solo inicio frase/punto, lista extensa de frases prohibidas), reglas de comportamiento (no repetir info, no insistir con citas)
- **Archivos**: `lib/chatbot/build-prompt.ts`

---

### 2026-04-10 — Email no obligatorio en landing Itzalki
- **Síntoma**: leads entraban sin email desde la landing page de Itzalki (ejecución n8n #2812)
- **Causa raíz**: el campo email en `LP-Itzalki/index.html` no tenía `required` ni `data-required`, a diferencia de nombre y teléfono
- **Solución**: añadir `data-required`, `required`, asterisco en label, y mensaje de error al campo email
- **Archivos**: `LP-Itzalki/index.html` (líneas 1797-1807)

---

### 2026-03 — LID WhatsApp (JID incorrecto)
- **Síntoma**: mensajes de WhatsApp no llegaban a algunos contactos
- **Causa raíz**: Evolution API devuelve dos JIDs, uno con @s.whatsapp.net (real) y otro LID
- **Solución**: detectar cuál JID tiene @s.whatsapp.net y usar ese
- **Archivos**: WF2 en n8n

### 2026-03 — GCal dentro del agente causaba errores
- **Síntoma**: el agente IA fallaba al intentar crear eventos de calendario
- **Causa raíz**: las herramientas de GCal dentro del agente eran inestables
- **Solución**: mover GCal fuera del agente, crear eventos post-agente según config módulos
- **Archivos**: WF2 en n8n

### 2026-03 — Calendario no actualizado en tiempo real
- **Síntoma**: el agente ofrecía horarios ya ocupados
- **Causa raíz**: datos de citas solo se cargaban al inicio del workflow
- **Solución**: inyectar datos de citas en chatInput AL INICIO de cada mensaje del usuario
- **Archivos**: WF2 en n8n (formato: `=== CALENDARIO EN TIEMPO REAL ===`)

### 2026-03 — Citas duplicadas
- **Síntoma**: misma cita aparecía varias veces
- **Causa raíz**: sin deduplicación en la carga de citas
- **Solución**: dedup por ID en Preparar Prompt + returnAll=false limit=100 + unique constraint en BD
- **Archivos**: WF2 en n8n, tabla `citas` en Supabase

### 2026-03 — NewLeadModal se reseteaba
- **Síntoma**: modal de nuevo lead se cerraba/reseteaba con cada silentRefresh (15s)
- **Causa raíz**: el componente estaba inline en App y se re-renderizaba
- **Solución**: extraer NewLeadModal como componente estable fuera de App
- **Archivos**: src/App.jsx

### 2026-03 — CREATE POLICY IF NOT EXISTS no funciona
- **Síntoma**: error al crear policies RLS
- **Causa raíz**: PostgreSQL no soporta `IF NOT EXISTS` en `CREATE POLICY`
- **Solución**: usar `DROP POLICY IF EXISTS` + `CREATE POLICY`
- **Archivos**: setup.sql, migraciones

### 2026-03 — n8n no cambia tipo de nodo via API
- **Síntoma**: al intentar cambiar el tipo de un nodo por API, no se actualiza
- **Causa raíz**: limitación de la API de n8n
- **Solución**: eliminar el nodo y crear uno nuevo con otro nombre
- **Archivos**: workflows n8n via API
