"use client";

import * as React from "react";
import { MdClose, MdCheckCircle, MdError } from "react-icons/md";
import { BiInfoCircle } from "react-icons/bi";

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
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-900",
          icon: <MdCheckCircle className="text-green-600" />,
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-900",
          icon: <MdError className="text-red-600" />,
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-900",
          icon: <BiInfoCircle className="text-yellow-600" />,
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-900",
          icon: <BiInfoCircle className="text-blue-600" />,
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
        <MdClose />
      </button>
    </div>
  );
};
