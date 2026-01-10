import React, { useEffect } from 'react';
import './Toast.css';

function Toast({ message, type = 'success', onClose, duration = 5000, onUndo }) {
  useEffect(() => {
    if (duration && !onUndo) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
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
