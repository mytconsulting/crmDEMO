# Sesion 2026-05-26 — Modulo Equipo (Team Members)

## Que se hizo

1. **Migracion Supabase**: tabla `team_members` con RLS, FK `leads.asignado_a` re-apuntada de `usuarios` a `team_members`, nuevo campo `citas.asignado_a`, indices
2. **Tipos TypeScript**: interfaz `TeamMember`, campo `asignado_a` + `team_member` en Lead y Cita
3. **Hook `useTeamMembers`**: CRUD completo (add, update, soft-delete), fetch solo activos
4. **Pagina /team**: CRUD visual de miembros (nombre, rol, email, telefono, color), con edicion inline
5. **Sidebar**: nuevo enlace "Equipo" con icono de personas en seccion CONFIGURACION
6. **LeadDetail**: selector de miembro asignado con preview (avatar + nombre + rol)
7. **LeadCard**: badge circular con inicial y color del miembro asignado
8. **CalendarioCitas**: selector de miembro en modal de cita, miembro visible en vista lista
9. **Pipeline**: columna "Asignado" en vista lista (reemplaza "Etiquetas"), filtro por miembro en controles, join con team_members en fetch
10. **Plan de implementacion**: guardado en `docs/superpowers/plans/2026-05-26-team-members.md`

## Build verificado en cada paso

8 builds incrementales, todos limpios. Sin errores de TypeScript ni warnings.

## Archivos clave tocados

- `supabase/migrations/20260526100000_add_team_members.sql`
- `types/team-member.ts` (nuevo)
- `lib/types.ts`
- `types/cita.ts`
- `lib/hooks/useTeamMembers.ts` (nuevo)
- `app/(dashboard)/team/page.tsx` (nuevo)
- `components/crm-icons.tsx`
- `components/Sidebar.tsx`
- `components/LeadDetail.tsx`
- `components/LeadCard.tsx`
- `src/CalendarioCitas.tsx`
- `app/(dashboard)/pipeline/page.tsx`

## Fixes posteriores (misma sesion)

11. **NewLeadModal responsive**: header fijo arriba, contenido con scroll, botones fijos abajo — funciona en mobile
12. **LeadCard Kanban**: avatar del miembro movido al header (al lado del nombre), quitado del footer
13. **Pipeline vista lista**: columnas "Asignado" y "Valor" corregidas (estaban intercambiadas)
14. **LeadDetail header**: selector de asignado movido al header como dropdown con nombre completo (no avatar), alineado a la derecha junto a badges
15. **NewLeadModal**: selector "Asignar a" para asignar miembro del equipo al crear lead manual
16. **LeadCard Kanban**: nombre completo del miembro asignado en la parte inferior derecha como badge con color (sustituye avatar con inicial)
17. **Calendario visual**: eventos mas grandes y legibles (altura filas 48→64, font-size 10→12), muestran hora + titulo + nombre del miembro asignado. Seccion "Proximos 7 dias" tambien muestra asignado
18. **Layout scroll**: eliminado scroll fantasma en pipeline/chat (crm-main height:100vh overflow:hidden, crm-content overflow-y:auto)
19. **Dashboard "Proxima accion"**: muestra lista clicable de leads con score >80 (nombre, estado, empresa, valor, score). Click lleva a /pipeline?lead=ID y abre el lead directamente
20. **Pagina /empresa**: nueva pagina con 3 tabs (Empresa, Equipo, Avatar Cliente). Absorbe /team. Tab Empresa: nombre empresa + nombre comercial. Tab Avatar Cliente: CRUD perfil cliente ideal con campos estructurados (sector, tamano, cargo, problemas, motivaciones, objeciones, presupuesto, canales). Campo generado_por para que el agente IA pueda editar. Migracion avatar_cliente aplicada.
21. **Avatar B2B/B2C**: selector al crear avatar con campos adaptados. B2B: tamano empresa, cargo decisor. B2C: rango edad, genero, ubicacion, estilo vida, frustraciones. Campos compartidos: sector, presupuesto, canales, problemas, motivaciones, objeciones, notas.
22. **Agente IA + Avatar**: avatar inyectado en system prompt. Tag [AVATAR_UPDATE:campo=valor] para que el agente actualice patrones del cliente ideal en base a conversaciones. Implementado en webhooks WhatsApp e Instagram.
23. **Fix scroll pipeline/chat**: ajustados calc(100vh - X) en kanban columns y chat grid para descontar topbar + padding de crm-content. Eliminado scroll fantasma.

## Que quedo pendiente

- **Migracion Supabase**: ya aplicada via CLI (`supabase db push`)
- **Probar en navegador** — verificar CRUD de miembros, asignacion a leads, badge en kanban, selector en citas, filtro en pipeline
- **Etiquetas en lista pipeline** — se reemplazo por "Asignado"; valorar si mostrar ambos en el futuro
