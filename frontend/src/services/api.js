import axios from 'axios';

// Adjust baseURL if your WAMP configuration is different
// Ensure 'backend' points to the folder containing index.php
const api = axios.create({
    baseURL: 'http://localhost/stage_raed/backend',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for 403 handling (State Invalidation)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // User is unauthorized or forbidden - likely suspended/demoted
            // Clear local state and redirect to login
            const isLoginRequest = error.config.url.includes('/auth/login');
            if (!isLoginRequest) {
                console.warn('Received 401/403 - User may be suspended or demoted. Logging out.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
