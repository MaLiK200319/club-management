import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkUserStatus = async (storedUser) => {
        try {
            // Sync status from backend
            const response = await api.get(`/users/${storedUser.id}`);
            const freshUser = response.data;

            if (freshUser.status !== 'active') {
                console.warn('User suspended, forcing logout.');
                logout();
                return;
            }

            // Update user with fresh data (role, status, etc)
            // Merge token data with fresh profile data if needed, or just use profile
            const mergedUser = { ...storedUser, ...freshUser };
            localStorage.setItem('user', JSON.stringify(mergedUser));
            setUser(mergedUser);
        } catch (error) {
            console.error('Failed to sync user status', error);
            // If 401/403, token is invalid
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                logout();
            } else {
                // Soft fail: keep using stored user but warn? 
                // Or safe fail: verify token is still technically valid
                setUser(storedUser);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            const parsedUser = JSON.parse(storedUser);
            checkUserStatus(parsedUser);
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });

            if (response.data.token) {
                const { token, user } = response.data;

                // Double check status implied by login success, but let's be explicit if backend doesn't reject
                // AuthController was updated to reject non-active, so we are good.

                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                setUser(user);
                return { success: true };
            }
            return { success: false, message: "No token received" };
        } catch (error) {
            console.error("Login failed", error);
            return { success: false, message: error.response?.data?.message || "Login failed" };
        }
    };

    const register = async (name, email, password, role) => {
        try {
            // Frontend: Role is ignored/forced to student
            const response = await api.post('/auth/register', { name, email, password, role: 'student' });
            return { success: true, message: response.data.message };
        } catch (error) {
            console.error("Registration failed", error);
            return { success: false, message: error.response?.data?.message || "Registration failed" };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    // Refresh user data from backend (for state invalidation)
    const refreshUser = async () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            await checkUserStatus(JSON.parse(storedUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
