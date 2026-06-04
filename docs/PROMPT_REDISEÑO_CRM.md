# Rediseño visual de myt-crm-app — Brand Book v1.0 · Variante A

## 🎯 Objetivo

Aplicar el nuevo sistema visual de M&T Consulting (paleta "Bilbao Night" + "Galerna") a la aplicación `myt-crm-app` **modificando ÚNICAMENTE el aspecto visual**. La lógica, rutas, componentes funcionales, schema de datos y arquitectura deben quedar exactamente como están.

El diseño está definido por mi socio Eneko en el archivo HTML adjunto (`M_T_CRM_-_Nuevo_estilo_visual__standalone_.html`). Úsalo como referencia visual viva: ábrelo en navegador para ver hover states, transiciones y el comportamiento del sidebar/kanban/chat.

---

## 🚫 LISTA NEGRA — Lo que NO debes tocar

**Ningún cambio en**:
- Nombres de archivos, carpetas, ni rutas (`app/`, `components/`, `lib/`, etc.)
- Imports, exports, hooks, props ni nombres de variables
- Lógica de estado (useState, useReducer, context, stores)
- Llamadas a Supabase, API endpoints ni queries
- Validaciones de formularios (Zod, yup, lo que sea)
- Tipos TypeScript ni interfaces
- Lógica de routing (Next.js app router, layouts, middleware)
- Tests, configs de CI, scripts de package.json (excepto si hay que añadir una dependencia tipográfica)
- IDs funcionales (`data-testid`, `id` usados por JS, `name` de inputs)
- Estructura JSX salvo lo estrictamente necesario para añadir un wrapper visual

**Reglas de oro**:
- Si dudas entre "lo refactorizo de paso porque está feo" o "lo dejo", **lo dejas**.
- Si un componente parece innecesario o duplicado, **no lo borras**.
- Si ves un bug funcional, **lo anotas en un comentario `// TODO:` y sigues**, no lo arreglas en este PR.

---

## 📋 Plan de ejecución por fases (commits separados)

Vas a trabajar en este orden, **un commit por fase**. No saltes a la siguiente hasta que confirme la anterior:

1. **Fase 0 — Setup tipográfico y tokens**
   - Importar fuentes Geist + Geist Mono (vía `next/font/local` o `@font-face` desde `/public/fonts/`)
   - Crear `app/globals.css` (o el archivo de estilos globales que ya exista) con los tres bloques CSS del brand book (tokens, components mt-*, components crm-*)
   - Verificar que la fuente carga sin FOUT

2. **Fase 1 — Layout (Sidebar + Topbar + estructura general)**
   - Aplicar `crm-app`, `crm-sidebar`, `crm-main`, `crm-topbar`, `crm-content` al layout principal
   - Las 9 rutas deben verse en el sidebar agrupadas en 3 secciones (Operaciones / Inteligencia / Configuración)

3. **Fase 2 — Pantallas de listado (Pipeline / Chat / Calendar)**
   - Kanban con `crm-kanban`, `crm-column`, `crm-lead-card`
   - Chat con grid 320px / 1fr / 320px y burbujas `crm-bubble--in/out/ai`
   - Calendar con grid `crm-cal-grid`

4. **Fase 3 — Dashboard y Métricas**
   - Stat cards `crm-stat`, sparkbars, funnels

5. **Fase 4 — Setter IA / Entrenamiento / Módulos / Integraciones**
   - Cards `crm-module-card`, tone cards, doc rows, FAQ items

6. **Fase 5 — Modales, drawers, formularios**
   - `crm-modal`, `crm-drawer`, `crm-field`, `crm-toggle-row`, `crm-switch`

**Después de cada fase**:
- Muéstrame un diff resumido de los archivos tocados (no el código completo, solo qué cambió a alto nivel)
- Haz commit con mensaje claro: `style(crm): fase N — <descripción>`
- Espera mi visto bueno antes de seguir

---

## 🎨 Design tokens — Brand Book v1.0 · Variante A

### Paleta (HEX exactos, no aproximes)

**Primarios**:
- `--ink: #0B1220` ("Bilbao Night") — texto/fondo oscuro
- `--tide: #14C8A4` ("Galerna") — accent / CTA principal
- `--ink-2: #141C2E` ("Muelle") — superficie elevada sobre Ink
- `--tide-ink: #0A7A65` ("Galerna Deep") — links sobre papel
- `--ink-3: #232B3D` — body sobre ink

