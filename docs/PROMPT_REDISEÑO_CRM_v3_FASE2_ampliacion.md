# 🔁 Rediseño CRM — FASE 2: Reorganización del layout de cada pantalla

> **Lee esto entero antes de tocar nada. No es un reemplazo de la fase anterior — es una ampliación que se monta encima.**

---

## 📍 Contexto: dónde estamos ahora

En la **Fase 1** ya aplicaste correctamente:
- ✅ Tokens de diseño (variables CSS: `--ink`, `--tide`, `--paper-2`, etc.)
- ✅ Fuentes Geist + Geist Mono cargando
- ✅ Hojas CSS globales con clases `mt-*` y `crm-*`
- ✅ Colores y tipografía aplicados en componentes existentes
- ✅ Estructura de archivos del proyecto intacta

**Eso NO se toca. Funciona. Está bien.**

Lo que falta y vamos a hacer ahora:
- 🔲 Reorganizar el **layout/estructura visual** de cada pantalla para que coincida con el HTML de referencia (que volveré a pasarte adjunto)
- 🔲 Reemplazar los **iconos del sidebar** por los nuevos Lucide-style stroke 1.5
- 🔲 Añadir **paneles, columnas y cards** que faltan (panel de detalle a la derecha del Chat, columna lateral del Calendar con próxima cita en card ink, card ink "Próxima acción" del Dashboard, etc.)
- 🔲 Reescribir **kicker + título del topbar** por pantalla
- 🔲 Asegurar que las **interacciones** funcionan (click en lead → modal, click en cita → panel detalle, click en campana → drawer notifs)

---

## 🛑 REGLA DE ORO — Cero rotura funcional

Vas a tocar **únicamente JSX visual**. Bajo ningún concepto:

- ❌ Cambias hooks (`useState`, `useEffect`, `useQuery`, `useSupabase`, custom hooks…)
- ❌ Cambias llamadas a Supabase, API endpoints, mutaciones, queries
- ❌ Cambias validaciones de formularios (Zod, yup, react-hook-form…)
- ❌ Cambias tipos TypeScript ni interfaces
- ❌ Cambias props que se pasan entre componentes
- ❌ Cambias nombres de archivos, carpetas, rutas, exports
- ❌ Cambias `id`, `data-testid`, `name` de inputs (los usa la lógica)
- ❌ Borras estado, refs ni efectos aunque "parezca que no se usan"
- ❌ Refactorizas "de paso" cosas que veas feas
- ❌ Cambias el shape de los datos que vienen de la BD

**Si dudas entre tocar algo y no tocarlo → NO LO TOCAS. Pregúntame.**

---

## 🔐 Protocolo de seguridad por pantalla

Para CADA pantalla que rediseñes, sigues estos 6 pasos en orden, sin saltarte ninguno:

### Paso 1 — Lectura forense

Lee el archivo de la pantalla COMPLETO antes de cambiar nada. Identifica y anota mentalmente:
- Qué hooks usa (`useState`, `useQuery`, etc.)
- Qué datos vienen de queries (estructura del resultado)
- Qué props recibe el componente
- Qué handlers están definidos (`onClick`, `onSubmit`, `onChange`…)
- Qué estado se actualiza y dónde
- Si hay lógica condicional (loading, error, empty states)

### Paso 2 — Plan de cambio

Antes de escribir código, en tu mensaje de respuesta indica:
- "Voy a reescribir el JSX del componente `<X>` para que tenga la estructura `[descripción del nuevo layout]`"
- "Mantengo intactos: `[lista de hooks, queries, handlers, estado]`"
- "Los datos `[a, b, c]` que ahora se renderizan en `[ubicación antigua]` los voy a renderizar en `[ubicación nueva]`"
- "Si algún dato del nuevo diseño no existe en mi BD, voy a: (a) usarlo como placeholder hardcodeado por ahora y avisarte / (b) omitirlo / (c) preguntarte"

### Paso 3 — Cambio quirúrgico

Solo modificas la parte JSX del `return (...)` (o equivalente). El resto del archivo —imports, hooks, funciones auxiliares, handlers, useEffect, declaraciones de tipos— queda **byte por byte igual**.

### Paso 4 — Verificación local

Ejecuta:
```bash
npm run build
npm run typecheck   # o tsc --noEmit, lo que use el proyecto
npm run lint
```

