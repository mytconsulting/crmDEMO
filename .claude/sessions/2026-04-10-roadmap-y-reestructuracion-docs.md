# Sesión: Roadmap + Reestructuración de documentación

**Fecha**: 2026-04-10
**Duración**: ~1h

## Qué se hizo

1. **Análisis profundo del código actual**: se verificó el estado real del schema de `leads`, RLS policies, pipeline Kanban, auth, módulos, webhooks, y configuración de despliegue.

2. **Roadmap completo de 7 fases**: se planificó el desarrollo futuro del CRM en 7 fases secuenciales, desde infraestructura de ramas hasta monetización con Stripe. Documento: `docs/ROADMAP-EMANTICRM.md` + PDF.

3. **Guía de ramas para el equipo**: documento no-técnico explicando cómo funciona el flujo develop → staging → main, Vercel preview URLs, y Supabase branching. Documento: `docs/GUIA-RAMAS-PARA-EQUIPO.md` + PDF.

4. **Reestructuración de documentación**: se migró de un CLAUDE.md monolítico (173 líneas) a un sistema en capas:
   - CLAUDE.md ligero (< 100 líneas): solo stack, comandos, reglas, mapa de docs
   - `.claude/docs/architecture.md`: servicios, tablas, workflows, clientes
   - `.claude/docs/integrations.md`: APIs, credenciales, endpoints
   - `.claude/docs/conventions.md`: naming, estilos, patrones
   - `.claude/docs/fixes.md`: bugs resueltos con contexto
   - `.claude/docs/decisions.md`: decisiones técnicas y porqué

## Qué quedó pendiente

- **Fase 0 (domingo 13 abril)**: crear ramas develop/staging, configurar Vercel previews, Supabase staging
- **Fase 1 (semana 14 abril)**: implementar UTM tracking
- Todas las demás fases del roadmap
- **Nota**: `.claude/` está en `.gitignore`, así que `architecture.md`, `fixes.md`, `decisions.md`, `conventions.md`, `integrations.md` solo viven localmente. Considerar si se quieren versionar en el futuro.

## Archivos clave creados/modificados

- `CLAUDE.md` — reescrito (de 173 a ~95 líneas)
- `.claude/docs/architecture.md` — nuevo
- `.claude/docs/integrations.md` — nuevo
- `.claude/docs/conventions.md` — nuevo
- `.claude/docs/fixes.md` — nuevo
- `.claude/docs/decisions.md` — nuevo
- `docs/ROADMAP-EMANTICRM.md` + `.pdf` — nuevo
- `docs/GUIA-RAMAS-PARA-EQUIPO.md` + `.pdf` — nuevo

## Contexto nuevo recibido del usuario

- Landing pages SIEMPRE controladas por M&T (hechas con Claude Code)
- Meta Ads API se integrará en super-admin para métricas de campañas
- WhatsApp se migrará a Meta Business API oficial (Embedded Signup, como Combo K / Buvio IA)
- Quieren exportar datos a Excel desde el CRM
- Planes de monetización: tiers con Stripe, módulos bloqueados por plan
