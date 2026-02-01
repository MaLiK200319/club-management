import api from './api';

// ============= USER/PROFILE SERVICES =============
export const userService = {
    getProfile: (userId) => api.get(`/users/${userId}`),
    updateProfile: (userId, data) => api.put(`/users/${userId}/profile`, data),
    uploadAvatar: (userId, formData) => {
        return api.post(`/users/${userId}/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    searchUsers: (query = '') => api.get(`/users/search?q=${query}`),
    getAllUsers: () => api.get('/users')
};

// ============= MEMBERSHIP SERVICES =============
export const membershipService = {
    joinClub: (clubId) => api.post(`/clubs/${clubId}/join`),
    leaveClub: (clubId) => api.delete(`/clubs/${clubId}/leave`),
    getClubMembers: (clubId) => api.get(`/clubs/${clubId}/members`),
    getPendingMembers: (clubId) => api.get(`/clubs/${clubId}/pending-members`),
    updateMember: (clubId, userId, data) => api.put(`/clubs/${clubId}/members/${userId}`, data),
    getUserClubs: (userId) => api.get(`/users/${userId}/clubs`),
    getMembershipStatus: (clubId, userId) => api.get(`/clubs/${clubId}/membership-status/${userId}`)
};

// ============= CLUB SERVICES (ENHANCED) =============
export const clubService = {
    getAll: () => api.get('/clubs'),
    getById: (id) => api.get(`/clubs/${id}`),
    create: (data) => api.post('/clubs/create', data),
    update: (id, data) => api.put(`/clubs/${id}`, data),
    delete: (id) => api.delete(`/clubs/${id}`),
    updateStatus: (id, status) => api.put(`/clubs/${id}/status`, { status }),
    follow: (id) => api.post(`/clubs/${id}/follow`),
    unfollow: (id) => api.post(`/clubs/${id}/unfollow`),
    getFollowedClubs: (userId) => api.get(`/users/${userId}/followed-clubs`),
    getAllForAdmin: () => api.get('/clubs/admin/all')
};

// ============= EVENT SERVICES (ENHANCED) =============
export const eventService = {
    getAll: () => api.get('/events'),
    getById: (id) => api.get(`/events/${id}`),
    getByClub: (clubId) => api.get(`/events/club/${clubId}`),
    getUserEvents: (userId) => api.get(`/events/user/${userId}`),
    create: (data) => api.post('/events/create', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    delete: (id) => api.delete(`/events/${id}`),
    updateStatus: (id, status) => api.put(`/events/${id}/status`, { status }),
    register: (id) => api.post(`/events/${id}/register`),
    unregister: (id) => api.delete(`/events/${id}/unregister`),
    submitFeedback: (id, data) => api.post(`/events/${id}/feedback`, data),
    getFeedback: (id) => api.get(`/events/${id}/feedback`),
    getRegistrations: (id) => api.get(`/events/${id}/registrations`),
    updateRegistrationStatus: (eventId, userId, status) => api.put(`/events/${eventId}/registrations/${userId}`, { status })
};

// ============= ANNOUNCEMENT SERVICES =============
export const announcementService = {
    create: (clubId, data) => api.post(`/clubs/${clubId}/announcements`, data),
    getByClub: (clubId) => api.get(`/clubs/${clubId}/announcements`),
    delete: (id) => api.delete(`/announcements/${id}`),
    getRecent: (limit = 10) => api.get(`/announcements/recent?limit=${limit}`)
};

// ============= NOTIFICATION SERVICES =============
export const notificationService = {
    getAll: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all')
};

// ============= AUTH SERVICES =============
export const authService = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },
    isSuperAdmin: () => {
        const user = authService.getCurrentUser();
        return user && user.role === 'super_admin';
    },
    isClubAdmin: () => {
        const user = authService.getCurrentUser();
        return user && user.role === 'club_admin';
    },
    // Backwards compatibility or generic admin check
    isAdmin: () => {
        const user = authService.getCurrentUser();
        return user && (user.role === 'super_admin' || user.role === 'club_admin');
    }
};

export default {
    userService,
    membershipService,
    clubService,
    eventService,
    announcementService,
    notificationService,
    authService
};