**Neutros**:
- `--slate: #4A5468` ("Peña") — texto secundario
- `--slate-2: #7A8599` ("Peña Mist") — metadata, kicker sobre papel
- `--mist: #C9D0DB` ("Galerna Mist") — texto sobre ink
- `--paper: #F4F5F7` — fondo secciones
- `--paper-2: #FAFAF8` ("Off-white") — fondo principal de la app
- `--tide-soft: #D4F5EC` ("Galerna Soft") — badges highlight
- `--white: #FFFFFF` — cards / inputs

**Semánticos** (solo UI, nunca marketing):
- `--ok: #16A06A`
- `--warn: #E3A008`
- `--err: #E5484D`
- `--info: #3E7BFA`

**Bordes**:
- `--border: #E4E6EB`
- `--border-strong: var(--mist)`

### Tipografía

**Familias**:
- Sans: **Geist** (300, 400, 500, 600, 700, 800 + 300 italic)
- Mono: **Geist Mono** (400, 500, 600)
- Licencia: SIL OFL (libre uso). Servir desde `/public/fonts/` (NO Google Fonts ni CDN externo)

**Escala** (font-size / line-height / letter-spacing / weight):
- Display XL: 72/68 / -0.035em / 500
- H1: 44/44 / -0.03em / 500
- H2: 26/32 / -0.02em / 500
- H3: 18/24 / -0.015em / 600
- H4: 16/22 / -0.01em / 600
- Body: 15/24 / 0 / 400
- Body-S (UI): 13.5/20 / 0 / 400
- Kicker: Geist Mono 500 · 11/14 · 0.14em · UPPERCASE
- Metadata: Geist Mono 400 · 10/14 · 0.1em · UPPERCASE
- Code inline: Geist Mono 400 · 12/18

**Regla del ampersand "&" del logo**: siempre Geist 300 italic, color `--tide`, rotado -14deg. Usar `<span class="amp">&amp;</span>`. Reservado a la marca, no usar en texto corriente.

### Spacing (base 4px)

`--sp-1: 4px`, `--sp-2: 8px`, `--sp-3: 12px`, `--sp-4: 16px`, `--sp-5: 24px`, `--sp-6: 32px`, `--sp-7: 48px`, `--sp-8: 64px`, `--sp-9: 96px`, `--sp-10: 128px`

### Radii (uno por rol, no mezclar)

- `--r-sm: 6px` — inputs
- `--r-md: 10px` — cards pequeñas
- `--r-lg: 14px` — superficies/cards principales
- `--r-xl: 20px` — modales
- `--r-2xl: 24px` — hero modules
- `--r-pill: 999px` — badges, pills

### Shadows

- `--sh-1: 0 0 0 1px rgba(11,18,32,0.06)` — hairline
- `--sh-2: 0 1px 2px rgba(11,18,32,0.04), 0 4px 12px rgba(11,18,32,0.06)` — card hover
- `--sh-3: 0 2px 6px rgba(11,18,32,0.08), 0 16px 40px rgba(11,18,32,0.12)` — modal
- `--sh-focus: 0 0 0 3px rgba(20,200,164,0.20)` — focus ring

### Motion

- Easings: `--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1)`, `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)`
- Duraciones: `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 360ms`

---

## 🧩 Mapeo de componentes — clases que vas a usar

> **Importante**: las hojas CSS del HTML de Eneko ya traen TODAS las clases listas. Tu trabajo es **copiar el CSS tal cual** a `globals.css` (o equivalente) y aplicar las clases en los componentes existentes. **No reinventes Tailwind ni CSS-in-JS para esto**, salvo que el proyecto ya use Tailwind — en ese caso, mete las CSS vars en `tailwind.config.{js,ts}` como theme extend y deja las clases componentes (`crm-*`, `mt-*`) como CSS plano global.

### Layout principal

| Elemento | Clase |
|---|---|
| Wrapper app | `crm-app` (flex, min-h-screen, fondo paper-2) |
| Sidebar | `crm-sidebar` (248px, fondo ink, sticky) |
| Brand sidebar | `crm-sidebar__brand`, `crm-sidebar__brand-mark`, `crm-sidebar__brand-name` |
| Section label sidebar | `crm-sidebar__section-label` ("OPERACIONES", "INTELIGENCIA", "CONFIGURACIÓN") |
| Nav item | `crm-nav-item`, `is-active` cuando activa, hijos: `crm-nav-item__icon`, `crm-nav-item__count` |
| Profile sidebar | `crm-sidebar__profile`, `crm-sidebar__avatar`, `crm-sidebar__profile-info`, `crm-sidebar__profile-name`, `crm-sidebar__profile-role` |
| Main | `crm-main` (flex column, flex 1) |
| Topbar | `crm-topbar`, hijos: `crm-topbar__title-group`, `crm-topbar__kicker`, `crm-topbar__title`, `crm-topbar__actions` |
| Iconbtn (campana, etc.) | `crm-iconbtn`, badge `crm-iconbtn__dot` |
| Content | `crm-content` (padding 32px, fondo paper-2) |

