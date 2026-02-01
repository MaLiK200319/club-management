import React, { createContext, useState, useCallback } from 'react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    // Type: 'success', 'error', 'info', 'warning'
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast show align-items-center text-white bg-${toast.type === 'error' ? 'danger' : toast.type === 'success' ? 'success' : toast.type === 'warning' ? 'warning' : 'primary'} border-0 mb-2`}
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                    >
                        <div className="d-flex">
                            <div className="toast-body">
                                {toast.message}
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white me-2 m-auto"
                                onClick={() => removeToast(toast.id)}
                                aria-label="Close"
                            ></button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
