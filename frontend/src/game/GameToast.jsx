/* ─── Toast Hook for React ────────────────────────────── */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const GameToastContext = createContext(null);

let nextId = 0;

export function GameToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastRef = useRef([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++nextId;
    const toast = { id, message, type, visible: true };
    toastRef.current = [...toastRef.current, toast];
    setToasts([...toastRef.current]);

    // Show animation
    setTimeout(() => {
      toastRef.current = toastRef.current.map(t =>
        t.id === id ? { ...t, visible: true } : t
      );
      setToasts([...toastRef.current]);
    }, 10);

    // Auto-remove
    setTimeout(() => {
      toastRef.current = toastRef.current.map(t =>
        t.id === id ? { ...t, visible: false } : t
      );
      setToasts([...toastRef.current]);
      setTimeout(() => {
        toastRef.current = toastRef.current.filter(t => t.id !== id);
        setToasts([...toastRef.current]);
      }, 300);
    }, duration);
  }, []);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);

  return (
    <GameToastContext.Provider value={{ success, info, warning, error }}>
      {children}
      <div className="toast-container" id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} ${t.visible ? 'show' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </GameToastContext.Provider>
  );
}

export function useGameToast() {
  return useContext(GameToastContext);
}

// Imperative API for use outside React components (e.g., in socket handlers)
let imperativeToast = null;

export function setImperativeToast(toast) {
  imperativeToast = toast;
}

export const Toast = {
  success: (msg, dur) => imperativeToast?.success(msg, dur),
  info: (msg, dur) => imperativeToast?.info(msg, dur),
  warning: (msg, dur) => imperativeToast?.warning(msg, dur),
  error: (msg, dur) => imperativeToast?.error(msg, dur),
};

export default Toast;