### Botones

| Variante | Clase |
|---|---|
| Primary (Ink) | `crm-btn crm-btn--primary` |
| Accent (Galerna) | `crm-btn crm-btn--accent` |
| Ghost outline | `crm-btn crm-btn--ghost` |
| Small | añadir `crm-btn--sm` |
| Flecha sufijo | `<span class="crm-btn__arrow">→</span>` (anima al hover) |

### Inputs

- Search/input genérico: `crm-input` dentro de `.crm-input-wrap` con `<svg>` icono a la izquierda
- Form field: estructura `<div class="crm-field"><label class="crm-field__label">...</label><input class="crm-field__input"></div>`
- Textarea grande (prompts agente): `crm-textarea`
- Switch toggle: `crm-toggle-row` con `<div class="crm-switch"><span></span></div>`, modificador `is-on`

### Cards

- Genérica: `crm-card`, header `crm-card__header`, título `crm-card__title`, subtítulo (mono uppercase) `crm-card__subtitle`
- Stat KPI: `crm-stat`, hijos: `crm-stat__kicker`, `crm-stat__value` (con `<span class="unit">€</span>`), `crm-stat__delta` (con `is-down` para negativo, `crm-stat__delta-period` para "vs mes ant.")

### Badges & pills

- `crm-badge` con dot integrado (currentColor). Modificadores: `--accent`, `--ink`, `--ok`, `--warn`, `--err`, `--info`. `--nodot` quita el punto.
- AI pill: `crm-ai-pill` (con halo) y `is-paused` para estado off
- Score con barra: `crm-score`, hijos `crm-score__bar` y `crm-score__fill` (con `is-low` o `is-mid`)
- Tag pequeño en lead card: `crm-tag`

### Pipeline (Kanban)

- Contenedor: `crm-kanban` (scroll horizontal)
- Columna: `crm-column`, header `crm-column__header` con `crm-column__title` (`crm-column__dot` + `crm-column__label`), `crm-column__count`, `crm-column__value`
- Lista: `crm-column__list`
- Lead card: `crm-lead-card`, hijos:
  - `crm-lead-card__head` (con `crm-lead-card__name` y `crm-score`)
  - `crm-lead-card__meta` (mono uppercase)
  - `crm-lead-card__value` (cantidad € en tide-ink)
  - `crm-lead-card__contact` con líneas `crm-lead-card__contact-line` (icono + texto)
  - `crm-lead-card__footer` con `crm-lead-card__date` y `crm-lead-card__tags`

### Chat

- Wrapper grid 320 / 1fr / 320: `crm-chat`
- Cada panel: `crm-chat__pane`, header `crm-chat__pane-header`, lista `crm-chat__list`
- Fila de chat: `crm-chat-row` (con `is-active`), avatar `crm-chat-row__avatar`, body `crm-chat-row__body`, line con `crm-chat-row__name` + `crm-chat-row__time`, preview `crm-chat-row__preview`
- Conversación: `crm-chat__conv`, header `crm-chat__conv-header`, body `crm-chat__conv-body`, separador día `crm-chat__day-sep`
- Burbujas: `crm-bubble` con modificadores `--in` (cliente, blanco), `--out` (yo, ink), `--ai` (Setter IA, tide-soft con label "SETTER IA" automático)
- Composer: `crm-chat__composer` con `<input>` plano

### Calendar

- Grid: `crm-cal-grid` (64px + 5 columnas iguales)
- Cabecera: `crm-cal-head` con `crm-cal-day-name` y `crm-cal-day-num` (modificador `is-today`)
- Hora lateral: `crm-cal-hour`
- Celda: `crm-cal-cell`
- Evento: `crm-cal-event` (variante `is-ink`)

### Lead detail (panel/modal)

- Bloques: `crm-detail__block`, label `crm-detail__block-label` (mono uppercase)
- Lead name: `crm-detail__lead-name` (h2-style), `crm-detail__lead-company`
- Field key/val: `crm-detail__field` con `crm-detail__field-key` (mono) y `crm-detail__field-val`
- Timeline: `crm-timeline-row` con `crm-timeline-row__time`, `crm-timeline-row__dot` (`data-ai="true"` para color tide), línea conectora automática

### Modal

- Backdrop: `crm-modal-backdrop` (con blur 4px y fade animado)
- Caja: `crm-modal` (modificador `--wide` para 960px)
- Head/body/foot: `crm-modal__head`, `crm-modal__body`, `crm-modal__foot`

