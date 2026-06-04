# Decisiones técnicas

> Lo más reciente arriba. Formato: fecha, decisión, alternativas descartadas, razón.

---

### 2026-06-03 — No revocar EXECUTE de is_admin/is_super_admin pese al warning del Security Advisor

**Decisión**: ante los warnings `*_security_definer_function_executable`, arreglar solo las funciones de trigger (`handle_new_lead`, `handle_new_user`) revocando su EXECUTE por RPC, pero **dejar `is_admin()`/`is_super_admin()` ejecutables** por anon/authenticated.

**Alternativas descartadas**: revocar EXECUTE de las 4 funciones para silenciar todos los warnings.

**Razón**: `is_admin`/`is_super_admin` se invocan dentro de políticas RLS `to public` (`"Admins full access"` en `profiles` y `tenant_config`). En Postgres, las funciones usadas en políticas RLS se evalúan con los permisos del rol que consulta → revocar EXECUTE haría fallar las queries con "permission denied for function". El warning es el patrón esperado de Supabase para helpers de RLS y se asume como intencional. Para las vistas se usó `security_invoker = on` (respetan el RLS de quien consulta) en lugar de recrearlas.

---

### 2026-06-03 — Subir compute de Supabase de Nano a Micro (pendiente)

**Decisión**: migrar el compute del proyecto Supabase de **Nano a Micro**.

**Alternativas descartadas**: seguir en Nano.

**Razón**: en plan Pro, Micro está incluido en la cuota base → **mismo precio**, pero el doble de RAM (~1 GB vs ~0.5 GB) y mejor CPU/conexiones. Cambio de escalado vertical puro: no toca datos, schema, connection string ni env vars. Único impacto: reinicio de ~1-2 min → hacerlo en ventana de bajo tráfico. Decisión de infra a coordinar con Eneko. **Pendiente de ejecutar en Dashboard** (Project Settings → Compute and Disk).

### 2026-06-02 — Alta de clientes con email de "establecer contraseña" (Supabase Auth)

**Decisión**: el admin da de alta clientes desde `/admin` creando el usuario auth con `admin.auth.admin.createUser({ email_confirm: true })` y disparando el email con `admin.auth.resetPasswordForEmail(redirectTo)`. El cliente aterriza en `/auth/callback` → `/auth/set-password`, define su contraseña y entra. Réplica del mecanismo ya probado en la app de onboarding.

**Puntos clave del modelo de este CRM**:
- Un cliente = un usuario `auth.users` = una fila `profiles` = el `tenant_id`. **No hubo cambios de schema**: el trigger `on_auth_user_created` ya crea profile (`role='client'`), pipeline y módulos al insertar el usuario auth.
- El rol vive en `profiles.role`, NO en `app_metadata` (diferencia con onboarding, que sí usa `app_metadata.role`).
- `requireAdmin()` (server) verifica `profiles.role === 'admin'` reutilizando el patrón de `api/admin/metrics`.

**Alternativas descartadas**:
- `inviteUserByEmail` (1 sola llamada): usa el template "Invite user" en vez del "Reset Password" ya probado en onboarding. Se descartó para no divergir del flujo validado.
- Migración para poner `ON DELETE CASCADE` en las FK a `auth.users` (citas, configuracion_modulos, documentos_chatbot, fechas_bloqueadas, auto_learn_ejecuciones): se descartó para evitar tocar schema en prod. En su lugar, el `DELETE /api/admin/clients` borra esas tablas explícitamente antes de `deleteUser`.

**Razón**: apoyarse 100% en Supabase Auth (sin SMTP propio), cero migraciones (riesgo mínimo), y cambio aislado en middleware (`/auth/*` pasa siempre, sin afectar a `/login` ni `/register`).

**Archivos**: `app/api/admin/clients/route.ts`, `app/api/admin/clients/resend/route.ts`, `app/auth/callback/route.ts`, `app/auth/set-password/page.tsx`, `lib/supabase/server.ts` (`createServerSupabaseClient`, `requireAdmin`), `lib/site-url.ts`, `middleware.ts`, `app/(dashboard)/admin/page.tsx`. Config: env `NEXT_PUBLIC_SITE_URL` + Redirect URLs en Supabase.

---

### 2026-05-26 — Pagina /empresa con tabs (empresa, equipo, avatar cliente)

**Decision**: crear pagina unificada `/empresa` con 3 tabs: datos de empresa (nombre, nombre comercial), equipo (CRUD team members), y avatar cliente (perfil del cliente ideal). La antigua pagina `/team` se absorbe dentro de esta. Avatar cliente tiene tabla propia `avatar_cliente` con campo `generado_por` para que el agente IA pueda crear/editar perfiles.

**Alternativas descartadas**: (1) Mantener equipo como pagina separada — fragmenta la configuracion de empresa. (2) Meter avatar dentro de documentos_chatbot — semanticamente distinto, y el avatar tiene campos estructurados (sector, tamano, cargo) que no encajan en un doc libre.

**Razon**: agrupar empresa + equipo + avatar en una sola pagina es mas intuitivo para el usuario. El avatar cliente es un concepto de negocio, no de IA, asi que va en empresa, no en agente.

**Archivos**: `app/(dashboard)/empresa/page.tsx`, `types/avatar-cliente.ts`, `supabase/migrations/20260526200000_add_avatar_cliente.sql`