Si **cualquiera** de los tres falla con un error que no estaba antes → rollback inmediato del archivo y me avisas con el error exacto. No intentes "arreglarlo" tocando lógica.

### Paso 5 — Smoke test funcional

Levanta el dev server y en la pantalla rediseñada verifica MANUALMENTE:
- Carga sin errores en consola del navegador
- Los datos reales aparecen (no placeholders rotos)
- Los handlers que ya funcionaban siguen funcionando (clicks, submits, navegación)
- La query a Supabase devuelve lo mismo que antes (network tab)

Si algo se rompió funcionalmente → rollback y me avisas.

### Paso 6 — Commit con scope claro

Mensaje: `style(crm): redesign <pantalla> layout (visual JSX only, no logic changes)`

En el body del commit, añade:
```
- Reescrito JSX para coincidir con HTML de referencia
- Hooks, queries, validaciones y handlers intactos
- Build/typecheck/lint OK
- Smoke test manual: [✓ login, ✓ datos cargan, ✓ click en X funciona, …]
```

---

## 🎯 Estado deseado por pantalla

> **Importante**: si tu BD actual no tiene un campo que el nuevo diseño espera (ej. `score`, `aiSummary`, `nextAppt`), **NO añades columnas a la BD**. Tienes 3 opciones:
> 1. Si el campo es derivable (ej. `score` se podría calcular), lo derivas en el render
> 2. Si no hay forma, lo dejas con un valor por defecto razonable (ej. score = 50, aiSummary = "Sin resumen disponible aún")
> 3. Lo omites visualmente del render
>
> En cualquier caso, **anótalo en el commit body** para que yo sepa qué falta cablear más adelante.

### 🔧 Componentes compartidos que necesitas crear (si no existen)

Antes de empezar las pantallas, asegúrate de tener estos helpers en algún archivo común (`components/crm-ui/icons.tsx` o donde toque):

```jsx
export const Icon = ({ d, size = 18, className = 'lu' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const I = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
  pipeline: <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="6" rx="1"/></>,
  bot: <><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="3.5" r="1.2"/><circle cx="9" cy="13" r="0.8" fill="currentColor"/><circle cx="15" cy="13" r="0.8" fill="currentColor"/><path d="M9 17h6"/></>,
  grad: <><path d="M22 10 12 4 2 10l10 6 10-6z"/><path d="M6 12v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4"/></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  modules: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></>,
  plug: <><path d="M9 2v6M15 2v6M5 10h14v3a7 7 0 0 1-14 0z"/><path d="M12 20v2"/></>,
  chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
  arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <><path d="M20 6L9 17l-5-5"/></>,
  filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  whatsapp: <><path d="M3 21l2.5-5A9 9 0 1 1 9 20.5z"/></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></>,
};
```

---

### 1️⃣ SIDEBAR — reemplazar iconos antiguos

**Lo que cambia visualmente**:
- Iconos antiguos → nuevos del objeto `I` (dashboard, pipeline, chat, cal, bot, grad, modules, plug, chart)
- Items agrupados en 3 secciones con label `crm-sidebar__section-label`: **Operaciones**, **Inteligencia**, **Configuración**
- Cada `crm-nav-item` con: `<Icon d={I.x} className="crm-nav-item__icon" />` + label + counter opcional
- Brand mark "M&T" arriba con el ampersand rotado (`<span class="amp">&</span>`)
- Profile abajo: avatar con iniciales + nombre + role

**Mapeo**:

| Sección | Item | Icono |
|---|---|---|
| Operaciones | Dashboard | `I.dashboard` |
| | Pipeline | `I.pipeline` (counter: leads activos) |
| | Chat | `I.chat` (counter: sin leer) |
| | Calendario | `I.cal` (counter: citas próximas) |
| Inteligencia | Setter IA | `I.bot` |
| | Entrenamiento | `I.grad` |
| Configuración | Módulos | `I.modules` |
| | Integraciones | `I.plug` |
| | Métricas | `I.chart` |

> Mantén las rutas/nombres que ya tienes. Si tu app no tiene exactamente las mismas 9 secciones, mantén las tuyas y elige el icono más cercano.

---

### 2️⃣ TOPBAR — kickers correctos por pantalla

**Lo que cambia**: el texto del topbar (kicker en mono uppercase tide + título grande). Cada pantalla tiene su par fijo:

