import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, loading, logout } = useContext(AuthContext);

    // 1. Loading State
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // 2. Auth Check
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Status Check (Suspended Users blocked everywhere)
    if (user.status !== 'active') {
        // Force logout to clear stale state and redirect
        logout();
        return <Navigate to="/login" replace />;
    }

    // 4. Role Check
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // User authorized, but not for this specific page
        // Redirect to Dashboard as safe default
        return <Navigate to="/dashboard" replace />;
    }

    // 5. Success
    return <Outlet />;
};

export default ProtectedRoute;
