import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', options = {}) => {
    const id = Date.now();
    const toast = {
      id,
      message,
      type,
      duration: options.duration !== undefined ? options.duration : 5000,
      onUndo: options.onUndo,
    };

    setToasts((prev) => [...prev, toast]);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, options) => {
    return showToast(message, 'success', options);
  }, [showToast]);

  const showError = useCallback((message, options) => {
    return showToast(message, 'error', options);
  }, [showToast]);

  const showWarning = useCallback((message, options) => {
    return showToast(message, 'warning', options);
  }, [showToast]);

  const showInfo = useCallback((message, options) => {
    return showToast(message, 'info', options);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, hideToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
            onUndo={toast.onUndo ? () => {
              toast.onUndo();
              hideToast(toast.id);
            } : null}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