| Ruta | Kicker | Título |
|---|---|---|
| dashboard | `Operaciones · [empresa del usuario]` | `Panel general` |
| pipeline | `M&T CRM · Gestión de leads` | `Pipeline de ventas` |
| chat | `Conversaciones unificadas` | `Chat` |
| cal | `Setter IA · Agenda automática` | `Calendario de citas` |
| agent | `Inteligencia · Configuración` | `Setter IA` |
| train | `Inteligencia · Base de conocimiento` | `Entrenamiento del agente` |
| modules | `Configuración · Capacidades` | `Módulos` |
| integ | `Configuración · Sistemas conectados` | `Integraciones` |
| metrics | `Configuración · Analítica` | `Métricas` |

Estructura JSX del topbar:
```jsx
<div className="crm-topbar">
  <div className="crm-topbar__title-group">
    <div className="crm-topbar__kicker">{kicker}</div>
    <div className="crm-topbar__title">{title}</div>
  </div>
  <div className="crm-topbar__actions">
    {actions}  {/* botones específicos de cada pantalla */}
    <button className="crm-iconbtn" onClick={onBell}>
      <Icon d={I.bell} />
      <span className="crm-iconbtn__dot" />
    </button>
  </div>
</div>
```

**Acciones del topbar por pantalla** (botones a la derecha del título):
- **Dashboard**: segmented `7 días / Mes / Trim. / Año` + botón ghost "Filtrar"
- **Pipeline**: segmented `Kanban / Lista` + search input + botón accent "Nuevo lead"
- **Chat**: segmented `Todos / Sin leer / Setter IA / Humano`
- **Calendar**: segmented `Día / Semana / Mes` + botón ghost "Hoy" + botón accent "Nueva cita"
- **Agent**: segmented `Activo / Pausado` + botón ghost "Probar conversación" + botón primary "Guardar cambios"
- **Train**: botón ghost "Subir documentos" + botón accent "Nueva instrucción"
- **Modules**: botón accent "Añadir módulo"
- **Integ**: botón ghost "Ver documentación API"
- **Metrics**: segmented `7 días / 30 días / Trim.` + botón ghost "Exportar CSV"

---

### 3️⃣ DASHBOARD — añadir layout 3 bloques

**Estructura**:
1. Grid 4 columnas con `crm-stat` cards (Leads cualificados / Citas agendadas / Pipeline abierto / Win rate)
2. Grid 2 columnas (1.6fr / 1fr): card grande con chart de área + card con embudo de conversión
3. Grid 3 columnas: card con fuentes de lead + card con actividad Setter IA + **card INK con `mt-arc` decorativo** "Próxima acción"

**Detalle de la card ink** (firma visual del brand, no la omitas):
```jsx
<div className="crm-card" style={{ position: 'relative', overflow: 'hidden',
     background: 'var(--ink)', color: '#fff', borderColor: 'transparent' }}>
  <div className="mt-arc" style={{ borderColor: 'rgba(20,200,164,0.3)' }} />
  <div style={{ position: 'relative' }}>
    <div className="crm-card__subtitle" style={{ color: 'var(--tide)' }}>Próxima acción</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500,
                  letterSpacing: '-0.02em', marginTop: 8, marginBottom: 6, lineHeight: 1.2 }}>
      {hotLeadsCount} leads calientes esperan tu llamada.
    </div>
    <p style={{ fontSize: 13, color: 'var(--mist)', lineHeight: 1.5, marginBottom: 20 }}>
      El Setter los cualificó esta mañana. Score <strong style={{ color: 'var(--tide)' }}>&gt;80</strong>.
    </p>
    <button className="crm-btn crm-btn--accent">
      Ver pipeline <Icon d={I.arrow} className="lu-sm crm-btn__arrow" />
    </button>
  </div>
</div>
```

---

### 4️⃣ PIPELINE — kanban con lead cards completas

**Estructura**: scroll horizontal con 6 columnas (288px cada una): Nuevo / Contactado IA / Cualificado / Cita agendada / Reunión / Cliente.

**Cada columna**: header con dot de color + label uppercase + contador "· N" + valor total €.

**Cada lead card** (`crm-lead-card`): nombre + meta + valor en tide-ink + AI pill + líneas de contacto con iconos + tags + score con barra. Click → abre `LeadDetailModal`.

**Dots de etapa**: Nuevo `#7A8599`, Contactado IA `#3E7BFA`, Cualificado `#14C8A4`, Cita agendada `#0A7A65`, Reunión `#E3A008`, Cliente `#16A06A`.

