# Sesión 2026-04-14 — Vista Pipeline Admin + Filtros de Fecha

## Qué se hizo

### 1. Vista Pipeline en Campañas
- Nueva tab "Pipeline" en la página de campañas que muestra todos los leads de cada cliente
- Campos visibles: nombre, estado (con badges color), canal, origen UTM, valor, score, etiquetas, chatbot ON/OFF, fecha, resumen
- **Sin datos sensibles**: no se traen ni email ni teléfono de la BD
- Ordenable por columnas: estado, valor, score, fecha
- Badges resumen de estados en cabecera (cuántos en cada etapa)

### 2. Filtro de Fechas
- Selector de periodo: Hoy, Esta semana, Este mes, Este trimestre, Este año, Personalizado
- Afecta solo a métricas (KPIs), NO al pipeline (que muestra todos los leads activos)
- Date pickers para rango personalizado

### 3. Sistema de Tabs
- Métricas | Pipeline | Campañas como pestañas separadas
- Contadores en cada tab

### 4. Fix crítico: API Route para bypass RLS
- La RLS de producción en `leads` no tenía `OR is_admin()` (migración no aplicada)
- Creado `/api/admin/campaigns-data` que usa `service_role_key` para obtener TODOS los datos
- Verifica autenticación + role admin antes de devolver datos
- Itzalki tenía 35 leads que no se veían por RLS

## Bugs encontrados y resueltos
- `nome` no es columna real en BD → eliminada del select (causaba 400)
- `filteredLeads` renombrado a `pipelineLeads` → referencia rota en producción (Sentry MT-CRM-6/7/8)
- Pipeline filtraba por fecha de creación → leads antiguos activos no aparecían
- RLS producción no permitía ver leads de otros tenants → bypass con service_role

## Archivos clave
- `app/(dashboard)/campaigns/page.tsx` — página principal reescrita
- `app/api/admin/campaigns-data/route.ts` — API route nueva (service_role)

## Pendiente
- Aplicar migración `20260413140000_fix_rls_admin_delete.sql` a producción (Supabase Branching)
- Los commits de debug (c117503, a807091) tienen console.logs que se pueden limpiar
- Dashboard general también podría tener filtros de fecha similares
- Considerar renombrar sección "Campañas y Métricas" si Eneko lo decide
