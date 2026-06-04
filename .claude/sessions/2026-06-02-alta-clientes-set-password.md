# Sesion 2026-06-02 — Alta de clientes con email de "establecer contraseña"

## Que se hizo

Sistema para que un admin dé de alta clientes desde `/admin`: se crea la cuenta, se envía un email de "establece tu contraseña", el cliente la define y entra al CRM. Réplica del flujo ya probado en la app de onboarding, adaptado a este repo. **Sin migraciones / sin cambios de schema.**

1. **Endpoint alta/baja** `app/api/admin/clients/route.ts`:
   - `POST`: `admin.auth.admin.createUser({ email, email_confirm:true, user_metadata:{company_name} })` (el trigger `on_auth_user_created` crea profile `role='client'` + pipeline + módulos) + `resetPasswordForEmail(redirectTo)`. Maneja "email ya existe" reenviando el enlace.
   - `DELETE`: borra tablas tenant que bloquean la baja + `deleteUser` (arregla bug de huérfanos, ver fixes.md).
2. **Endpoint reenvío** `app/api/admin/clients/resend/route.ts`: `POST {email}` → repite `resetPasswordForEmail`.
3. **Ruta callback** `app/auth/callback/route.ts`: maneja PKCE (`?code=`) y `token_hash`+`type`, fija cookie de sesión, redirige a `next` (`/auth/set-password`).
4. **Página** `app/auth/set-password/page.tsx`: triple fallback (code / hash / sesión) → `updateUser({ password })` → `/`. Estado "enlace caducado".
5. **Helpers** `lib/supabase/server.ts`: `createServerSupabaseClient()` (SSR con escritura de cookies) y `requireAdmin()` (verifica `profiles.role==='admin'`). `lib/site-url.ts`: `getSiteUrl()` (env `NEXT_PUBLIC_SITE_URL` con fallback al origin).
6. **Middleware**: excepción aislada — rutas `/auth/*` pasan siempre (no rompe `/login` ni `/register`, y no expulsa la sesión de recovery).
7. **UI admin** `app/(dashboard)/admin/page.tsx`: botón "➕ Nuevo cliente" + modal, "✉️ Reenviar acceso" por fila, borrado vía endpoint nuevo.

## Configuración (fuera de código)

- **Vercel (Production)**: `NEXT_PUBLIC_SITE_URL = https://myt-crm-app.vercel.app`. En `.env.local`: `http://localhost:3000`.
- **Supabase → Auth → Redirect URLs**: `/auth/callback` y `/auth/set-password` para `localhost:3000`, `myt-crm-app.vercel.app` y `myt-crm-app-mytconsultings-projects.vercel.app`. Site URL NO se tocó.

## Fix post-deploy (flujo implícito)

Tras el primer deploy, el email llevaba a `/login#access_token=...` en vez de a set-password.
Causa: flujo implícito de Supabase → tokens en el hash, que el servidor (`/auth/callback`)
no puede leer. Fix: `redirectTo` ahora apunta directo a `/auth/set-password` (página cliente
que lee el hash con `setSession`). Ver fixes.md 2026-06-02. Commit `a16b05d` → main `48fd697`.

## Verificado

- `npx tsc --noEmit`: limpio.
- `next lint`: sin errores/warnings nuevos en los archivos tocados.
- Prueba funcional end-to-end: pendiente de confirmar por el usuario tras el deploy del fix.

## Notas / aprendizajes para futuras sesiones

- **Flujo de recovery de Supabase**: el destino del email debe ser una **página cliente**
  (lee el hash con `setSession`), NO un Route Handler de servidor (el hash `#...` no llega
  al servidor). El middleware debe dejar pasar `/auth/*` siempre (la sesión está en el hash,
  aún no es cookie, o el guard expulsa a /login antes de procesarla).
- **Borrado de clientes**: SIEMPRE llamar a `admin.auth.admin.deleteUser()` (service role),
  no solo borrar la fila `profiles`. Si no, queda usuario huérfano en `auth.users` y no se
  puede recrear con el mismo email. Aplica también a la app de onboarding si borra clientes.
- **Calendar Health "Atención"**: normal si el watch de Google caduca en <48h; el cron
  `refresh-google-watches` (03:00 diario) lo renueva solo. No es error.

## Archivos clave tocados

- `app/api/admin/clients/route.ts` (nuevo)
- `app/api/admin/clients/resend/route.ts` (nuevo)
- `app/auth/callback/route.ts` (nuevo)
- `app/auth/set-password/page.tsx` (nuevo)
- `lib/supabase/server.ts`, `lib/site-url.ts` (nuevo)
- `middleware.ts`
- `app/(dashboard)/admin/page.tsx`
- `.env.local`

## Pendiente

- Confirmar flujo completo en producción (`myt-crm-app.vercel.app`) tras merge a main.
