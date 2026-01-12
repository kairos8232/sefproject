import React, { useEffect } from 'react';
import './Toast.css';

function Toast({ message, type = 'success', onClose, duration = 3000, onUndo }) {
  useEffect(() => {
    // Always auto-dismiss: 3s for regular, 5s for undo
    const timeoutDuration = onUndo ? 5000 : (duration || 3000);
    const timer = setTimeout(onClose, timeoutDuration);
    return () => clearTimeout(timer);
  }, [duration, onClose, onUndo]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      {onUndo && (
        <button className="toast-undo-button" onClick={onUndo}>
          Undo
        </button>
      )}
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export default Toast;