### Drawer (notificaciones)

- Backdrop: `crm-drawer-backdrop` (slide-in desde la derecha)
- Caja: `crm-drawer` (420px)
- Head/body/foot: `crm-drawer__head`, `crm-drawer__body`, `crm-drawer__foot`
- Filas: `crm-notif-row` con dot `crm-notif-row__dot` (variantes: `is-ai`, `is-hot`, `is-warn`, `is-calendar`)

### Módulos / Setter IA / Train

- Grid 3 columnas: `crm-modules-grid`, card `crm-module-card` (con `is-on` cuando activado), head/icon/title/desc/footer
- Tone cards (configurar tono del agente): `crm-tone-card` con `data-active="true"`
- Doc row: `crm-doc-row` con `crm-doc-row__icon`, `crm-doc-row__body`, `crm-doc-row__name`, `crm-doc-row__meta`
- FAQ accordion: `<details class="crm-faq-item"><summary>...</summary><div class="crm-faq-item__a">...</div></details>` (ya viene con `+` / `–` automático)
- Example row: `crm-example-row` con `crm-example-row__swatch` (`is-positive`, `is-neutral`, `is-warn`, `is-bad`)

### Tabla genérica

- `crm-table` con `<thead>` (mono uppercase, slate-2) y `<tbody>` (rows con hover paper-2)

### Métricas / Sparkline / Funnel

- Mini bars: `crm-spark` con `<span>` por barra (`is-on` tide, `is-mid` mist, default paper)
- Funnel row: `crm-funnel-row` (grid 120/1fr/60) con `crm-funnel-label`, `crm-funnel-bar` (con `--w: 75%` inline para anchura, modificador `is-accent` para tide), `crm-funnel-val`

### Segmented control

- `crm-segmented` con `<button class="is-active">...</button>`

### Utilidades

- `crm-divider`, `crm-grid-stats` (4 cols), `crm-grid-cols-2` (1.6fr/1fr), `crm-row` (flex align-center gap-2)
- Iconos Lucide: clase `lu` (18px), `lu-sm` (14px), `lu-lg` (22px), siempre stroke-width 1.5
- Decoración de marca: `mt-arc` y `mt-arc--inner` (círculos en esquina inferior-derecha de cards ink, opacos 30-50%)

---

## 🌗 Dark mode

El sistema soporta tema oscuro con `[data-theme="dark"]` o `.mt-dark` en cualquier wrapper. Si la app actualmente tiene un toggle de tema, déjalo conectado al atributo `data-theme` del `<html>`. Si NO tiene, **no lo añadas** — en este PR solo aplicamos light mode (que es el principal en el CRM, sidebar es ink siempre).

---

## ✅ Checklist de "ya está listo"

Antes de pedirme review de cada fase, verifica:

- [ ] Todas las clases del HTML referencia están aplicadas correctamente en sus elementos equivalentes del proyecto
- [ ] No has cambiado nombres de variables, props, hooks ni archivos
- [ ] No has tocado lógica de negocio, queries Supabase, ni validaciones
- [ ] Las fuentes Geist se cargan sin FOUT (visible al refrescar con caché vacía)
- [ ] El sidebar tiene las 3 secciones agrupadas (Operaciones / Inteligencia / Configuración) — si nuestras rutas actuales no son exactamente las mismas que el HTML de referencia, **mantén las nuestras** y solo aplica el tratamiento visual
- [ ] El acento Galerna (#14C8A4) aparece SOLO en CTAs, kickers, dot del item activo, AI pills, y elementos clave — nunca en párrafos enteros
- [ ] Hover states presentes en: nav-items, lead cards (translateY -2px + sombra), botones, filas de tabla, segmented buttons
- [ ] Build de Next.js pasa (`npm run build`) sin errores ni warnings nuevos
- [ ] Lighthouse mobile no baja del score actual

---

## 📌 Si tienes dudas

**No improvises**. Si te encuentras con un componente nuestro que no aparece en el HTML de Eneko (ejemplo: un selector de fechas custom que él no diseñó):

1. Aplica los tokens del brand book (color, font, radius, shadow) usando las variables CSS
2. Replica el estilo del componente más cercano del referencia (un input → como `crm-input`, un botón → como `crm-btn--ghost`)
3. **Pregúntame** antes de tomar decisiones grandes de diseño no cubiertas

Si una pantalla nuestra tiene más datos/funciones que la del HTML referencia, mantenlas todas — solo cambia el wrapper visual.

---

## 🚀 Empieza

Cuando estés listo, comienza por la **Fase 0** (setup de fuentes y tokens) y muéstrame el resultado antes de seguir.
