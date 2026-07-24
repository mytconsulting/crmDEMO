import { useState, useEffect, useRef } from "react";
import { Icon, I } from "@/components/crm-icons";

export default function ChatView({ supabase, session, leads }) {
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [leadSummaries, setLeadSummaries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const isUserScrolling = useRef(false);
  const prevMessageCount = useRef(0);

  const tenantId = session?.user?.id;

  // Detectar si el usuario está leyendo arriba (no está al fondo)
  function handleChatScroll() {
    const el = chatScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isUserScrolling.current = !atBottom;
  }

  // Load all leads with their latest interaction
  useEffect(() => {
    if (!tenantId) return;
    loadLeadSummaries();
  }, [tenantId, leads]);

  // DEMO: sin realtime ni polling (los datos son estáticos en localStorage).

  // Load messages when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) return;
    prevMessageCount.current = 0;
    isUserScrolling.current = false;
    setShowMobileInfo(false);
    loadMessages(selectedLeadId);
  }, [selectedLeadId]);

  // Scroll to bottom solo si hay mensajes nuevos Y el usuario no está leyendo arriba
  useEffect(() => {
    const msgs = conversations[selectedLeadId] || [];
    const isNewMessages = msgs.length !== prevMessageCount.current;
    prevMessageCount.current = msgs.length;

    if (isNewMessages && !isUserScrolling.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations[selectedLeadId]]);

  async function loadLeadSummaries(silent = false) {
    if (!silent) setLoading(true);
    try {
      const { data: interacciones } = await supabase
        .from("interacciones")
        .select("lead_id, detalle, created_at, tipo")
        .order("created_at", { ascending: false });

      // Group by lead_id, get latest message per lead
      const latestByLead = {};
      const countByLead = {};
      for (const i of (interacciones || [])) {
        if (!latestByLead[i.lead_id]) {
          latestByLead[i.lead_id] = i;
          countByLead[i.lead_id] = 1;
        } else {
          countByLead[i.lead_id]++;
        }
      }

      // Build summaries from leads prop
      const summaries = (leads || [])
        .filter(l => l.tenant_id === tenantId)
        .map(l => ({
          id: l.id,
          nombre: l.nombre || "Sin nombre",
          telefono: l.telefono || "",
          email: l.email || "",
          canal: l.canal || "",
          instagram_username: l.instagram_username || "",
          estado: l.estado || "nuevo",
          lead_score: l.lead_score || 0,
          lastMessage: latestByLead[l.id]?.detalle || "",
          lastMessageTime: latestByLead[l.id]?.created_at || l.created_at,
          lastMessageType: latestByLead[l.id]?.tipo || "",
          messageCount: countByLead[l.id] || 0
        }))
        .filter(l => l.messageCount > 0)
        .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

      setLeadSummaries(summaries);
    } catch (e) {
      console.error("Error loading summaries:", e);
    }
    if (!silent) setLoading(false);
  }

  async function loadMessages(leadId) {
    try {
      const { data } = await supabase
        .from("interacciones")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      setConversations(prev => ({ ...prev, [leadId]: data || [] }));
    } catch (e) {
      console.error("Error loading messages:", e);
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return time;
    if (diffDays === 1) return "Ayer " + time;
    if (diffDays < 7) return d.toLocaleDateString("es-ES", { weekday: "short" }) + " " + time;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + " " + time;
  }

  function isOutgoing(tipo) {
    return tipo === "whatsapp_respondido" || tipo === "instagram_respondido" || tipo === "follow_up_automatico" || tipo === "whatsapp_enviado";
  }

  const filteredLeads = leadSummaries.filter(l =>
    l.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.telefono || "").includes(searchTerm) ||
    (l.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.instagram_username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLead = leadSummaries.find(l => l.id === selectedLeadId);
  const fullLead = leads?.find(l => l.id === selectedLeadId);
  const messages = conversations[selectedLeadId] || [];

  const estadoColor = {
    nuevo: "var(--tide)",
    contactado: "#3b82f6",
    caliente: "#f59e0b",
    negociacion: "#f97316",
    reunion: "#10b981",
    cliente: "#22c55e"
  };

  return (
    <div className="chat-container" style={{ padding: 0, height: "calc(100vh - 220px)", maxHeight: "calc(100vh - 220px)", display: "flex", background: "var(--paper-2)", borderRadius: "var(--r-lg)", overflow: "hidden", border: "1px solid var(--border)" }}>
      {/* Left panel - Lead list */}
      <div className={`chat-sidebar${selectedLeadId ? ' hidden' : ''}`} style={{ width: 340, minWidth: 340, borderRight: "1px solid var(--border)", background: "var(--white)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="crm-chat__pane-header">
          <div className="crm-chat__pane-title">Conversaciones</div>
          <span className="mt-meta">{leadSummaries.length} chats activos</span>
          <input
            type="text"
            placeholder="Buscar lead..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="crm-field__input"
            style={{ marginTop: 8 }}
          />
        </div>

        {/* Lead list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--slate-2)" }}>Cargando...</div>
          ) : filteredLeads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--slate-2)" }}>No hay conversaciones</div>
          ) : (
            filteredLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`crm-chat-row${selectedLeadId === lead.id ? ' is-active' : ''}`}
              >
                <div className="crm-chat-row__avatar" style={{ background: estadoColor[lead.estado] || 'var(--ink)', color: '#fff' }}>
                  {lead.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="crm-chat-row__body">
                  <div className="crm-chat-row__line">
                    <div className="crm-chat-row__name">{lead.nombre}</div>
                    <div className="crm-chat-row__time">{formatTime(lead.lastMessageTime)}</div>
                  </div>
                  <div className="crm-chat-row__preview">
                    {isOutgoing(lead.lastMessageType) ? "✓ " : ""}
                    {(lead.lastMessage || "").replace(/\[SCORE:\d+\]/g, "").replace(/\[CITA:[^\]]*\]/g, "").replace(/\[RESUMEN:[^\]]*\]/g, "").substring(0, 60)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Chat */}
      <div className={`chat-main${selectedLeadId ? ' active' : ''}`} style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--paper-2)", position: "relative" }}>
        {!selectedLeadId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
            <span style={{ color: "var(--slate-2)", display: "flex" }}><Icon d={I.chat} size={44} /></span>
            <p style={{ color: "var(--slate-2)", fontSize: 15 }}>Selecciona un lead para ver la conversación</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="crm-chat__conv-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="chat-back-btn"
                  onClick={() => setSelectedLeadId(null)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 20, color: "var(--tide)", padding: "4px 4px 4px 0"
                  }}
                >←</button>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: estadoColor[selectedLead?.estado] || "var(--tide)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 14
                }}>
                  {selectedLead?.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedLead?.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--slate-2)", display: "flex", alignItems: "center", gap: 4 }}>
                    {selectedLead?.canal === "instagram" ? (
                      <><span className="crm-badge--nodot crm-badge" style={{ background: "#faf5ff", color: "#7c3aed", borderColor: "transparent", padding: "1px 5px", height: "auto" }}>IG</span> {selectedLead?.instagram_username || selectedLead?.instagram_user_id || "Instagram"}</>
                    ) : (
                      <><span className="crm-badge--nodot crm-badge" style={{ background: "rgba(22,160,106,0.1)", color: "var(--ok)", borderColor: "transparent", padding: "1px 5px", height: "auto" }}>WA</span> {selectedLead?.telefono}</>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                    background: (estadoColor[selectedLead?.estado] || "var(--tide)") + "15",
                    color: estadoColor[selectedLead?.estado] || "var(--tide)"
                  }}>
                    {selectedLead?.estado}
                  </span>
                  <span style={{ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: "var(--paper)", color: "var(--slate)" }}>
                    {messages.length}
                  </span>
                  <button
                    className="crm-chat__info-btn"
                    onClick={() => setShowMobileInfo(!showMobileInfo)}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: "1px solid var(--border)",
                      background: showMobileInfo ? "var(--tide-soft)" : "var(--white)",
                      color: showMobileInfo ? "var(--tide-ink)" : "var(--slate)",
                      fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title="Info del lead"
                  ><Icon d={I.user} size={14} /></button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatScrollRef} onScroll={handleChatScroll} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              {messages.map((msg, idx) => {
                const outgoing = isOutgoing(msg.tipo);
                const cleanText = (msg.detalle || "")
                  .replace(/\[SCORE:\d+\]/g, "")
                  .replace(/\[CITA:[^\]]*\]/g, "")
                  .replace(/\[RESUMEN:[^\]]*\]/g, "")
                  .trim();

                if (!cleanText) return null;

                // Show date separator
                const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1]?.created_at).toDateString();

                const isAI = msg.tipo === "whatsapp_respondido" || msg.tipo === "instagram_respondido";
                const bubbleClass = outgoing ? (isAI ? 'crm-bubble crm-bubble--ai' : 'crm-bubble crm-bubble--out') : 'crm-bubble crm-bubble--in';

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="crm-chat__day-sep">
                        {new Date(msg.created_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: outgoing ? "flex-end" : "flex-start" }}>
                      <div className={bubbleClass} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {isAI && msg.detalle?.startsWith("[RECORDATORIO") && (
                          <div className="mt-meta" style={{ color: "var(--warn)", marginBottom: 4 }}>RECORDATORIO</div>
                        )}
                        {isAI && msg.detalle?.startsWith("[FOLLOW-UP") && (
                          <div className="mt-meta" style={{ color: "var(--info)", marginBottom: 4 }}>FOLLOW-UP</div>
                        )}
                        {cleanText}
                        <div className="crm-bubble__meta" style={{ textAlign: "right" }}>
                          {new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          {outgoing && " ✓"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Mobile info overlay */}
            {showMobileInfo && fullLead && (
              <div className="crm-chat__mobile-info" style={{
                position: "absolute", top: 56, left: 0, right: 0, bottom: 0, zIndex: 5,
                background: "var(--white)", overflowY: "auto",
              }}>
                <div className="crm-detail__block">
                  <div className="crm-detail__lead-name">{fullLead.nombre || "Sin nombre"}</div>
                  {fullLead.empresa && <div className="crm-detail__lead-company">{fullLead.empresa}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <span className="crm-badge--nodot crm-badge" style={{
                      background: (estadoColor[fullLead.estado] || "var(--tide)") + "15",
                      color: estadoColor[fullLead.estado] || "var(--tide)", borderColor: "transparent"
                    }}>{fullLead.estado}</span>
                    {fullLead.lead_score > 0 && (
                      <span className="crm-badge--nodot crm-badge crm-badge--accent">Score {fullLead.lead_score}</span>
                    )}
                  </div>
                </div>
                <div className="crm-detail__block">
                  <div className="crm-detail__block-label">Contacto</div>
                  {fullLead.telefono && <div className="crm-detail__field"><span className="crm-detail__field-key">Teléfono</span><span className="crm-detail__field-val">{fullLead.telefono}</span></div>}
                  {fullLead.email && <div className="crm-detail__field"><span className="crm-detail__field-key">Email</span><span className="crm-detail__field-val">{fullLead.email}</span></div>}
                  {fullLead.canal && <div className="crm-detail__field"><span className="crm-detail__field-key">Canal</span><span className="crm-detail__field-val">{fullLead.canal}</span></div>}
                </div>
                {fullLead.contexto_lead && (
                  <div className="crm-detail__block">
                    <div className="crm-detail__block-label">Contexto</div>
                    <p style={{ fontSize: 12.5, color: "var(--slate)", lineHeight: 1.55 }}>{fullLead.contexto_lead}</p>
                  </div>
                )}
                {fullLead.resumen_conversacion && (
                  <div className="crm-detail__block">
                    <div className="crm-detail__block-label">Resumen IA</div>
                    <p style={{ fontSize: 12.5, color: "var(--slate)", lineHeight: 1.55 }}>{fullLead.resumen_conversacion}</p>
                  </div>
                )}
              </div>
            )}

            {/* Info bar */}
            <div style={{
              padding: "10px 20px", background: "var(--white)", borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}>
              <span className="crm-ai-pill">Setter IA</span>
              <span className="mt-body-s">Las respuestas son gestionadas por el agente · Solo lectura</span>
            </div>
          </>
        )}
      </div>

      {/* Right panel - Lead detail (desktop only) */}
      {selectedLeadId && fullLead && (
        <div className="crm-chat__detail-pane">
          <div className="crm-detail__block">
            <div className="crm-detail__lead-name">{fullLead.nombre || "Sin nombre"}</div>
            {fullLead.empresa && <div className="crm-detail__lead-company">{fullLead.empresa}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <span className="crm-badge--nodot crm-badge" style={{
                background: (estadoColor[fullLead.estado] || "var(--tide)") + "15",
                color: estadoColor[fullLead.estado] || "var(--tide)", borderColor: "transparent"
              }}>{fullLead.estado}</span>
              {fullLead.lead_score > 0 && (
                <span className="crm-badge--nodot crm-badge crm-badge--accent">Score {fullLead.lead_score}</span>
              )}
            </div>
          </div>

          <div className="crm-detail__block">
            <div className="crm-detail__block-label">Contacto</div>
            {fullLead.telefono && (
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">Teléfono</span>
                <span className="crm-detail__field-val">{fullLead.telefono}</span>
              </div>
            )}
            {fullLead.email && (
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">Email</span>
                <span className="crm-detail__field-val">{fullLead.email}</span>
              </div>
            )}
            {fullLead.canal && (
              <div className="crm-detail__field">
                <span className="crm-detail__field-key">Canal</span>
                <span className="crm-detail__field-val">{fullLead.canal}</span>
              </div>
            )}
          </div>

          {fullLead.contexto_lead && (
            <div className="crm-detail__block">
              <div className="crm-detail__block-label">Contexto</div>
              <p style={{ fontSize: 12.5, color: "var(--slate)", lineHeight: 1.55 }}>
                {fullLead.contexto_lead}
              </p>
            </div>
          )}

          {fullLead.resumen_conversacion && (
            <div className="crm-detail__block">
              <div className="crm-detail__block-label">Resumen IA</div>
              <p style={{ fontSize: 12.5, color: "var(--slate)", lineHeight: 1.55 }}>
                {fullLead.resumen_conversacion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