Si tu BD no tiene `score`, deriva uno básico (ej. % de campos completos del lead × peso de etapa) o pon 50 por defecto y anótalo.

---

### 5️⃣ CHAT — ⚠️ pasar a 3 columnas

**Cambio crítico**: el layout debe ser un grid `320px / 1fr / 320px`:

1. **Bandeja izquierda**: lista de conversaciones (`crm-chat-row` con avatar + nombre + tiempo + preview + AI pill si último mensaje fue del bot)
2. **Conversación centro**: header con avatar + nombre + badges (etapa, score, canal) + 2 botones (ghost "Pausar IA", primary "Llamar"). Cuerpo con burbujas (`crm-bubble--in`/`--out`/`--ai`). Composer abajo con input y botón primary.
3. **Detalle del lead derecha**: 4 bloques (`crm-detail__block`): Lead (nombre+empresa+badges) / Contacto (key-val) / Negocio (key-val) / Resumen IA (párrafo)

**Las 3 columnas siempre visibles** en desktop. En mobile podrías ocultar la del lead, pero solo si tu app ya tiene responsive hooks; si no, déjalo desktop-first.

---

### 6️⃣ CALENDAR — ⚠️ pasar a layout 2 columnas

**Cambio crítico**: grid `1fr / 280px`:

**Izquierda**: header con "Semana N · 2026" + rango fechas en display grande + 2 badges resumen ("12 citas" accent, "8 cerradas por IA" neutro). Debajo, calendario semanal:
- Grid CSS `64px repeat(5, 1fr)` (columna horas + 5 días)
- Headers con día + número (con clase `is-today` si aplica)
- Filas por hora 09:00 a 18:00
- Eventos como `crm-cal-event` (con `is-ink` para citas prioritarias)
- **Click en evento** → abre detalle (panel a la derecha o modal con info de la cita: cliente, hora, tipo, notas, botones Confirmar/Reagendar/Cancelar)

**Derecha** (3 cards apiladas):
1. **Card INK** "Próxima cita": hora grande en tide + cliente + descripción + botones accent "Confirmar" y ghost "Reagendar"
2. **Card** "Reglas activas Setter IA": key-val (Horario, Slots/día, Buffer viaje, Zona)
3. **Card** "Hoy · [día]": contador display gigante "3 / 6" con barra slash en tide

---

### 7️⃣ SETTER IA — grid 1.6fr / 1fr con cards apiladas

**Izquierda** (3 cards):
1. **Card INK** "Estado actual": dot pulsante tide + título "Setter IA activo" + descripción + 2 botones
2. **Card** "Configuración Tono": grid 3 tone cards (`crm-tone-card[data-active]`) + 3 fields key-val
3. **Card** "Reglas de handover": varias `crm-toggle-row` con `crm-switch.is-on`

**Derecha** (3 cards):
1. **Card** "Vista previa": 2 burbujas demo (in + ai) sobre fondo paper-2 + composer
2. **Card** "Objetivos del agente": lista con círculos tide check + título + desc
3. **Card** "Rendimiento 7 días": grid 2x2 de Metric (k label + v número display grande)

---

### 8️⃣ ENTRENAMIENTO — grid 1.6fr / 1fr

**Izquierda**: card "Documentos" (`crm-doc-row` con icono+nombre+meta+badge estado) + card "FAQ" (`<details class="crm-faq-item">` accordions).

**Derecha**: card "Instrucciones maestras" (textarea grande con prompt) + card "Ejemplos etiquetados" (`crm-example-row` con swatch de color por categoría).

---

### 9️⃣ MÓDULOS — grid 3 columnas

`crm-modules-grid` con 1 card por módulo. Cada card: icono cuadrado + switch + título + desc + footer con badge (Core/Beta/Add-on) y botón "Configurar".

---

### 🔟 INTEGRACIONES — agrupado por categoría

Lista vertical de grupos (Mensajería / Publicidad / Agenda y negocio). Cada grupo: label uppercase + grid 3 columnas con cards de integración (icono plug + badge Conectado/Desconectado + título + desc + cuenta + botón Gestionar/Conectar).

---

### 1️⃣1️⃣ MÉTRICAS — 3 bloques

