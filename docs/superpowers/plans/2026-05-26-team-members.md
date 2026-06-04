# Team Members (Equipo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Team Members" module so tenants can create team member labels (name, color, role, phone, email, avatar) and assign them to leads and calendar appointments.

**Architecture:** New `team_members` table with RLS per tenant. A `useTeamMembers()` hook provides CRUD. The module UI lives in `ModulosConfig.jsx` as a new `ModuleCard`. Assignment selectors are added to `LeadDetail`, `CitaModal`, and a badge appears in `LeadCard`. The `asignado_a` FK on `leads` is re-pointed from `usuarios` to `team_members`, and a new `asignado_a` column is added to `citas`.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js App Router, React hooks, TypeScript

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260526100000_add_team_members.sql` | DB table, FK changes, RLS policies |
| Create | `types/team-member.ts` | `TeamMember` TypeScript interface |
| Create | `lib/hooks/useTeamMembers.ts` | CRUD hook for team members |
| Modify | `lib/types.ts` | Add `asignado_a` + `team_member` to Lead interface |
| Modify | `types/cita.ts` | Add `asignado_a` to Cita interface |
| Modify | `src/ModulosConfig.jsx` | New "Equipo" ModuleCard section |
| Modify | `components/LeadDetail.tsx` | Team member selector in right column |
| Modify | `components/LeadCard.tsx` | Badge with initial + color |
| Modify | `src/CalendarioCitas.tsx` | Team member selector in CitaModal |
| Modify | `app/(dashboard)/pipeline/page.tsx` | Join team_members in fetch, pass to LeadCard, filter by member in list view |
| Modify | `components/crm-icons.tsx` | Add `team` icon |
| Modify | `components/Sidebar.tsx` | Add "Equipo" nav item under CONFIGURACION |
| Create | `app/(dashboard)/team/page.tsx` | Dedicated team page (thin wrapper to ModulosConfig equipo section, or standalone) |

---

### Task 1: Supabase Migration — team_members table + FK changes

**Files:**
- Create: `supabase/migrations/20260526100000_add_team_members.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ===========================================
-- Team Members: lightweight team labels per tenant
-- ===========================================

-- 1. Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT auth.uid(),
  nombre text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  rol_label text DEFAULT '',
  telefono text DEFAULT '',
  email text DEFAULT '',
  avatar_url text DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON team_members
  FOR ALL USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- 3. Drop old FK on leads.asignado_a (references usuarios)
DO $$
BEGIN
  -- Find and drop the FK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'leads'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%asignado%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE leads DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'leads'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%asignado%'
      LIMIT 1
    );
  END IF;
END $$;

-- 4. Add FK from leads.asignado_a -> team_members.id (nullable, SET NULL on delete)
ALTER TABLE leads
  ADD CONSTRAINT leads_asignado_a_fkey
  FOREIGN KEY (asignado_a) REFERENCES team_members(id)
  ON DELETE SET NULL;

-- 5. Add asignado_a to citas
ALTER TABLE citas ADD COLUMN IF NOT EXISTS asignado_a uuid REFERENCES team_members(id) ON DELETE SET NULL;