---

### 2026-05-26 — Team members como tabla separada de usuarios

**Decisión**: crear tabla `team_members` independiente de `usuarios` para gestionar miembros del equipo como etiquetas asignables a leads y citas. Campos: nombre, color, rol_label, telefono, email, avatar_url. Soft-delete via campo `activo`. FK `leads.asignado_a` re-apuntada de `usuarios` a `team_members`. Nuevo campo `citas.asignado_a` añadido.

**Alternativas descartadas**: (1) Reutilizar tabla `usuarios` existente — mezcla conceptos de auth futura con etiquetas simples, complica la migración a login real. (2) Usar el sistema de etiquetas existente (`etiquetas`) — no tiene campos de contacto (email, teléfono) y semánticamente es diferente.

**Razón**: los team members son un paso previo a usuarios con login. Mantenerlos separados permite implementar auth en el futuro vinculando `team_members.id` con `usuarios.id` sin migración destructiva. La tabla es ligera y multi-tenant con RLS.

**Archivos**: `supabase/migrations/20260526100000_add_team_members.sql`, `types/team-member.ts`, `lib/hooks/useTeamMembers.ts`, `app/(dashboard)/team/page.tsx`, `components/LeadDetail.tsx`, `components/LeadCard.tsx`, `src/CalendarioCitas.tsx`, `app/(dashboard)/pipeline/page.tsx`

---

### 2026-05-13 — Agente IA envía párrafos como mensajes separados

**Decisión**: Cuando la respuesta del agente contiene párrafos separados por doble salto de línea, cada párrafo se envía como un mensaje independiente de WhatsApp/Instagram, con su propio delay de "composing". La interacción en BD se guarda con el texto completo unificado.

**Alternativas descartadas**: (1) Instruir al agente via prompt a usar un separador especial (ej: `[MSG]`) — frágil y añade complejidad al parsing. (2) Enviar siempre un solo mensaje — menos natural, parece bot.

**Razón**: Una persona real no envía un bloque de texto con saltos de línea; envía mensajes cortos uno detrás de otro. Hace que el agente parezca más humano.

**Archivos**: `app/api/webhooks/whatsapp/route.ts`, `app/api/webhooks/instagram/route.ts`

---

### 2026-05-13 — Supabase Realtime habilitado para tabla interacciones

**Decisión**: Añadida tabla `interacciones` a la publicación `supabase_realtime` para que el chat del CRM reciba mensajes nuevos al instante. `ChatView.jsx` se suscribe a INSERT en `interacciones` y actualiza sidebar + chat abierto sin polling.

**Alternativas descartadas**: (1) Polling cada 10-15s — funciona pero no es instantáneo, mala UX en chat. (2) WebSockets custom — innecesario teniendo Supabase Realtime.

**Razón**: El sidebar de conversaciones no actualizaba el preview del último mensaje en tiempo real. Con Realtime, tanto el listado como el chat seleccionado se actualizan al instante.

**Archivos**: `src/ChatView.jsx`, `supabase/migrations/20260513103934_enable_realtime_interacciones.sql`

---

### 2026-04-26 — Calendly: datos del evento van a servicio + notas (no solo notas)

**Decisión**: Cuando sync-incoming recibe un evento de Google Calendar creado por Calendly, el título (`event.summary`, ej: "Ekaitz and M&T Consulting") se guarda como `citas.servicio`, y la descripción (`event.description`, respuestas Q&A de Calendly) se guarda como `citas.notas` + `leads.notas`. Antes todo iba a `citas.notas` con el summary.

**Alternativas descartadas**: (1) Webhook directo de Calendly — requiere plan Standard ($10/mes) y duplica la lógica de sync. (2) Guardar todo en campos_extra — menos visible para el equipo y el agente.

**Razón**: El equipo necesita ver el motivo/servicio de la cita separado de las notas Q&A. El agente IA necesita saber si el lead ya tiene cita Calendly para no ofrecer otra y enfocarse en recopilar info para la reunión.

---

### 2026-04-26 — Agente IA: comportamiento diferenciado según origen de cita (Calendly vs sin cita)

**Decisión**: build-prompt.ts ahora carga `origen`, `servicio`, `notas` de las citas del lead. Si tiene cita Calendly, el agente recibe instrucciones de no ofrecer otra cita y centrarse en extraer información útil para la reunión. Si no tiene cita, el texto es explícito en que debe guiarle a agendar.

**Alternativas descartadas**: (1) Flag booleano en el lead — añade columna innecesaria, la info ya está en citas. (2) Dejar que el agente lo deduzca del historial — poco fiable, el historial se trunca.

**Razón**: El welcome message de WhatsApp se envía antes de que el lead pueda reservar en Calendly. El agente debe adaptar su estrategia según si el lead reservó o no.

---

### 2026-04-26 — Landing pages auto-detectadas por body payload (no headers)

**Decisión**: Las landing pages se auto-registran cuando el formulario envía `landing_page` (dominio) y `landing_path` (ruta) en el body del POST. Fallback: si no llegan esos campos pero el tenant tiene 1 sola landing registrada, se asigna automáticamente.

