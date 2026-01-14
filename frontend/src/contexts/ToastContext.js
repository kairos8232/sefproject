import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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
  const counterRef = useRef(0);  // Use useRef instead of useState

  const showToast = useCallback((message, type = 'success', options = {}) => {
    // Filter out empty or invalid messages
    if (!message || typeof message !== 'string' || message.trim() === '') {
      console.warn('Toast called with empty or invalid message:', message);
      return null;
    }
    
    // Use counter with timestamp to ensure uniqueness
    counterRef.current += 1;
    const id = `toast-${Date.now()}-${counterRef.current}`;
    
    const toast = {
      id,
      message: message.trim(),
      type,
      duration: options.duration !== undefined ? options.duration : 3000,
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