1. Grid 4 stats (Ingresos / CAC / LTV / ROI)
2. Grid 2 cols: Cohorte mensual (barras stacked horizontales) + Motivos de pérdida (funnel rows)
3. Card ancha con tabla detallada por canal (`crm-table`)

---

### 1️⃣2️⃣ MODALES Y DRAWER

**LeadDetailModal** (al hacer click en lead card):
- `crm-modal--wide` (960px). Body grid 2fr/1fr: Timeline (`crm-timeline-row`) a la izquierda + 2 sub-cards en paper-2 (Contacto + Negocio) + 2 botones a la derecha.

**NewLeadModal** (al hacer click en "Nuevo lead" del topbar Pipeline):
- `crm-modal` (560px). Form con `crm-field` (Nombre, Empresa, Teléfono, Email, Canal select, Campaña select, Notas textarea) + toggle row "Asignar al Setter IA". Foot con Cancelar + Crear lead.

**NotificationsPanel** (al hacer click en campana del topbar):
- `crm-drawer` (420px desde la derecha). Lista de `crm-notif-row` con dots de color por tipo (`is-ai`, `is-hot`, `is-warn`, `is-calendar`).

> **Importante**: si estos modales/drawer NO existen aún en el código, créalos como componentes nuevos en su propio archivo. Si EXISTEN pero con otro layout, reescríbeles solo el JSX visual conservando la lógica de open/close y los handlers.

---

## 🚀 Plan de ejecución (un commit por pantalla)

```
Commit 1: style(crm): replace sidebar icons with new lucide-style set + 3 sections
Commit 2: style(crm): topbar kickers and per-screen actions
Commit 3: style(crm): dashboard layout with stats + chart + funnel + ink action card
Commit 4: style(crm): pipeline kanban with score bars + ai pills + stage dots
Commit 5: style(crm): chat 3-pane layout with lead detail panel
Commit 6: style(crm): calendar week grid + right column (next appt + rules + counter)
Commit 7: style(crm): agent (setter ia) screen layout
Commit 8: style(crm): train screen layout (docs + faq + master prompt)
Commit 9: style(crm): modules grid layout with switches
Commit 10: style(crm): integrations grouped grid
Commit 11: style(crm): metrics dashboard with cohort + loss reasons + table
Commit 12: style(crm): modals (lead detail, new lead) and notifications drawer
```

**Después de cada commit**:
1. Ejecutas el protocolo de seguridad (build + typecheck + smoke test)
2. Me pegas el body del commit (con la lista de "Hooks intactos: …" y los smoke checks)
3. Si quieres, screenshot
4. **Esperas mi visto bueno** antes de seguir al siguiente commit

---

## 🚨 Qué hacer si algo se rompe

Si en cualquier momento del proceso:

- El build falla con un error nuevo
- TypeScript se queja de tipos que antes pasaban
- Un test que antes pasaba ahora falla
- El smoke test manual revela que algo dejó de funcionar (un click no responde, datos no cargan, una mutación falla, navegación rota…)

→ **Rollback inmediato** de ese commit (`git reset --hard HEAD~1` o `git revert`) y me dices:
- Qué commit ibas a hacer
- Qué error apareció (mensaje exacto)
- En qué archivo
- Tu hipótesis de por qué pasó

**No intentes "arreglarlo sobre la marcha"** modificando lógica/queries/hooks para que cuadre con el rediseño. La regla es: el rediseño se adapta al código que ya funciona, NO al revés.

---

## ❓ Si te encuentras con casos ambiguos

Pregúntame antes de decidir, en estos casos:

- Un campo del nuevo diseño no existe en mi BD (ej. `aiSummary`, `nextAppt`, `score`)
- Una pantalla nuestra tiene más componentes/funciones que la del HTML referencia
- Una pantalla nuestra tiene MENOS (ej. no tenemos timeline en LeadDetail)
- El componente que vas a tocar es usado por más de una ruta (riesgo de afectar otra cosa sin querer)
- Hay un test asociado al componente que podría fallar por cambio de estructura DOM
- Detectas un bug funcional preexistente al leer el código

En todos estos casos: **paras, me cuentas, esperas**.

---

## 🎬 Empieza

Comienza por el **Commit 1: Sidebar**. Antes de tocar nada, ejecuta el Paso 1 (Lectura forense) y muéstrame qué hooks/props/handlers tiene el componente actual del Sidebar. Solo cuando confirme procedes con el cambio JSX.