**Alternativas descartadas**: (1) Detectar por Origin/Referer headers — no llegan si el form pasa por proxy o ciertos builders. (2) Webhook URL con parámetro `?lp=ID` — requiere configuración manual. (3) Registro manual en Integraciones — el usuario no quiere configurar nada.

**Razón**: El formulario de la landing ya hace `window.location.origin` y `window.location.pathname`, lo que da detección 100% fiable. Cada landing nueva que envíe esos campos se auto-registra sin tocar el CRM.

---

### 2026-04-25 — Rediseño visual CRM: Brand Book "Bilbao Night" + "Galerna"

**Decisión**: Aplicar nuevo sistema visual diseñado por Eneko (Brand Book v1.0) al CRM. Paleta oscura profesional (Ink #0B1220) con accent verde-agua (Galerna #14C8A4). Tipografía Geist Sans + Geist Mono. Ejecución en 6 fases (Fase 0-5), solo cambios visuales.

**Alternativas descartadas**: (1) Tailwind UI — genérico, no refleja la marca. (2) shadcn/ui — requiere migración completa. (3) CSS-in-JS (styled-components) — innecesario para este scope.

**Razón**: El CRM actual usa estilos inline con colores indigo genéricos. El nuevo sistema de diseño refleja la identidad de M&T Consulting con tokens CSS, clases `crm-*` reutilizables y tipografía profesional. Se mantiene CSS plano global para minimizar riesgo.

---

### 2026-04-24 — Google Calendar sync entrante: polling cron cada 15min en vez de watch channels

**Decisión**: Usar un cron job cada 15 minutos con `syncToken` incremental para leer cambios de Google Calendar, en lugar de push notifications (watch channels + webhook).

**Alternativas descartadas**: (1) Watch channels con webhook entrante — más complejo: requiere renovación cada 7 días, cron de renovación, verificación de token en webhook, y expone superficie de ataque. (2) Polling sin syncToken — ineficiente, lee todos los eventos cada vez.

**Razón**: El polling con syncToken es operacionalmente más simple (un solo cron, sin estado de watches, sin webhook público), con latencia aceptable (máx 15min). Para un CRM con decenas de citas, no cientos por minuto, la latencia es perfectamente asumible. Si en el futuro se necesita near-realtime, se puede añadir watch channels encima sin tocar el cron existente.

---

### 2026-04-24 — Google Calendar sync: timezone local via regex, no via Date

**Decisión**: Parsear las fechas de Google Calendar extrayendo directamente la parte local del string ISO (ej: `2026-04-28T10:30:00+02:00` → `10:30`) en vez de convertir con `new Date()`.

**Alternativas descartadas**: (1) `new Date().toISOString()` — convierte a UTC, pierde la hora local del usuario. (2) `toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' })` — depende de que el servidor tenga la timezone correcta.

**Razón**: Google envía `dateTime` con offset incluido, la hora local ya está en el string. Extraerla con regex es determinista y no depende de la configuración del servidor (Vercel usa UTC). El fallback con `toLocaleString` Europe/Madrid cubre el caso edge de formatos inesperados.

---

### 2026-04-24 — Google Calendar sync saliente: endpoint API para frontend + fire-and-forget en webhooks

**Decisión**: Para el sync saliente (CRM → Google), los webhooks (WhatsApp/Instagram) llaman al helper `syncCitaToGoogle()` directamente en fire-and-forget. El CalendarioCitas (client-side JSX) llama a un endpoint `/api/integrations/google/sync-cita` que internamente usa el mismo helper.

**Alternativas descartadas**: (1) Database trigger en Supabase — no tiene acceso a las env vars de Google ni al cifrado del refresh_token. (2) Realtime subscription — añade complejidad de infraestructura. (3) Migrar CalendarioCitas a server component — Fase 7.

**Razón**: El helper server-side es el punto único de sync. Los webhooks ya corren en servidor, así que lo llaman directo. El JSX legacy necesita un proxy HTTP porque no puede ejecutar código server-side. El endpoint es mínimo y solo verifica sesión + delega al helper.

---

### 2026-04-24 — Google Calendar: OAuth directo con cifrado AES-256-GCM

**Decisión**: Implementar OAuth Authorization Code flow directo contra Google (sin librería `googleapis`), cifrando el refresh_token con AES-256-GCM en capa de aplicación antes de guardarlo en BD. Ruta dedicada `/integrations` separada de `/modules`.

**Alternativas descartadas**: (1) Usar npm `googleapis` — añade dependencia pesada cuando solo necesitamos 4-5 endpoints. (2) Guardar refresh_token en claro — riesgo de seguridad si la BD se compromete. (3) Meter la integración dentro de `/modules` — conceptualmente distinto (OAuth vs feature flags).

**Razón**: Fetch directo es más ligero y controlable. El cifrado AES-256-GCM con clave en env var protege los tokens incluso si hay acceso no autorizado a la BD.

---

### 2026-04-24 — Prompt canal-aware + campañas Instagram configurables

**Decisión**: `build-prompt.ts` recibe parámetro `canal` que adapta el prompt (tono, rapport, referencias al canal). Las campañas Instagram (keywords tipo sorteo/publicación) se configuran en el CRM (tabla `campanas_instagram`) y se inyectan en el prompt cuando el canal es Instagram.

**Alternativas descartadas**: (1) ManyChat para campañas — es herramienta externa, añade dependencia, y las keywords simples se resuelven bien con el LLM si tiene contexto. (2) Prompt fijo para Instagram sin campañas — los tenants necesitan configurar campañas distintas sin tocar código.

**Razón**: Las campañas como configuración (no como código) permite a cada tenant crear/pausar campañas sin depender de desarrollo. El LLM detecta keywords con fiabilidad suficiente para DMs (no es lo mismo que detectar en cientos de comentarios públicos, donde ManyChat sí sería mejor).

---

### 2026-04-23 — Instagram DMs: mismo agente IA con adaptador de transporte

**Decisión**: Reutilizar el core de IA (build-prompt.ts + parse-response.ts) para Instagram, creando solo un adaptador de transporte (`lib/instagram.ts`) y un webhook receptor (`/api/webhooks/instagram`). Unificar envío con dispatcher `lib/messaging.ts` que resuelve canal automáticamente. Leads de Instagram se identifican por `instagram_user_id` (IGSID) en vez de teléfono. Auto-crear leads que escriban por DM.

**Alternativas descartadas**: (1) Duplicar toda la lógica del chatbot en un webhook separado — duplicación masiva. (2) Usar Evolution API para Instagram (soporta IG en algunas versiones) — dependencia innecesaria, Meta Graph API es más directa y estable. (3) Crear un solo webhook unificado WA+IG — demasiada complejidad en un solo archivo, los formatos de payload son muy distintos.

**Razón**: La separación webhook (transporte) vs chatbot (lógica IA) ya existía de facto. Solo faltaba formalizarla. El dispatcher en `lib/messaging.ts` permite que cron jobs (follow-ups, recordatorios) funcionen multi-canal sin tocar la lógica de negocio.

---

### 2026-04-22 — Auditoría de seguridad: estrategia de fixes

**Decisión**: Ejecutar auditoría de seguridad completa con 4 agentes en paralelo (auth/RLS, APIs/inyección, secrets/deps, data exposure/IDOR). Fixes aplicados en 4 commits incrementales, cada uno verificado con build completo. Migraciones SQL ejecutadas manualmente en Supabase.

**Alternativas descartadas**: (1) Auditoría manual archivo por archivo — demasiado lento. (2) Herramientas automatizadas tipo SAST — no cubren lógica de negocio ni RLS.

**Razón**: Los agentes en paralelo cubren más superficie de ataque en menos tiempo. Cada uno especializado en un área permite profundidad sin sacrificar amplitud. Los builds incrementales garantizan que nada se rompe.

---

### 2026-04-22 — Prompt injection: sanitización + instrucción defensiva (doble capa)

**Decisión**: Dos capas de defensa contra prompt injection: (1) función `sanitizeUserInput()` que elimina patrones como `[SYSTEM]`, `[OVERRIDE]`, `### SYSTEM` de datos del lead, (2) instrucción en el system prompt que dice al modelo ignorar instrucciones del lead que contradigan sus reglas.

**Alternativas descartadas**: (1) Solo sanitización — insuficiente, no cubre todos los patrones. (2) Solo instrucción — el modelo puede fallar si el ataque es sofisticado. (3) Delimitadores XML para envolver datos del lead — añade complejidad al prompt sin garantía.

**Razón**: La doble capa (filtrado + instrucción) es la práctica estándar. La sanitización es conservadora (no rompe mensajes normales), solo elimina patrones que un lead legítimo nunca usaría.

---

### 2026-04-22 — Reescritura sistema de citas: tag específico + anti-duplicados + orden cancelar→crear

**Decisión**: Nuevo tag `[CITA_CANCELAR:fecha,hora]` para cancelar cita específica. Reagendar = cancelar+crear en un mensaje. Verificación anti-duplicados. Huecos ocupados visibles en prompt.

**Alternativa descartada**: Dar al agente herramientas/tools para consultar calendario en tiempo real (más complejo, más latencia, más tokens).

**Razón**: El sistema de tags es simple y funciona si las reglas son explícitas. Los 4 fallos eran por instrucciones ambiguas y falta de verificación, no por limitación del approach.

---

### 2026-04-21 — Config de estilo del tenant genera instrucciones descriptivas en el prompt

**Decisión**: convertir los valores numéricos de `configuracion_modulos` (emojis, longitud, formalidad) en instrucciones descriptivas claras para el modelo IA, inyectadas en 3 puntos del prompt (contexto, formato obligatorio, adaptación al lead).

**Alternativa descartada**: dejar los valores numéricos como "X/100" y confiar en que el modelo los interprete.

**Razón**: el modelo priorizaba instrucciones hardcodeadas explícitas ("máximo 1 emoji", "máximo 2 frases") sobre números ambiguos. Con texto descriptivo ("PROHIBIDO emojis", "ultra-cortos, 1 frase") el modelo obedece consistentemente.

---

### 2026-04-21 — Técnicas de venta: un solo punto de edición en ChatbotConfig

**Decisión**: eliminar la sección de técnicas de venta del panel admin y mantener únicamente la pestaña "Técnicas de venta" en ChatbotConfig (visible solo para admin). Template default completo incluido.

**Alternativa descartada**: mantenerlo en admin como documento global para todos los tenants.

**Razón**: el admin panel no filtraba por `tenant_id` al leer (bug), y tener dos editores causaba confusión. ChatbotConfig ya gestiona todos los documentos por tenant correctamente y es donde el usuario espera encontrarlo.

---

### 2026-04-21 — Panel de métricas del agente IA con 6 widgets clave

**Decisión**: crear un panel de métricas en `/admin/metricas` con 6 widgets: conversaciones por estado, tasa de recuperación tras rechazo, estado del auto-learn, follow-ups por bucket, salud de documentos, y comparativa citas ON vs OFF (solo super-admin). Endpoint `/api/admin/metrics` con filtros por rango y tenant.

**Alternativas descartadas**: métricas en el dashboard general (mezclaría datos operativos con analítica del agente), panel de analytics externo como Metabase (añade infra), métricas calculadas en tiempo real en cada vista (lento).

**Razón**: las 6 métricas elegidas responden a las preguntas de negocio más urgentes: ¿el agente recupera leads? ¿el auto-learn funciona? ¿los follow-ups convierten? ¿los docs están configurados? Un endpoint único con service_role es más rápido y seguro que calcular en frontend. RLS se respeta: un owner solo ve sus datos.

---

### 2026-04-21 — Cron monitor-agent diario con alertas via Sentry/console

**Decisión**: cron diario a las 8AM que detecta auto-learn parado >48h y docs editables incompletos con chatbot activo. Las alertas se emiten como `console.warn` (capturadas por Sentry).

**Alternativas descartadas**: alertas directas a Slack API (requiere webhook config), alertas solo en UI (nadie la mira a diario), cron cada hora (excesivo para monitoreo diario).

**Razón**: console.warn es capturado automáticamente por Sentry y puede enrutarse a Slack via las alertas de Sentry ya configuradas. Sin dependencias extra. 8AM es después del auto-learn (3AM), así que detecta si falló la misma noche.

---

### 2026-04-21 — Auto-learn bidireccional: aprender de fracasos además de éxitos

**Decisión**: el cron auto-learn (WF8) ahora analiza tanto leads exitosos (es_ganado) como fallidos (es_perdido). Los patrones se guardan en un doc separado `patrones_aprendidos` con secciones diferenciadas para éxitos y fracasos.

**Alternativas descartadas**: seguir aprendiendo solo de éxitos (pierde información valiosa), mezclar patrones de éxitos y fracasos en el mismo doc sin estructura (difícil de leer).

**Razón**: las objeciones no rebatidas y los momentos de pérdida de interés son más valiosos que los éxitos para mejorar el agente. Un doc separado (`patrones_aprendidos`) evita contaminar `ejemplos_conversacion` (que es para estilo, no para estrategia). La telemetría en `auto_learn_ejecuciones` permite monitorizar que el cron funciona.

---

### 2026-04-21 — Patrones aprendidos en doc propio (no en ejemplos_conversacion)

**Decisión**: crear un tipo de documento nuevo `patrones_aprendidos` en vez de acumular en `ejemplos_conversacion`. Se inyecta en el prompt con etiqueta diferenciada.

**Alternativas descartadas**: seguir acumulando en `ejemplos_conversacion` (se mezclaban estilos con estrategia y se truncaba ciegamente).

**Razón**: `ejemplos_conversacion` captura ESTILO de comunicación (cómo habla el dueño). `patrones_aprendidos` captura ESTRATEGIA (qué funciona y qué no). Mezclarlos degrada ambos. El truncado inteligente elimina entradas antiguas por sección, no al final del string.

---

### 2026-04-21 — Follow-ups por buckets (silencio / tibio / rechazo)

**Decisión**: clasificar el último mensaje del lead en 3 buckets antes de generar el follow-up. Cada bucket tiene instrucciones de prompt distintas. La clasificación usa keywords primero y Claude Haiku como fallback para ambiguos.

**Alternativas descartadas**: follow-up genérico para todos (un "te quedó alguna duda?" a alguien que rechazó es contraproducente), clasificación solo con IA (latencia + coste innecesario para casos obvios).

**Razón**: un lead que dijo "no me interesa" necesita un reframe, no un "alguna duda?". Un lead que preguntó "cuánto cuesta?" y desapareció necesita un recordatorio casual. Keywords cubren el 80% de los casos; Haiku resuelve los ambiguos por ~$0.001/clasificación.

---

### 2026-04-21 — Desactivar chatbot tras doble rechazo sin respuesta

**Decisión**: si un lead recibe un follow-up bucket RECHAZO y no responde, al pasar el cron por segunda vez con el mismo bucket, se desactiva `chatbot_activo=false` automáticamente.

**Alternativas descartadas**: dejar que el maxIntentos global lo controle (no diferencia entre silencio y rechazo activo), nunca desactivar (perseguir a leads que dicen "no").

**Razón**: perseguir a alguien que rechazó explícitamente 2 veces daña la reputación del negocio y puede causar bloqueo en WhatsApp. Mejor cortar limpio y dejar la puerta abierta.

---

### 2026-04-21 — Objeciones con principios, no respuestas fijas

**Decisión**: la sección de manejo de objeciones del system prompt da PRINCIPIOS de venta (validar, preguntar, reformular, micro-compromiso) en vez de frases literales que el agente copie.

**Alternativas descartadas**: lista de objeciones con respuestas exactas, few-shot examples de objeciones, doc separado de objeciones por tenant.

**Razón**: frases fijas matan la naturalidad del agente y se notan como bot. Claude es capaz de aplicar principios con su propia voz adaptada al tenant. Los principios cubren las 6 categorías comunes (rechazo sin razón, precio, competencia, tiempo, rechazo tras interés, rechazo persistente) y escalan a cualquier sector sin necesidad de configuración por tenant.

---

### 2026-04-21 — CTA retry con cooldown de 3 turnos

**Decisión**: sustituir la regla "ofrece cita UNA vez y nunca más" por un cooldown de 3 turnos. Si el lead rechaza el CTA (cita o acción), no se ofrece en los 3 turnos siguientes, pero se puede re-proponer si el lead muestra interés renovado.

**Alternativas descartadas**: mantener "una vez y nunca más" (demasiado pasivo), ofrecer siempre (demasiado agresivo), contador de intentos en BD.

**Razón**: un setter humano no se rinde tras un "no" pero tampoco insiste inmediatamente. 3 turnos es suficiente espacio para que el lead vuelva a preguntar por precio/proceso sin que el agente parezca insistente. No requiere estado en BD — Claude gestiona el cooldown leyendo el historial de la conversación.

---

### 2026-04-21 — Adaptación del estilo al registro del lead

**Decisión**: el agente adapta su formalidad, emojis y longitud al registro del lead (detectado en sus primeros 2-3 mensajes), dentro de los límites del tenant como techo.

**Alternativas descartadas**: estilo fijo por tenant sin adaptación, detección de estilo con modelo ligero previo, campo manual de estilo por lead.

**Razón**: un lead formal que usa "usted" no debe recibir un "tio que pasa!". Los parámetros del tenant (estilo_formalidad, estilo_emojis, estilo_longitud) pasan de ser valores fijos a ser límites máximos dentro de los cuales el agente se mueve hacia el registro del lead. No requiere cambios de BD ni lógica extra — Claude lo maneja con una instrucción clara en el prompt.

---

### 2026-04-19 — Documentos del agente clasificados por origen (usuario vs auto-generado)

**Decisión**: dividir los 6+1 tipos de documentos del chatbot en 3 categorías: usuario (negocio, disponibilidad, faqs), auto-generado (identidad_voz, calificacion, ejemplos_conversacion) y admin (tecnicas_venta). La UI muestra 3 pestañas. Los docs auto-generados son readonly para el usuario.

**Alternativas descartadas**: mantener los 6 editables para todos, crear un wizard guiado, eliminar docs técnicos.

**Razón**: los dueños de negocio (fisioterapeutas, abogados, etc.) no saben rellenar docs técnicos como "identidad_voz" o "calificacion". Acaban vacíos o con contenido irrelevante, degradando al agente. Solo deben ver/editar lo que dominan: su negocio, horarios y FAQs. El resto se auto-genera via entrenamiento.

---

### 2026-04-19 — System prompt condicional según citas_activo

**Decisión**: el system prompt del agente IA es ahora condicional. Si `citas_activo=true`, incluye reglas de agendación, calendario y tags [CITA:]. Si `citas_activo=false`, excluye todo lo relativo a citas e inyecta reglas orientadas al CTA definido en el doc negocio.

**Alternativas descartadas**: mantener reglas de citas siempre (con un "no ofrezcas cita" cuando está OFF), crear system prompts separados por tipo de negocio.

**Razón**: un ecommerce o tienda física no necesita que el agente mencione citas. El prompt "cita-céntrico" degradaba la experiencia para esos tenants. La política de precios también cambia: con citas ON, se redirige a la llamada; con citas OFF, se usa la política definida en el doc negocio.

---

### 2026-04-19 — Escenarios de entrenamiento dinámicos por tenant

**Decisión**: los escenarios de entrenamiento se generan con Claude a partir del doc negocio del tenant, adaptados a su sector/oferta. Si no hay doc negocio, se usan escenarios genéricos de fallback.

**Alternativas descartadas**: mantener 8 escenarios hardcodeados iguales para todos, crear escenarios manualmente por sector.

**Razón**: un fisioterapeuta, un abogado y una agencia de marketing reciben objeciones distintas. Escenarios genéricos no capturan cómo manejan objeciones específicas de su sector. La generación dinámica es más escalable que mantener plantillas por sector.

---

### 2026-04-19 — Vitest como framework de tests

**Decisión**: usar Vitest para tests unitarios y de integración. Configurado con alias @ para rutas absolutas.

**Alternativas descartadas**: Jest (requiere más config con Next.js ESM), no tener tests.

**Razón**: Vitest es nativo ESM, compatible con Vite y Next.js sin config extra, mismo API que Jest. El proyecto no tenía ningún test — empezar con doc-parser y build-prompt cubre la lógica condicional más crítica.

---

### 2026-04-13 — Evolution API multi-tenant: una instancia por tenant

**Decisión**: cada tenant tiene su propia instancia de Evolution API configurada en `configuracion_modulos`. El webhook entrante resuelve el tenant por nombre de instancia. API URL y API Key se gestionan por env vars (compartidas), no expuestas en el UI.

**Alternativas descartadas**: instancia global compartida (causó cross-tenant leak), campos API URL/Key editables por tenant en UI (Chrome autofill los corrompía).

**Razón**: la instancia global causó que M&T respondiera a leads de Itzalki. Cada tenant necesita su propia instancia de WhatsApp (su propio número). Los campos técnicos (URL, Key) no deben estar en UI de usuario — se gestionan por soporte/admin via BD directa o env vars.

---

### 2026-04-13 — Campos Evolution API URL/Key no editables desde UI

**Decisión**: los campos `evolution_api_url` y `evolution_api_key` existen en BD pero NO se exponen en el formulario de módulos. Solo `evolution_instance` (nombre de instancia) es visible.

**Alternativas descartadas**: campos editables opcionales, campos obligatorios.

**Razón**: Chrome autofill corrompió los campos opcionales con email/password, causando 500 en el chatbot. Como todos los tenants comparten el mismo servidor Evolution API, basta con env vars. Si en el futuro un tenant tiene su propio servidor, se configura directamente en BD.

---

### 2026-04-13 — Mensaje de bienvenida personalizable por tenant (solo landing)

**Decisión**: campo `mensaje_bienvenida` con placeholder `{nombre}` + archivo adjunto opcional. Solo aplica a leads capturados por landing page (WF1). Leads manuales (WF6) usan su propio mensaje por canal.

**Alternativas descartadas**: mensaje único para todos los canales, generación IA del mensaje.

**Razón**: el primer contacto desde landing debe ser inmediato y personalizado por negocio. Leads manuales ya tienen contexto (cold call, referido, etc.) y necesitan mensajes distintos. Separar ambos da más control sin complejidad.

---

### 2026-04-12 — WhatsApp bienvenida automático en WF1

**Decisión**: al crear un lead nuevo con teléfono, enviar automáticamente un WhatsApp de bienvenida personalizado con el nombre del negocio del tenant.

**Alternativas descartadas**: no enviar nada (el lead espera contacto), enviar email (no usamos email), mensaje genérico igual para todos.

**Razón**: el lead acaba de dejar sus datos en la landing y espera contacto inmediato. Un WhatsApp en los primeros segundos aumenta la tasa de respuesta. Al personalizar con el nombre del negocio, cada tenant tiene su propio mensaje sin configuración extra. Si falla el envío, el lead se guarda igualmente.

---

### 2026-04-12 — Debounce con token en BD para serverless

**Decisión**: usar un campo `debounce_token` en la tabla `leads` para coordinar funciones serverless concurrentes. Cada función guarda su timestamp, duerme 15s, y solo procesa si su token sigue siendo el último.

**Alternativas descartadas**: Redis/edge cache, cancelar funciones previas, flag is_processing con lock.

**Razón**: en serverless, cada webhook lanza una función independiente que no puede comunicarse con las demás. Un lock en BD es race-condition prone. El patrón de "último timestamp gana" es simple, sin race conditions (cada función tiene un timestamp único), y no requiere infraestructura adicional.

---

### 2026-04-12 — Componentes src/ reutilizados via wrappers durante migración

**Decisión**: en vez de reescribir todos los componentes de src/ (ChatbotConfig, CalendarioCitas, ChatView, EntrenarAgente, ModulosConfig), crear páginas wrapper en app/ que importan los .jsx originales y les pasan supabase + session como props.

**Alternativas descartadas**: reescribir cada componente completo en TSX.

**Razón**: menor riesgo de introducir bugs. Los componentes ya funcionan. Se reescribirán gradualmente a TSX cuando se toquen para añadir features.

---

### 2026-04-12 — useMemo para Supabase client en componentes React

**Decisión**: envolver `createClient()` con `useMemo(() => createClient(), [])` en todos los componentes.

**Alternativas descartadas**: crear el client fuera del componente como variable de módulo.

**Razón**: `createClient()` devuelve una nueva referencia cada vez, lo que causa loops infinitos en useEffect/useCallback que tienen supabase como dependencia. useMemo estabiliza la referencia.

---

### 2026-04-12 — Notifications Context + Portal para sonido en Pipeline

**Decisión**: usar React Context para compartir funciones de notificación desde el layout a las páginas hijas, y createPortal para inyectar controles del Pipeline en el top bar del layout.

**Alternativas descartadas**: duplicar useNotifications en cada página, mover todo al layout.

**Razón**: el sonido de notificación solo funciona si se dispara desde un gesto de usuario (browser restriction). El drag-and-drop del Pipeline es el gesto — necesita acceso directo a notifyStatusChange. El portal permite que cada página inyecte sus controles específicos en el top bar compartido.

---

### 2026-04-11 — Migrar de React (Vite) a Next.js App Router

**Decisión**: migrar todo el frontend a Next.js con App Router para tener API Routes nativas, SSR, middleware y un backend integrado.

**Alternativas descartadas**: mantener Vite + añadir carpeta `api/` con Vercel Serverless Functions.

**Razón**: al eliminar n8n y mover toda la lógica de automatización a código, necesitamos un backend robusto. Next.js integra frontend + backend en un solo deploy, tiene el estándar de Vercel (AI SDK, cron jobs, middleware auth), y escala mejor como SaaS. La alternativa de Vite + serverless sería más rápida hoy pero limitante a 6 meses.

---

### 2026-04-11 — Eliminar n8n: migrar todos los workflows a API Routes

**Decisión**: migrar progresivamente los 8 workflows del CRM (WF1, WF2, WF4, WF5, WF6, WF7, WF8 + copias por cliente) a API Routes en Next.js. n8n deja de ser parte de la infraestructura del CRM.

**Alternativas descartadas**: mantener n8n para automatizaciones, mantener n8n solo para crons.

**Razón**: n8n es el cuello de botella para trabajar con ramas Git (no tiene branching), para escalar (single instance), y para mantener (WF2 con 47 nodos es inmantenible). Al mover a código: versionado Git, tests, ramas, PRs, un solo deploy. Además, los WF duplicados por cliente (WF1, WF6) se eliminan — un solo endpoint multi-tenant.

---

### 2026-04-11 — Claude Sonnet 4.6 como modelo principal del agente IA

**Decisión**: usar Claude Sonnet 4.6 (Anthropic) como modelo principal del setter IA. GPT-4o como fallback si Anthropic cae. Claude Haiku 4.5 para tareas ligeras (scoring, clasificación).

**Alternativas descartadas**: seguir solo con GPT-4o, usar Grok, usar modelos open source (Llama).

**Razón**: Claude Sonnet es superior en mantener tono natural/humano en español y en seguir instrucciones de estilo. Para un setter que debe parecer una persona real, la calidad del tono es crítica. Multi-modelo via Vercel AI SDK permite cambiar o combinar proveedores sin reescribir código.

---

### 2026-04-11 — Supabase Branching para entornos de desarrollo

**Decisión**: activar Supabase Branching (plan Pro ya activo, $0.01344/hora por branch) para tener BD aisladas por rama.

**Alternativas descartadas**: proyecto Supabase separado para staging (gratis pero manual).

**Razón**: con branching, cada rama Git tiene su propia BD automáticamente. Evita sincronizar schemas manualmente entre proyectos. El coste (~$5-10/mes) es asumible para el valor que aporta.

---

### 2026-04-10 — Roadmap de 7 fases con orden estricto

**Decisión**: implementar funcionalidades en fases secuenciales (Fase 0: ramas → Fase 1: UTM → Fase 2: lifecycle → Fase 3: super-admin → Fase 4: comms → Fase 5: Meta API → Fase 6: Stripe).

**Alternativas descartadas**: implementar todo en paralelo, priorizar panel super-admin antes de atribución.

**Razón**: la campaña de Itzalki ya corre sin tracking; sin atribución por creativo, el panel super-admin no aporta casi nada. Cada fase depende de la anterior. No mezclar fases en un solo deploy para no romper producción.

---

### 2026-04-10 — Pipeline: primero estados fijos, luego configurable

**Decisión**: añadir "perdido" y "ganado" como estados fijos extra primero. Hacer el pipeline 100% configurable por tenant después (Fase 2.5).

**Alternativas descartadas**: implementar pipeline dinámico desde el principio.

**Razón**: el pipeline configurable toca TODA la app (Kanban, Lista, LeadDetail, Dashboard, WF2). Los estados fijos extra cubren el 80% del valor con 10% del esfuerzo. Validar con 2-3 clientes qué estados necesitan antes de invertir en el dinámico.

---

### 2026-04-10 — Landing pages siempre propias

**Decisión**: M&T controla el 100% de las landing pages (hechas con Claude Code). No trabajar con webs de terceros para captura de leads.

**Alternativas descartadas**: integrar con webs existentes de clientes.

**Razón**: máxima compatibilidad con campañas + CRM. Control total del script de UTMs, formularios, y webhook. Excepción: e-commerce (Shopify etc.) donde no es viable.

---

### 2026-04-10 — Meta WhatsApp Business API como target para WhatsApp

**Decisión**: migrar a Meta WhatsApp Business API oficial con Embedded Signup en el CRM (como Combo K / Buvio IA).

**Alternativas descartadas**: seguir con Evolution API indefinidamente.

**Razón**: más estable, soporte oficial, todos los mensajes pasan por webhook (arregla follow-ups con mensajes manuales), Embedded Signup permite onboarding self-service. Clientes nuevos van directo a Meta API; existentes se migran después.

---

### 2026-04-10 — Super-admin como ruta en la misma app

**Decisión**: el panel super-admin será una ruta dentro del mismo CRM (`/admin/clientes`), no una sub-app aparte.

**Alternativas descartadas**: crear aplicación separada para super-admin.

**Razón**: sigue el mismo patrón que `isAdmin` ya implementado. Sin complicar despliegue. Misma fuente de datos (Supabase), RLS bypass read-only para `super_admin`.

---

### 2026-03 — Modularidad: cada tenant activa lo que necesita

**Decisión**: sistema de módulos configurables (`configuracion_modulos`) donde cada funcionalidad se puede activar/desactivar por tenant.

**Alternativas descartadas**: features globales para todos los tenants.

**Razón**: distintos negocios tienen necesidades distintas (toldos vs clínica dental vs inmobiliaria). Un set de workflows compartidos sirve a todos, la config vive en la BD.

---

### 2026-03 — GCal fuera del agente IA

**Decisión**: mover la creación de eventos de Google Calendar fuera del agente IA, como paso post-agente.

**Alternativas descartadas**: dejar GCal como herramienta del agente.

**Razón**: las herramientas de GCal dentro del agente eran inestables y causaban errores frecuentes. Como paso post-agente, se controla mejor y se respeta la config de módulos.
