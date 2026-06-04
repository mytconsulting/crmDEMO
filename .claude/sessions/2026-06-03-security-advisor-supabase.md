# 2026-06-03 — Security Advisor Supabase + compute Nano→Micro

## Qué se hizo

Limpieza de avisos del **Security Advisor** de Supabase (3 errores rojos + 14 warnings amarillos).

### Errores (rojos) — RESUELTOS
- 3 vistas (`vista_leads_calientes`, `vista_leads_por_estado`, `vista_metricas_cliente`) eran SECURITY DEFINER implícitas → recreadas con `security_invoker = on` para que respeten el RLS del usuario que consulta.
- Migración: `supabase/migrations/20260603100000_security_invoker_views.sql`

### Warnings (amarillos) — RESUELTOS 11/15
- `function_search_path_mutable` (6 funciones): `SET search_path = public, pg_temp`.
- `*_security_definer_function_executable` para `handle_new_lead`/`handle_new_user` (funciones de trigger): `REVOKE EXECUTE` de PUBLIC/anon/authenticated. No afecta a los triggers.
- `public_bucket_allows_listing` (welcome-media): `DROP POLICY` del SELECT público de listado.
- Migración: `supabase/migrations/20260603110000_security_advisor_warnings.sql`

### Warnings dejados a propósito (4 + 1)
- `is_admin`/`is_super_admin` ejecutables por anon/authenticated → **el RLS los necesita** (políticas `to public` en `profiles`/`tenant_config`). Revocar rompería con "permission denied for function".
- `auth_leaked_password_protection` → toggle de Dashboard, **acción manual pendiente** (Auth → Password).

### Verificación (sin runtime)
- Grep confirmó: nada llama a las vistas, ni a `handle_new_*` por RPC, ni hace `.list()` en welcome-media. Cambios no rompen nada.
- Ambas migraciones aplicadas con `supabase db push` (OK). `db push --dry-run` → remote up to date.

## Pendiente para próxima sesión
1. **Subir compute Nano → Micro** en Dashboard (mismo precio en Pro, +RAM/CPU). Reinicio ~1-2 min → ventana de bajo tráfico. Coordinar con Eneko.
2. **Activar leaked password protection** en Auth → Password (HaveIBeenPwned).
3. **Decidir `leads.anon_insert`** (`WITH CHECK true`): confirmar si las landings insertan con anon key o vía API route (service_role). Si es service_role, la política anon es vestigial y se puede restringir.

## Archivos clave tocados
- `supabase/migrations/20260603100000_security_invoker_views.sql` (nuevo)
- `supabase/migrations/20260603110000_security_advisor_warnings.sql` (nuevo)
- `.claude/docs/fixes.md`, `decisions.md`, `integrations.md` (actualizados)
