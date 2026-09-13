"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isOpen: boolean;
}

const ToastContext = React.createContext<{
  toast: (message: string, type: ToastType, duration?: number) => void;
}>({
  toast: () => {},
});

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, isOpen: true };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isOpen: false } : t)));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 300);
      }, duration);
    }
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{
  toast: Toast;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          bg:     "bg-success/10",
          border: "border-success/20",
          text:   "text-foreground",
          icon:   <CheckCircle className="text-success" />,
        };
      case "error":
        return {
          bg:     "bg-destructive/10",
          border: "border-destructive/30",
          text:   "text-foreground",
          icon:   <AlertCircle className="text-destructive" />,
        };
      case "warning":
        return {
          bg:     "bg-warning-muted",
          border: "border-warning-border",
          text:   "text-foreground",
          icon:   <Info className="text-warning" />,
        };
      default:
        return {
          bg:     "bg-info-muted",
          border: "border-info-border",
          text:   "text-foreground",
          icon:   <Info className="text-info" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} ${styles.border} ${styles.text} border rounded-lg p-4 shadow-lg flex items-center gap-3 min-w-64 animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      <div className="text-lg">{styles.icon}</div>
      <div className="flex-1">{toast.message}</div>
      <button onClick={onClose} className="text-lg hover:opacity-70 transition-opacity">
        <X size={20} />
      </button>
    </div>
  );
};