-- 6. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_asignado ON leads(asignado_a);
CREATE INDEX IF NOT EXISTS idx_citas_asignado ON citas(asignado_a);
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase migration up` (or apply via Supabase dashboard)
Expected: Migration applies without errors

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260526100000_add_team_members.sql
git commit -m "feat: add team_members table and FK changes for lead/cita assignment"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `types/team-member.ts`
- Modify: `lib/types.ts`
- Modify: `types/cita.ts`

- [ ] **Step 1: Create TeamMember type**

Create `types/team-member.ts`:

```typescript
export interface TeamMember {
  id: string
  tenant_id: string
  nombre: string
  color: string
  rol_label: string
  telefono: string
  email: string
  avatar_url: string
  activo: boolean
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Add asignado_a to Lead in lib/types.ts**

In `lib/types.ts`, add to the `Lead` interface after `ultimo_contacto`:

```typescript
  asignado_a?: string
  team_member?: TeamMember
```

Add the import at the top:

```typescript
import type { TeamMember } from '@/types/team-member'
```

- [ ] **Step 3: Add asignado_a to Lead in types/lead.ts**

In `types/lead.ts`, the `asignado_a` field already exists as `asignado_a?: string`. No change needed.

- [ ] **Step 4: Add asignado_a to Cita in types/cita.ts**

In `types/cita.ts`, add after `updated_at`:

```typescript
  asignado_a?: string
```

- [ ] **Step 5: Commit**

```bash
git add types/team-member.ts lib/types.ts types/cita.ts
git commit -m "feat: add TeamMember type and asignado_a to Lead/Cita interfaces"
```

---

### Task 3: useTeamMembers Hook

**Files:**
- Create: `lib/hooks/useTeamMembers.ts`

- [ ] **Step 1: Create the hook**

Create `lib/hooks/useTeamMembers.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamMember } from '@/types/team-member'

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })
    setMembers(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const addMember = async (member: Pick<TeamMember, 'nombre' | 'color' | 'rol_label' | 'telefono' | 'email'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('team_members')
      .insert({ tenant_id: user.id, ...member })
      .select()
      .single()
    if (error) { console.error('[TeamMembers] Error adding:', error.message); return null }
    await fetchMembers()
    return data
  }

  const updateMember = async (id: string, updates: Partial<Pick<TeamMember, 'nombre' | 'color' | 'rol_label' | 'telefono' | 'email' | 'avatar_url' | 'activo'>>) => {
    const { error } = await supabase
      .from('team_members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { console.error('[TeamMembers] Error updating:', error.message); return false }
    await fetchMembers()
    return true
  }

  const deleteMember = async (id: string) => {
    const { error } = await supabase
      .from('team_members')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { console.error('[TeamMembers] Error deactivating:', error.message); return false }
    await fetchMembers()
    return true
  }

  return { members, loading, addMember, updateMember, deleteMember, refetch: fetchMembers }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useTeamMembers.ts
git commit -m "feat: add useTeamMembers hook for CRUD operations"
```

---

### Task 4: Team Icon + Sidebar Nav

**Files:**
- Modify: `components/crm-icons.tsx`
- Modify: `components/Sidebar.tsx`
- Create: `app/(dashboard)/team/page.tsx`

- [ ] **Step 1: Add team icon to crm-icons.tsx**

In `components/crm-icons.tsx`, add to the `I` object after `calHealth`:

```typescript
  team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
```

- [ ] **Step 2: Add Equipo to Sidebar.tsx**

In `components/Sidebar.tsx`, in the `CONFIGURACION` section, add after the `modulos` item:

```typescript
      { id: "equipo", href: "/team", icon: I.team, label: "Equipo" },
```

The section should now look like:

```typescript
  {
    label: 'CONFIGURACION',
    items: [
      { id: "modulos", href: "/modules", icon: I.modules, label: "Modulos" },
      { id: "equipo", href: "/team", icon: I.team, label: "Equipo" },
      { id: "integrations", href: "/integrations", icon: I.plug, label: "Integraciones" },
    ],
  },
```

- [ ] **Step 3: Create team page**

Create `app/(dashboard)/team/page.tsx`:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
import type { TeamMember } from '@/types/team-member'

const MEMBER_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316']

export default function TeamPage() {
  const { members, loading, addMember, updateMember, deleteMember } = useTeamMembers()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', color: MEMBER_COLORS[0], rol_label: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setForm({ nombre: '', color: MEMBER_COLORS[0], rol_label: '', telefono: '', email: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (m: TeamMember) => {
    setForm({ nombre: m.nombre, color: m.color, rol_label: m.rol_label, telefono: m.telefono, email: m.email })
    setEditingId(m.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    if (editingId) {
      await updateMember(editingId, form)
    } else {
      await addMember(form)
    }
    setSaving(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Desactivar este miembro? Se eliminara de futuras asignaciones pero los leads/citas actuales mantendran la referencia.')) return
    await deleteMember(id)
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--slate-2)' }}>Cargando equipo...</div>
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>👥</span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>Equipo</h2>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--slate)', lineHeight: 1.6 }}>
          Gestiona los miembros de tu equipo. Asignalos a leads y citas para saber quien se encarga de cada cosa.
        </p>
      </div>

      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {members.length === 0 && !showForm && (
          <div style={{
            padding: 40, textAlign: 'center', borderRadius: 16,
            border: '2px dashed var(--mist)', color: 'var(--slate-2)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sin miembros</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Anade a tu equipo para asignarles leads y citas</div>
          </div>
        )}

        {members.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
            background: '#fff', borderRadius: 14, border: '1px solid var(--border)',
            transition: 'box-shadow 0.15s',
          }}>
            {/* Avatar circle */}
            <div style={{
              width: 42, height: 42, borderRadius: '50%', background: m.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
            }}>
              {m.nombre.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{m.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                {m.rol_label && <span>{m.rol_label}</span>}
                {m.email && <span>{m.email}</span>}
                {m.telefono && <span>{m.telefono}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => startEdit(m)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--slate)',
              }}>Editar</button>
              <button onClick={() => handleDelete(m.id)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca',
                background: '#fef2f2', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#dc2626',
              }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm ? (
        <div style={{
          padding: 20, borderRadius: 16, border: '1px solid var(--border)',
          background: '#fff', display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {editingId ? 'Editar miembro' : 'Nuevo miembro'}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4, display: 'block' }}>Nombre *</label>
              <input
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Laura Garcia"
                autoFocus
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4, display: 'block' }}>Rol</label>
              <input
                value={form.rol_label}
                onChange={e => setForm(p => ({ ...p, rol_label: e.target.value }))}
                placeholder="Ej: Comercial, Closer, Admin"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4, display: 'block' }}>Email</label>
              <input
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="laura@empresa.com"
                type="email"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4, display: 'block' }}>Telefono</label>
              <input
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="+34 600 000 000"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 6, display: 'block' }}>Color</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {MEMBER_COLORS.map(c => (
                <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: form.color === c ? '3px solid var(--ink)' : '2px solid var(--border)',
                  cursor: 'pointer', padding: 0,
                }} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={resetForm} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--border)',
              background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--slate)',
            }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre.trim()} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: 'none',
              background: !form.nombre.trim() ? 'var(--mist)' : 'var(--tide)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: form.nombre.trim() ? 'pointer' : 'default',
            }}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Anadir'}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} style={{
          width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer',
          border: '2px dashed var(--mist)', background: 'transparent', color: 'var(--tide-ink)',
          fontSize: 14, fontWeight: 700, transition: 'all 0.2s',
        }}>+ Anadir miembro</button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: No errors, new route `/team` accessible

