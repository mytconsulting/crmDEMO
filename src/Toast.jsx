import { useState, useEffect, useCallback } from "react";

// ============================================================
// TOAST NOTIFICATION COMPONENT
// ============================================================

function Toast({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const isNew = toast.type === "lead-new";
  const accentColor = isNew ? "var(--tide)" : "#f59e0b";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "14px 18px",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        borderLeft: `4px solid ${accentColor}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 280,
        maxWidth: 380,
        animation: isExiting ? "toastOut 0.3s ease forwards" : "toastIn 0.3s ease forwards",
        cursor: "pointer",
      }}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <span style={{ fontSize: 22 }}>{isNew ? "✨" : "🔄"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 2 }}>
          {toast.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--slate)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {toast.message}
        </div>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(80px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(80px); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  );
}

// Hook to manage toast state
export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, message, type = "lead-new") => {
    const id = Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
