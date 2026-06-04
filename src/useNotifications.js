import { useState, useEffect, useCallback, useRef } from "react";
import {
  requestPermission as reqPerm,
  getPermissionState,
  sendNotification,
  playNotificationSound,
  unlockAudio,
  subscribeToPush,
} from "./notifications.js";
import { useToasts } from "./Toast.jsx";

// ============================================================
// NOTIFICATIONS HOOK
// ============================================================

const COLUMNS_MAP = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  caliente: "Caliente",
  negociacion: "Negociación",
  reunion: "Reunión",
  cliente: "Cliente",
};

export function useNotifications(supabase, session) {
  const tenantId = session?.user?.id || 'anon';
  const storageKey = `notif_history_${tenantId}`;

  const [permissionState, setPermissionState] = useState(getPermissionState);
  const [notificationHistory, setNotificationHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const { toasts, addToast, removeToast } = useToasts();

  // Track own actions to avoid duplicate notifications from Realtime
  const ownActionsRef = useRef(new Set());

  // Reset history when tenant changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setNotificationHistory(stored ? JSON.parse(stored) : []);
    } catch { setNotificationHistory([]); }
  }, [storageKey]);

  // Persistir en localStorage cada vez que cambie
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(notificationHistory)); } catch { /* storage full or unavailable */ }
  }, [notificationHistory, storageKey]);

  const addToHistory = useCallback((title, body, type) => {
    setNotificationHistory(prev => [
      { id: Date.now() + "_" + Math.random().toString(36).substr(2, 5), title, body, type, time: new Date().toISOString() },
      ...prev
    ].slice(0, 50));
  }, []);

  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await reqPerm();
    setPermissionState(result);
    // If granted, subscribe to Web Push for background notifications
    if (result === "granted" && supabase) {
      subscribeToPush(supabase);
    }
    return result;
  }, [supabase]);

  // Auto-subscribe to push if permission is already granted
  useEffect(() => {
    if (permissionState === "granted" && supabase && session) {
      subscribeToPush(supabase);
    }
  }, [permissionState, supabase, session]);

  const notifyNewLead = useCallback(
    (lead) => {
      const title = "Nuevo Lead";
      const body = lead.nombre || lead.email || "Sin nombre";
      sendNotification(title, { body, tag: "new-lead" });
      addToast(title, body, "lead-new");
      addToHistory(title, body, "lead-new");
    },
    [addToast, addToHistory]
  );

  const notifyStatusChange = useCallback(
    (lead, oldStatus, newStatus) => {
      const name = lead.nombre || lead.email || "Lead";
      const newLabel = COLUMNS_MAP[newStatus] || newStatus;
      const title = "Lead Actualizado";
      const body = `${name} → ${newLabel}`;
      sendNotification(title, { body, tag: "status-change" });
      addToast(title, body, "lead-status");
      addToHistory(title, body, "lead-status");
    },
    [addToast, addToHistory]
  );

  const notifyCitaAgendada = useCallback(
    (cita) => {
      const fecha = cita.fecha || "";
      const hora = cita.hora ? cita.hora.substring(0, 5) : "";
      const title = "Cita Agendada";
      const body = `${fecha} a las ${hora}`;
      sendNotification(title, { body, tag: "cita-new" });
      addToast(title, body, "cita-new");
      addToHistory(title, body, "cita-new");
    },
    [addToast, addToHistory]
  );

  // Mark an action as "own" so Realtime doesn't double-notify
  const markOwnAction = useCallback((leadId) => {
    ownActionsRef.current.add(String(leadId));
    setTimeout(() => ownActionsRef.current.delete(String(leadId)), 5000);
  }, []);

  // Unlock audio on first user interaction (click/touch anywhere)
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
    };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  // Supabase Realtime subscription for cross-device notifications
  useEffect(() => {
    if (!supabase || !session) return;

    const channel = supabase
      .channel("leads-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new;
          if (ownActionsRef.current.has(String(lead.id))) return;
          notifyNewLead(lead);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new;
          const old = payload.old;
          if (ownActionsRef.current.has(String(lead.id))) return;
          if (old.estado && lead.estado && old.estado !== lead.estado) {
            notifyStatusChange(lead, old.estado, lead.estado);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "citas" },
        (payload) => {
          const cita = payload.new;
          notifyCitaAgendada(cita);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, session, notifyNewLead, notifyStatusChange, notifyCitaAgendada]);

  return {
    permissionState,
    requestPermission,
    notifyNewLead,
    notifyStatusChange,
    notifyCitaAgendada,
    markOwnAction,
    toasts,
    removeToast,
    notificationHistory,
    clearHistory,
  };
}