- [ ] **Step 5: Commit**

```bash
git add components/crm-icons.tsx components/Sidebar.tsx app/(dashboard)/team/page.tsx
git commit -m "feat: add team page with CRUD UI, sidebar nav, and team icon"
```

---

### Task 5: Team Member Assignment in LeadDetail

**Files:**
- Modify: `components/LeadDetail.tsx`

- [ ] **Step 1: Add team member selector to LeadDetail**

At the top of `components/LeadDetail.tsx`, add import:

```typescript
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
import type { TeamMember } from '@/types/team-member'
```

Inside the component, after the etiquetas state declarations (after line ~47), add:

```typescript
  const { members: teamMembers } = useTeamMembers()
  const [assignedMemberId, setAssignedMemberId] = useState<string | null>(lead.asignado_a || null)
```

In the `doSave` function, add `asignado_a` to the `updateData` object:

```typescript
  updateData.asignado_a = assignedMemberId || null
```

In the right column (after the NEGOCIO block, before FUENTE block), add the ASIGNADO A section:

```tsx
            {/* Asignado a */}
            <div className="crm-detail__block" style={{ padding: '16px 0' }}>
              <div className="crm-detail__block-label">ASIGNADO A</div>
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">MIEMBRO</span>
                <select
                  value={assignedMemberId || ''}
                  onChange={(e) => setAssignedMemberId(e.target.value || null)}
                  className="crm-field__input"
                  style={{ textAlign: 'right', border: 'none', padding: '4px 0', background: 'transparent', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">Sin asignar</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre}{m.rol_label ? ` (${m.rol_label})` : ''}</option>
                  ))}
                </select>
              </div>
              {assignedMemberId && (() => {
                const m = teamMembers.find(t => t.id === assignedMemberId)
                return m ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '6px 0' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: m.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0,
                    }}>{m.nombre.charAt(0).toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      {m.nombre}{m.rol_label ? ` · ${m.rol_label}` : ''}
                    </div>
                  </div>
                ) : null
              })()}
            </div>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/LeadDetail.tsx
git commit -m "feat: add team member selector to LeadDetail"
```

---

### Task 6: Team Member Badge in LeadCard

**Files:**
- Modify: `components/LeadCard.tsx`
- Modify: `app/(dashboard)/pipeline/page.tsx`
- Modify: `lib/types.ts`

- [ ] **Step 1: Update Lead type to include team_member relation**

The `lib/types.ts` Lead interface already has `team_member?: TeamMember` from Task 2. No changes needed.

