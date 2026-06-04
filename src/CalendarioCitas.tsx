import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Cita, EstadoCita } from "@/types/cita";
import type { Lead } from "@/types/lead";
import type { DemoClient } from "@/lib/demo/client";
import { useTeamMembers } from '@/lib/hooks/useTeamMembers';

interface CalendarioCitasProps {
  supabase: DemoClient
  session: { user: { id: string; email: string } }
  leads: Lead[]
}

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

interface PrefilledDate {
  fecha: string
  hora: string
}

const DIAS_SEMANA = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_COLORS: Record<EstadoCita, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "#fffbeb", color: "#d97706", label: "Pendiente" },
  confirmada: { bg: "#ecfdf5", color: "#059669", label: "Confirmada" },
  cancelada: { bg: "#fef2f2", color: "#dc2626", label: "Cancelada" },
  reagendada: { bg: "#f0f9ff", color: "#0284c7", label: "Reagendada" },
  completada: { bg: "var(--paper)", color: "var(--slate)", label: "Completada" },
  no_show: { bg: "#fef2f2", color: "#be123c", label: "No show" },
};

function formatHora(hora: string | undefined): string {
  if (!hora) return "";
  return hora.substring(0, 5);
}

function formatFecha(fecha: string | undefined): string {
  if (!fecha) return "";
  const d = new Date(fecha + "T00:00:00");
  return `${d.getDate()} ${MESES[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// ============================================================
// MODAL: Nueva Cita / Editar Cita
// ============================================================
function CitaModal({ cita, leads, teamMembers, onSave, onClose, onDelete, saving, googleMeetAvailable, prefillFecha, prefillHora }: CitaModalProps) {
  const [meetEnabled, setMeetEnabled] = useState(() => {
    if (cita?.gcal_meet_link) return false; // already has Meet, show badge instead
    return !cita && googleMeetAvailable; // new cita: preactivate if available
  });

  const [form, setForm] = useState<CitaFormData>({
    lead_id: cita?.lead_id || "",
    fecha: cita?.fecha || prefillFecha || new Date().toISOString().split("T")[0],
    hora: cita?.hora ? cita.hora.substring(0, 5) : (prefillHora || "10:00"),
    duracion_minutos: cita?.duracion_minutos || 30,
    servicio: cita?.servicio || "",
    notas: cita?.notas || "",
    estado: cita?.estado || "confirmada",
    attendee_email: "",
    asignado_a: cita?.asignado_a || "",
  });

  const update = (k: keyof CitaFormData, v: string | number) => {
    setForm((p) => ({ ...p, [k]: v } as CitaFormData));
    if (k === "lead_id" && v) {
      const lead = leads.find((l) => l.id === v);
      if (lead?.email) setForm((p) => ({ ...p, lead_id: v as string, attendee_email: lead.email }));
    }
  };

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal" style={{ padding: "24px", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 800 }}>
          {cita ? "Editar Cita" : "Nueva Cita"}
        </h3>

        {/* Lead */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Lead</label>
          <select value={form.lead_id} onChange={(e) => update("lead_id", e.target.value)} style={inputStyle}>
            <option value="">-- Sin lead asociado --</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre || l.email || l.telefono}</option>
            ))}
          </select>
        </div>

        {/* Asignado a */}
        {teamMembers.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Asignado a</label>
            <select value={form.asignado_a} onChange={(e) => update("asignado_a", e.target.value)} style={inputStyle}>
              <option value="">-- Sin asignar --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}{m.rol_label ? ` (${m.rol_label})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Fecha y Hora */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => update("fecha", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Hora</label>
            <input type="time" value={form.hora} onChange={(e) => update("hora", e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Duración */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Duracion (minutos)</label>
          <input type="number" value={form.duracion_minutos} onChange={(e) => update("duracion_minutos", parseInt(e.target.value) || 30)} min={15} max={240} style={inputStyle} />
        </div>

        {/* Servicio */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Servicio / Motivo</label>
          <input type="text" value={form.servicio} onChange={(e) => update("servicio", e.target.value)} placeholder="Ej: Consultoria Meta Ads, Limpieza dental..." style={inputStyle} />
        </div>

        {/* Notas */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Notas</label>
          <textarea value={form.notas} onChange={(e) => update("notas", e.target.value)} placeholder="Notas internas..." style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
        </div>

        {/* Google Meet */}
        {googleMeetAvailable && (
          <div style={{ marginBottom: 16 }}>
            {cita?.gcal_meet_link ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="crm-badge--nodot crm-badge crm-badge--accent" style={{ height: "auto", padding: "4px 10px" }}>Google Meet activo</span>
                <a href={cita.gcal_meet_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--tide-ink)", fontWeight: 600 }}>
                  Abrir enlace
                </a>
              </div>
            ) : (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={meetEnabled}
                    onChange={(e) => setMeetEnabled(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: "var(--tide-ink)" }}
                  />
                  <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>Crear con Google Meet</span>
                  <span style={{ fontSize: 11, color: "var(--slate-2)" }}>Enlace de videollamada</span>
                </label>
                {meetEnabled && (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Email del cliente <span style={{ color: "#ef4444" }}>*</span></label>
                    <input
                      type="email"
                      value={form.attendee_email}
                      onChange={(e) => setForm((p) => ({ ...p, attendee_email: e.target.value }))}
                      placeholder="cliente@ejemplo.com"
                      style={{ ...inputStyle, borderColor: meetEnabled && !form.attendee_email ? "#fecaca" : undefined }}
                      required
                    />
                    <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 4 }}>
                      Se le enviara la invitacion con el enlace de Meet
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Estado (solo en edición) */}
        {cita && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Estado</label>
            <select value={form.estado} onChange={(e) => update("estado", e.target.value)} style={inputStyle}>
              {Object.entries(ESTADO_COLORS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          {cita && onDelete && (
            <button onClick={() => {
              if (window.confirm("¿Estás seguro de que quieres eliminar esta cita? Esta acción no se puede deshacer.")) {
                onDelete(cita.id);
              }
            }} style={{
              padding: "10px 16px", borderRadius: 10, border: "1px solid #fecaca",
              background: "#fef2f2", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#dc2626",
            }}>Eliminar</button>
          )}
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "1px solid var(--border)",
            background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--slate)",
          }}>Cancelar</button>
          <button onClick={() => {
            if (meetEnabled && !cita?.gcal_meet_link && !form.attendee_email) {
              alert("Introduce el email del cliente para crear la reunion con Google Meet");
              return;
            }
            onSave({ ...form, _withMeet: meetEnabled });
          }} disabled={saving} style={{
            flex: 1, padding: "10px", borderRadius: 10, border: "none",
            background: saving ? "var(--slate-2)" : "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer",
          }}>{saving ? "Guardando..." : cita ? "Actualizar" : "Crear Cita"}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CalendarioCitas({ supabase, session, leads }: CalendarioCitasProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vista, setVista] = useState<"semana" | "lista">("semana");
  const [showModal, setShowModal] = useState(false);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<PrefilledDate | null>(null);
  const [saving, setSaving] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<"activas" | "todas">("activas");
  const [googleMeetAvailable, setGoogleMeetAvailable] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const kioskRef = useRef<HTMLDivElement>(null);

  const { members: teamMembers } = useTeamMembers()
  const tenantId = session.user.id;

  const enterKiosk = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setKioskMode(true);
    } catch {
      setKioskMode(true);
    }
  }, []);

  const exitKiosk = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setKioskMode(false);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setKioskMode(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const fetchCitas = useCallback(async () => {
    const { data } = await supabase
      .from("citas")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("fecha_hora", { ascending: true });
    if (data) setCitas(data);
    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => { fetchCitas(); }, [fetchCitas]);

  useEffect(() => {
    supabase.from("google_calendar_connections")
      .select("crear_meet, sync_enabled")
      .eq("tenant_id", tenantId)
      .single()
      .then(({ data }) => {
        if (data?.sync_enabled && data?.crear_meet) {
          setGoogleMeetAvailable(true);
        }
      });
  }, [supabase, tenantId]);

  // Get lead name by id
  const getLeadName = (leadId: string | undefined): string | null => {
    if (!leadId) return null;
    const lead = leads.find((l) => l.id === leadId);
    return lead ? (lead.nombre || lead.email || lead.telefono || "Lead") : "Lead eliminado";
  };

  const getCitaTitle = (c: Cita): string => {
    return c.servicio || c.notas || getLeadName(c.lead_id) || "Sin lead";
  };

  // Filter citas
  const filteredCitas = useMemo(() => {
    if (filtroEstado === "activas") {
      return citas.filter((c) => ["pendiente", "confirmada"].includes(c.estado));
    }
    return citas;
  }, [citas, filtroEstado]);

  // Weekly calendar data — 7 days starting from Monday of currentDate's week
  const weekData = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // Citas for a specific day — sorted by hora
  const citasForDay = (date: Date) => {
    return filteredCitas
      .filter((c) => {
        const citaDate = new Date(c.fecha + "T00:00:00");
        return isSameDay(citaDate, date);
      })
      .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
  };

  // Upcoming citas (next 7 days) — sorted by date+time, closest first
  const upcomingCitas = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return filteredCitas
      .filter((c) => {
        const d = new Date(c.fecha + "T" + (c.hora || "00:00:00"));
        return d >= now && d <= weekFromNow;
      })
      .sort((a, b) => {
        const da = new Date(a.fecha + "T" + (a.hora || "00:00:00"));
        const db = new Date(b.fecha + "T" + (b.hora || "00:00:00"));
        return da.getTime() - db.getTime();
      });
  }, [filteredCitas]);

  // Save cita
  const handleSave = async (form: CitaFormData) => {
    setSaving(true);
    const fechaHora = new Date(`${form.fecha}T${form.hora}:00`).toISOString();

    const payload = {
      tenant_id: tenantId,
      lead_id: form.lead_id || null,
      fecha: form.fecha,
      hora: form.hora + ":00",
      fecha_hora: fechaHora,
      duracion_minutos: form.duracion_minutos,
      servicio: form.servicio || null,
      notas: form.notas || null,
      estado: form.estado || "confirmada",
      origen: "manual",
      asignado_a: form.asignado_a || null,
    };

    if (editingCita) {
      await supabase.from("citas").update(payload).eq("id", editingCita.id);
      fetch("/api/integrations/google/sync-cita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citaId: editingCita.id, action: "update" }),
      }).catch(() => {});
    } else {
      const { data: nuevaCita } = await supabase.from("citas").insert({ ...payload, sync_source: "crm" }).select("id").single();
      if (nuevaCita) {
        fetch("/api/integrations/google/sync-cita", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ citaId: nuevaCita.id, action: "create", withMeet: form._withMeet, attendeeEmail: form.attendee_email || undefined }),
        }).catch(() => {});
      }
    }

    await fetchCitas();
    setSaving(false);
    setShowModal(false);
    setEditingCita(null);
  };

  // Delete cita
  const handleDelete = async (citaId: string) => {
    if (!window.confirm("Eliminar esta cita?")) return;
    await fetch("/api/integrations/google/sync-cita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ citaId, action: "delete" }),
    }).catch(() => {});
    await supabase.from("citas").delete().eq("id", citaId);
    await fetchCitas();
  };

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const nextWeek = () => {
    const d = new Date(currentDate);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    d.setDate(d.getDate() + 7);
    if (d <= maxDate) setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // Check if we can go forward (max 2 weeks ahead)
  const canGoNext = (() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    return d <= maxDate;
  })();

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80, color: "var(--slate-2)" }}>Cargando citas...</div>;
  }

  const today = new Date();

  const nextCita = upcomingCitas[0] || null;
  const todayCitas = filteredCitas.filter((c) => isSameDay(new Date(c.fecha + "T00:00:00"), today));
  const totalActiveCitas = filteredCitas.filter(c => c.estado === "confirmada" || c.estado === "pendiente").length;

  // ============================================================
  // KIOSK MODE
  // ============================================================
  if (kioskMode) {
    const kioskUpcoming = filteredCitas
      .filter((c) => {
        const d = new Date(c.fecha + "T" + (c.hora || "00:00:00"));
        return d >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
      })
      .sort((a, b) => {
        const da = new Date(a.fecha + "T" + (a.hora || "00:00:00"));
        const db = new Date(b.fecha + "T" + (b.hora || "00:00:00"));
        return da.getTime() - db.getTime();
      })
      .slice(0, 20);

    return (
      <div ref={kioskRef} className="kiosk-root">
        {/* Exit button */}
        <button onClick={exitKiosk} className="kiosk-exit" title="Salir de pantalla completa">✕</button>

        {/* Citas panel */}
        <div className="kiosk-citas-panel">
          <div className="kiosk-citas-header">
            <div className="kiosk-citas-title">Próximas citas</div>
            <div className="kiosk-citas-count">{todayCitas.length} hoy · {totalActiveCitas} activas</div>
          </div>
          <div className="kiosk-citas-list">
            {kioskUpcoming.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "var(--slate-2)", fontSize: 14 }}>Sin citas próximas</div>
            )}
            {kioskUpcoming.map((c) => {
              const estado = ESTADO_COLORS[c.estado] || ESTADO_COLORS.confirmada;
              const assignee = c.asignado_a ? teamMembers.find(m => m.id === c.asignado_a) : null;
              const isToday2 = isSameDay(new Date(c.fecha + "T00:00:00"), today);
              return (
                <div key={c.id} className="kiosk-cita-card" onClick={() => { setEditingCita(c); setPrefilledDate(null); setShowModal(true); }}>
                  <div className="kiosk-cita-bar" style={{ background: estado.color }} />
                  <div className="kiosk-cita-time">
                    <div className="kiosk-cita-hora">{formatHora(c.hora)}</div>
                    <div className="kiosk-cita-fecha">{isToday2 ? "Hoy" : formatFecha(c.fecha)}</div>
                  </div>
                  <div className="kiosk-cita-info">
                    <div className="kiosk-cita-titulo">{getCitaTitle(c)}</div>
                    <div className="kiosk-cita-meta">
                      {c.duracion_minutos} min
                      {assignee && <span> · {assignee.nombre}</span>}
                      {getLeadName(c.lead_id) && <span> · {getLeadName(c.lead_id)}</span>}
                    </div>
                  </div>
                  <div className="kiosk-cita-badge" style={{ background: estado.bg, color: estado.color }}>{estado.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar panel */}
        <div className="kiosk-calendar-panel">
          {/* Week nav */}
          <div className="kiosk-week-nav">
            <button onClick={prevWeek} className="kiosk-nav-btn">&#8249;</button>
            <div className="kiosk-week-label">
              {weekData[0].getDate()} {MESES[weekData[0].getMonth()].substring(0, 3)} — {weekData[6].getDate()} {MESES[weekData[6].getMonth()].substring(0, 3)} {weekData[6].getFullYear()}
            </div>
            <button onClick={goToday} className="kiosk-today-btn">Hoy</button>
            <button onClick={nextWeek} className="kiosk-nav-btn" style={{ opacity: canGoNext ? 1 : 0.3 }}>&#8250;</button>
          </div>

          {/* Day headers */}
          <div className="kiosk-day-headers">
            <div className="kiosk-time-gutter" />
            {weekData.map((day, i) => {
              const isToday2 = isSameDay(day, today);
              return (
                <div key={i} className={`kiosk-day-header ${isToday2 ? "is-today" : ""}`}>
                  <div className="kiosk-day-name">{DIAS_SEMANA[i]}</div>
                  <div className="kiosk-day-num">{day.getDate()}</div>
                  {isToday2 && <div className="kiosk-today-dot" />}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="kiosk-grid-scroll">
            {Array.from({ length: 13 }, (_, h) => h + 8).map((hour) => {
              const horaStr = String(hour).padStart(2, "0") + ":00";
              return (
                <div key={hour} className="kiosk-hour-row">
                  <div className="kiosk-time-label">{horaStr}</div>
                  {weekData.map((day, i) => {
                    const isToday2 = isSameDay(day, today);
                    const fechaStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    const hourCitas = citasForDay(day).filter(c => {
                      const citaHour = parseInt((c.hora || "00").substring(0, 2));
                      return citaHour === hour;
                    });
                    const openNewCita = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      setEditingCita(null);
                      setPrefilledDate({ fecha: fechaStr, hora: horaStr.substring(0, 5) });
                      setShowModal(true);
                    };
                    return (
                      <div key={i} className={`kiosk-cell ${isToday2 ? "is-today" : ""}`}
                        onClick={hourCitas.length === 0 ? openNewCita : undefined}>
                        {hourCitas.map((c) => {
                          const assignee = c.asignado_a ? teamMembers.find(m => m.id === c.asignado_a) : null;
                          return (
                            <div key={c.id} className="crm-cal-event kiosk-event" onClick={(e) => {
                              e.stopPropagation(); setEditingCita(c); setPrefilledDate(null); setShowModal(true);
                            }} style={{ borderLeftColor: ESTADO_COLORS[c.estado]?.color || "var(--tide)" }}>
                              <small>{formatHora(c.hora)}</small>
                              <strong>{getCitaTitle(c)}</strong>
                              {assignee && <span className="crm-cal-event__assignee">{assignee.nombre}</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* + Cita button */}
          <button onClick={() => { setEditingCita(null); setPrefilledDate(null); setShowModal(true); }}
            className="kiosk-add-btn">+ Nueva Cita</button>
        </div>

        {/* Modal (reused) */}
        {showModal && (
          <CitaModal
            cita={editingCita}
            leads={leads || []}
            teamMembers={teamMembers}
            onSave={handleSave}
            onDelete={async (id) => { await handleDelete(id); setShowModal(false); setEditingCita(null); }}
            onClose={() => { setShowModal(false); setEditingCita(null); setPrefilledDate(null); }}
            saving={saving}
            googleMeetAvailable={googleMeetAvailable}
            prefillFecha={prefilledDate?.fecha}
            prefillHora={prefilledDate?.hora}
          />
        )}
      </div>
    );
  }

  return (
    <div className="crm-calendar-layout" style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40 }}>
      <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="crm-badge--nodot crm-badge crm-badge--ok">{filteredCitas.length} citas</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as "activas" | "todas")} className="crm-field__input" style={{ padding: "6px 10px", width: "auto", fontSize: 12 }}>
            <option value="activas">Activas</option>
            <option value="todas">Todas</option>
          </select>
          <div className="crm-segmented">
            {([{ id: "semana" as const, label: "Semana" }, { id: "lista" as const, label: "Lista" }]).map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} className={vista === v.id ? "is-active" : ""}>{v.label}</button>
            ))}
          </div>
          <button onClick={enterKiosk} className="crm-btn crm-btn--ghost crm-btn--sm" title="Pantalla completa" style={{ fontSize: 15, padding: "4px 8px" }}>⛶</button>
          <button onClick={() => { setEditingCita(null); setShowModal(true); }} className="crm-btn crm-btn--accent crm-btn--sm">+ Cita</button>
        </div>
      </div>

      {/* Upcoming citas summary */}
      {upcomingCitas.length > 0 && (
        <div className="crm-card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="crm-card__subtitle" style={{ marginBottom: 10 }}>PRÓXIMOS 7 DÍAS</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {upcomingCitas.slice(0, 5).map((c) => {
              const assignee = c.asignado_a ? teamMembers.find(m => m.id === c.asignado_a) : null
              return (
              <div key={c.id} className="crm-cal-event" onClick={() => { setEditingCita(c); setShowModal(true); }}
                style={{ minWidth: 130, flex: "1 1 130px", borderLeftColor: ESTADO_COLORS[c.estado]?.color || "var(--tide)" }}>
                <strong>{getCitaTitle(c)}</strong>
                <small>{formatFecha(c.fecha)} · {formatHora(c.hora)}</small>
                {assignee && <span className="crm-cal-event__assignee">{assignee.nombre}</span>}
              </div>
              )
            })}
            {upcomingCitas.length > 5 && (
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", fontSize: 12, color: "var(--slate-2)" }}>
                +{upcomingCitas.length - 5} mas
              </div>
            )}
          </div>
        </div>
      )}

      {vista === "semana" ? (
        /* WEEKLY CALENDAR VIEW */
        <div style={{ background: "#fff", borderRadius: "var(--r-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
          {/* Week navigation */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid var(--paper)",
          }}>
            <button onClick={prevWeek} style={navBtnStyle}>&#8249;</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textAlign: "center" }}>
                {weekData[0].getDate()} {MESES[weekData[0].getMonth()].substring(0, 3)} — {weekData[6].getDate()} {MESES[weekData[6].getMonth()].substring(0, 3)} {weekData[6].getFullYear()}
              </span>
              <button onClick={goToday} className="crm-btn crm-btn--ghost crm-btn--sm" style={{ height: 24, fontSize: 10 }}>Hoy</button>
            </div>
            <button onClick={nextWeek} style={{ ...navBtnStyle, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? "pointer" : "default" }}>&#8250;</button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
            <div />
            {weekData.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div key={i} style={{ padding: "10px 4px 6px", textAlign: "center", borderLeft: "1px solid var(--border)" }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: isToday ? "var(--tide-ink)" : "var(--slate-2)",
                  }}>{DIAS_SEMANA[i]}</div>
                  <div style={{
                    fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em",
                    color: isToday ? "var(--tide-ink)" : "var(--ink)",
                    lineHeight: 1.2, marginTop: 2,
                  }}>{day.getDate()}</div>
                  {isToday && <div style={{ width: 16, height: 2, background: "var(--tide)", margin: "3px auto 0", borderRadius: 1 }} />}
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}>
            {Array.from({ length: 13 }, (_, h) => h + 8).map((hour) => {
              const horaStr = String(hour).padStart(2, "0") + ":00";
              return (
                <div key={hour} style={{ display: "grid", gridTemplateColumns: "50px repeat(7, 1fr)", minHeight: 64 }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--slate-2)",
                    padding: "4px 6px", textAlign: "right", borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--paper)",
                  }}>{horaStr}</div>
                  {weekData.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    const fechaStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    const hourCitas = citasForDay(day).filter(c => {
                      const citaHour = parseInt((c.hora || "00").substring(0, 2));
                      return citaHour === hour;
                    });
                    const openNewCita = (e) => {
                      e.stopPropagation();
                      setEditingCita(null);
                      setPrefilledDate({ fecha: fechaStr, hora: horaStr.substring(0, 5) });
                      setShowModal(true);
                    };
                    return (
                      <div key={i} onClick={hourCitas.length === 0 ? openNewCita : undefined} style={{
                        borderLeft: "1px solid var(--border)", borderBottom: "1px solid var(--paper)",
                        padding: 1, cursor: hourCitas.length === 0 ? "pointer" : "default",
                        background: isToday ? "rgba(20,200,164,0.03)" : "transparent",
                        overflow: "hidden", position: "relative", minWidth: 0,
                        display: "flex", flexDirection: "column",
                      }}
                      onMouseEnter={e => { if (!hourCitas.length) e.currentTarget.style.background = "var(--paper)"; }}
                      onMouseLeave={e => e.currentTarget.style.background = isToday ? "rgba(20,200,164,0.03)" : "transparent"}
                      >
                        {hourCitas.map((c) => {
                          const assignee = c.asignado_a ? teamMembers.find(m => m.id === c.asignado_a) : null
                          return (
                          <div key={c.id} className="crm-cal-event" onClick={(e) => { e.stopPropagation(); setEditingCita(c); setPrefilledDate(null); setShowModal(true); }}
                            style={{
                              borderLeftColor: ESTADO_COLORS[c.estado]?.color || "var(--tide)",
                              marginBottom: 2,
                            }}>
                            <small>{formatHora(c.hora)}</small>
                            <strong>{getCitaTitle(c)}</strong>
                            {assignee && <span className="crm-cal-event__assignee">{assignee.nombre}</span>}
                          </div>
                          )
                        })}
                        {hourCitas.length > 0 && (
                          <div onClick={openNewCita} style={{
                            fontSize: 10, color: "var(--tide-ink)", cursor: "pointer",
                            textAlign: "center", padding: "0 2px", lineHeight: 1,
                            opacity: 0.5, transition: "opacity 80ms",
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                          >+</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--border)" }}>
          {filteredCitas.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--slate-2)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No hay citas</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Crea una cita manualmente o deja que el chatbot las agende</div>
            </div>
          ) : (
            filteredCitas.map((c) => {
              const estado = ESTADO_COLORS[c.estado] || ESTADO_COLORS.confirmada;
              const isPast = new Date(c.fecha_hora) < today;
              return (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", borderBottom: "1px solid var(--paper-2)",
                  opacity: isPast ? 0.5 : 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: estado.bg,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: estado.color, lineHeight: 1 }}>
                        {new Date(c.fecha + "T00:00:00").getDate()}
                      </div>
                      <div style={{ fontSize: 8, fontWeight: 600, color: estado.color, textTransform: "uppercase" }}>
                        {MESES[new Date(c.fecha + "T00:00:00").getMonth()].substring(0, 3)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{getCitaTitle(c)}</div>
                      <div style={{ fontSize: 12, color: "var(--slate)" }}>
                        {formatHora(c.hora)} · {c.duracion_minutos} min
                        {c.servicio && <span> · {c.servicio}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="crm-badge--nodot crm-badge" style={{
                      background: estado.bg, color: estado.color, borderColor: "transparent",
                    }}>{estado.label}</span>
                    {c.gcal_meet_link && (
                      <a href={c.gcal_meet_link} target="_blank" rel="noopener noreferrer"
                        className="crm-badge--nodot crm-badge crm-badge--info"
                        style={{ textDecoration: "none" }}>Meet</a>
                    )}
                    <button onClick={() => { setEditingCita(c); setShowModal(true); }} style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
                      background: "#fff", fontSize: 11, cursor: "pointer", color: "var(--slate)",
                    }}>Editar</button>
                    <button onClick={() => handleDelete(c.id)} style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca",
                      background: "#fef2f2", fontSize: 11, cursor: "pointer", color: "#dc2626",
                    }}>Eliminar</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      </div>

      {/* Right column - sidebar cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Next appointment card (ink) */}
        {nextCita ? (
          <div className="crm-card" style={{
            position: "relative", overflow: "hidden",
            background: "var(--ink)", color: "#fff", borderColor: "transparent",
          }}>
            <div className="mt-arc" style={{ borderColor: "rgba(20,200,164,0.25)", right: -80, bottom: -80, width: 260, height: 260 }} />
            <div style={{ position: "relative" }}>
              <div className="crm-card__subtitle" style={{ color: "var(--tide)" }}>PRÓXIMA CITA</div>
              <div style={{
                fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500,
                letterSpacing: "-0.02em", marginTop: 8, color: "var(--tide)", lineHeight: 1.1,
              }}>
                {formatHora(nextCita.hora)}
              </div>
              <div style={{ fontSize: 13, color: "var(--mist)", marginTop: 6 }}>
                {getCitaTitle(nextCita)}
              </div>
              <div style={{ fontSize: 11, color: "var(--slate-2)", marginTop: 4 }}>
                {formatFecha(nextCita.fecha)}
              </div>
              {nextCita.gcal_meet_link && (
                <a href={nextCita.gcal_meet_link} target="_blank" rel="noopener noreferrer" className="crm-btn crm-btn--accent crm-btn--sm" style={{ marginTop: 14 }}>
                  Google Meet
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="crm-card" style={{ background: "var(--ink)", color: "#fff", borderColor: "transparent", textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 13, color: "var(--mist)" }}>Sin citas próximas</div>
          </div>
        )}

        {/* Today counter */}
        <div className="crm-card" style={{ textAlign: "center", padding: 16 }}>
          <div className="crm-card__subtitle">HOY</div>
          <div className="crm-stat__value" style={{ justifyContent: "center", marginTop: 6 }}>
            {todayCitas.length}<span className="unit">/ {totalActiveCitas}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--slate-2)", marginTop: 4 }}>hoy / activas</div>
        </div>

        {/* Stats mini */}
        <div className="crm-card" style={{ padding: 18 }}>
          <div className="crm-card__subtitle">RESUMEN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            <div className="crm-detail__field">
              <span className="crm-detail__field-key">Confirmadas</span>
              <span className="crm-detail__field-val" style={{ color: "var(--ok)" }}>
                {filteredCitas.filter(c => c.estado === "confirmada").length}
              </span>
            </div>
            <div className="crm-detail__field">
              <span className="crm-detail__field-key">Pendientes</span>
              <span className="crm-detail__field-val" style={{ color: "var(--warn)" }}>
                {filteredCitas.filter(c => c.estado === "pendiente").length}
              </span>
            </div>
            <div className="crm-detail__field">
              <span className="crm-detail__field-key">Canceladas</span>
              <span className="crm-detail__field-val" style={{ color: "var(--err)" }}>
                {filteredCitas.filter(c => c.estado === "cancelada").length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CitaModal
          cita={editingCita}
          leads={leads || []}
          teamMembers={teamMembers}
          onSave={handleSave}
          onDelete={async (id) => { await handleDelete(id); setShowModal(false); setEditingCita(null); }}
          onClose={() => { setShowModal(false); setEditingCita(null); setPrefilledDate(null); }}
          saving={saving}
          googleMeetAvailable={googleMeetAvailable}
          prefillFecha={prefilledDate?.fecha}
          prefillHora={prefilledDate?.hora}
        />
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const labelStyle: React.CSSProperties = { display: "block", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, color: "var(--slate-2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.14em" };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)",
  fontSize: 13, color: "var(--ink)", outline: "none", background: "var(--white)", fontFamily: "inherit",
};
const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
  background: "#fff", fontSize: 18, cursor: "pointer", color: "var(--slate)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
