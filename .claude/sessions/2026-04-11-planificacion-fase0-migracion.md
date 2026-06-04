# Sesión 2026-04-11 — Planificación Fase 0 + Decisiones estratégicas

## Qué se hizo

### Decisiones tomadas con Eneko
1. **Migrar a Next.js App Router** — decisión firme, se ejecuta mañana 12-13 abril
2. **Eliminar n8n completamente** — migrar los 8 workflows del CRM a API Routes
3. **Claude Sonnet 4.6** como modelo principal del setter IA (no GPT-4o)
4. **Multi-modelo**: Sonnet (setter), GPT-4o (fallback), Haiku (scoring)
5. **Supabase Branching** activado (plan Pro ya pagado)
6. **TypeScript** obligatorio para archivos nuevos

### Nuevas funcionalidades confirmadas
- `valor_negociacion` por lead → métricas de ventas/profit en Dashboard
- Pipeline configurable por tenant (columnas editables)

### Documentación actualizada
- `CLAUDE.md` — stack, estructura, reglas de desarrollo
- `.claude/docs/decisions.md` — 4 nuevas decisiones
- `.claude/docs/conventions.md` — Next.js structure, TypeScript, n8n legacy
- `.claude/docs/integrations.md` — modelos IA actualizados
- `docs/ROADMAP-EMANTICRM.md` — Roadmap v2 completo (sobrescrito)
- `docs/ROADMAP-EMANTICRM.pdf` — PDF regenerado
- `docs/GUIA-SESION-FASE0-12-13-ABRIL.md` — Guía paso a paso para mañana
- `docs/GUIA-SESION-FASE0-12-13-ABRIL.pdf` — PDF para imprimir
- Memoria: `project_roadmap_2026.md`, `project_crm_setter_ia.md`, `MEMORY.md`

### Análisis de n8n
- 22 workflows en total, 11 activos
- 8 del CRM (todos migrables a código)
- 3 activos de otros proyectos (AQTIVA, Charcutería, My workflow)
- "My workflow" activo sin identificar — preguntar a Eneko

## Qué queda pendiente
- **Mañana 12-13 abril**: Ejecutar Fase 0 (ramas + Next.js + Supabase Branching + Sentry + AI SDK)
- **Semana 14-18 abril**: Fase 0.5 (migrar workflows n8n a código)
- Verificar "My workflow" activo en n8n
- Coordinar con Itzalki para el cutover de workflows

## Archivos clave tocados
- `CLAUDE.md`
- `.claude/docs/decisions.md`
- `.claude/docs/conventions.md`
- `.claude/docs/integrations.md`
- `docs/ROADMAP-EMANTICRM.md`
- `docs/GUIA-SESION-FASE0-12-13-ABRIL.md`