- [ ] **Step 2: Update pipeline page to join team_members data**

In `app/(dashboard)/pipeline/page.tsx`, update the `fetchLeadsWithTags` function to also fetch team member data.

Replace the leads fetch line inside `fetchLeadsWithTags`:

```typescript
  const fetchLeadsWithTags = useCallback(async () => {
    const [leadsRes, tagsRes] = await Promise.all([
      supabase.from("leads").select("*, team_member:team_members!asignado_a(id, nombre, color, rol_label)").order("created_at", { ascending: false }),
      supabase.from("lead_etiquetas").select("lead_id, etiquetas(id, nombre, color)"),
    ])
```

Then in the map at the bottom, preserve the team_member:

```typescript
    return (leadsRes.data || []).map(l => ({
      ...l,
      etiquetas: tagsByLead[l.id] || [],
      team_member: l.team_member || undefined,
    }))
```

- [ ] **Step 3: Add badge to LeadCard**

In `components/LeadCard.tsx`, update the import:

```typescript
import type { Lead } from '@/lib/types'
import type { TeamMember } from '@/types/team-member'
```

In the card footer (before the tags section, inside `crm-lead-card__footer`), add the team member badge:

```tsx
      <div className="crm-lead-card__footer">
        <div className="crm-lead-card__date">
          {lead.created_at && (
            <>📥 {new Date(lead.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {lead.team_member && (
            <span title={`${lead.team_member.nombre}${lead.team_member.rol_label ? ' · ' + lead.team_member.rol_label : ''}`} style={{
              width: 22, height: 22, borderRadius: '50%', background: lead.team_member.color,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 10, flexShrink: 0,
            }}>{lead.team_member.nombre.charAt(0).toUpperCase()}</span>
          )}
          {lead.etiquetas && lead.etiquetas.length > 0 && (
            <div className="crm-lead-card__tags">
              {lead.etiquetas.slice(0, 3).map(tag => (
                <span key={tag.id} className="crm-tag" style={{ background: tag.color + '14', color: tag.color, borderColor: 'transparent' }}>
                  {tag.nombre}
                </span>
              ))}
              {lead.etiquetas.length > 3 && (
                <span className="crm-tag">+{lead.etiquetas.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
```

- [ ] **Step 4: Add team member column to list view in pipeline**

In `app/(dashboard)/pipeline/page.tsx`, update the list view header to include "Asignado":

```tsx
            <div className="pipeline-list-header">
              <div>Nombre</div>
              <div>Contacto</div>
              <div>Estado</div>
              <div>Asignado</div>
              <div>Valor</div>
              <div>Score</div>
            </div>
```

And in each row, replace the "Etiquetas" cell with "Asignado":

```tsx
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {lead.team_member ? (
                          <>
                            <span style={{
                              width: 20, height: 20, borderRadius: '50%', background: lead.team_member.color,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 9, flexShrink: 0,
                            }}>{lead.team_member.nombre.charAt(0).toUpperCase()}</span>
                            <span style={{ fontSize: 12, color: 'var(--ink)' }}>{lead.team_member.nombre}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--mist)' }}>—</span>
                        )}
                      </div>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add components/LeadCard.tsx app/(dashboard)/pipeline/page.tsx lib/types.ts
git commit -m "feat: show team member badge in LeadCard and pipeline list view"
```

---

### Task 7: Team Member Selector in CalendarioCitas

**Files:**
- Modify: `src/CalendarioCitas.tsx`

- [ ] **Step 1: Add team member selector to CitaModal**

At the top of `src/CalendarioCitas.tsx`, add import:

```typescript
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
```

Add `asignado_a` to `CitaFormData`:

```typescript
interface CitaFormData {
  lead_id: string
  fecha: string
  hora: string
  duracion_minutos: number
  servicio: string
  notas: string
  estado: EstadoCita
  attendee_email: string
  asignado_a: string
  _withMeet?: boolean
}
```

Add `teamMembers` prop to `CitaModalProps`:

```typescript
interface CitaModalProps {
  cita: Cita | null
  leads: Lead[]
  teamMembers: { id: string; nombre: string; color: string; rol_label: string }[]
  onSave: (form: CitaFormData) => void
  onClose: () => void
  onDelete?: (id: string) => Promise<void>
  saving: boolean
  googleMeetAvailable: boolean
  prefillFecha?: string
  prefillHora?: string
}
```

In `CitaModal` component, update the `form` initial state to include `asignado_a`:

```typescript
    asignado_a: cita?.asignado_a || "",
```

