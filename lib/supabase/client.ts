// DEMO: el cliente "Supabase" del navegador está reemplazado por un mock que
// guarda todo en localStorage. Ver lib/demo/client.ts y lib/demo/store.ts.
// Así todas las páginas que hacían `createClient()` siguen funcionando sin red.
export { createClient } from '@/lib/demo/client'