In the CitaModal form, after the "Lead" select and before "Fecha y Hora", add:

```tsx
        {/* Asignado a */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Asignado a</label>
          <select value={form.asignado_a} onChange={(e) => update("asignado_a", e.target.value)} style={inputStyle}>
            <option value="">-- Sin asignar --</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}{m.rol_label ? ` (${m.rol_label})` : ''}</option>
            ))}
          </select>
        </div>
```

In the main `CalendarioCitas` component, add the hook call:

```typescript
  const { members: teamMembers } = useTeamMembers()
```

In the `handleSave` function, add `asignado_a` to the payload:

```typescript
      asignado_a: form.asignado_a || null,
```

Pass `teamMembers` to `CitaModal`:

```tsx
        <CitaModal
          cita={editingCita}
          leads={leads || []}
          teamMembers={teamMembers}
          onSave={handleSave}
          ...
        />
```

In the list view, show the assigned member next to the cita title. After the service/duration line, add:

```tsx
                      {/* Show assigned member if available */}
```

For the list view items, after the `servicio` span, we can show the assigned member by fetching it from teamMembers:

```tsx
                      <div style={{ fontSize: 12, color: "var(--slate)" }}>
                        {formatHora(c.hora)} · {c.duracion_minutos} min
                        {c.servicio && <span> · {c.servicio}</span>}
                        {c.asignado_a && (() => {
                          const m = teamMembers.find(t => t.id === c.asignado_a)
                          return m ? <span> · {m.nombre}</span> : null
                        })()}
                      </div>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/CalendarioCitas.tsx
git commit -m "feat: add team member selector to cita modal and list view"
```

---

### Task 8: Pipeline Filter by Team Member

**Files:**
- Modify: `app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Add team member filter to pipeline controls**

In `app/(dashboard)/pipeline/page.tsx`, add the hook import:

```typescript
import { useTeamMembers } from '@/lib/hooks/useTeamMembers'
```

Inside `PipelinePage`, add:

```typescript
  const { members: teamMembers } = useTeamMembers()
  const [filterMember, setFilterMember] = useState<string>("")
```

Update the `filteredLeads` memo to also filter by team member:

```typescript
  const filteredLeads = useMemo(() => {
    let result = leads
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (l) =>
          (l.nombre || "").toLowerCase().includes(term) ||
          (l.email || "").toLowerCase().includes(term) ||
          (l.telefono || "").toLowerCase().includes(term)
      )
    }
    if (filterMember) {
      result = result.filter(l => l.asignado_a === filterMember)
    }
    return result
  }, [leads, searchTerm, filterMember])
```

In the `controlsContent`, after the search input and before the "+ Lead" button, add the member filter:

```tsx
      {teamMembers.length > 0 && (
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          className="crm-field__input"
          style={{ padding: '6px 10px', fontSize: 12, width: 'auto', minWidth: 100 }}
        >
          <option value="">Todos</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.nombre}</option>
          ))}
        </select>
      )}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Test the full flow**

Run: `npm run dev`

Test:
1. Navigate to `/team` — create 2-3 team members with different names and colors
2. Navigate to `/pipeline` — open a lead, assign a team member, save
3. Verify the badge appears on the LeadCard in Kanban view
4. Verify the list view shows the assigned member
5. Use the filter dropdown to filter by team member
6. Navigate to `/calendar` — create a cita, assign a team member
7. Verify the member shows in the cita list view

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/pipeline/page.tsx
git commit -m "feat: add team member filter to pipeline controls"
```

---

## Summary of all changes

| # | What | Files |
|---|------|-------|
| 1 | DB migration | `supabase/migrations/20260526100000_add_team_members.sql` |
| 2 | TypeScript types | `types/team-member.ts`, `lib/types.ts`, `types/cita.ts` |
| 3 | CRUD hook | `lib/hooks/useTeamMembers.ts` |
| 4 | UI: Team page + nav | `app/(dashboard)/team/page.tsx`, `components/Sidebar.tsx`, `components/crm-icons.tsx` |
| 5 | UI: LeadDetail selector | `components/LeadDetail.tsx` |
| 6 | UI: LeadCard badge + pipeline list | `components/LeadCard.tsx`, `app/(dashboard)/pipeline/page.tsx` |
| 7 | UI: Cita modal selector | `src/CalendarioCitas.tsx` |
| 8 | Pipeline filter | `app/(dashboard)/pipeline/page.tsx` |
