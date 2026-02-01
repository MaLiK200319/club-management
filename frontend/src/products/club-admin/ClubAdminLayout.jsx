import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useClubAdminData from './hooks/useClubAdminData';
import NotificationDropdown from '../../components/NotificationDropdown';
import './club-admin.css';

const ClubAdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Apply Club Admin Theme
    useEffect(() => {
        document.body.setAttribute('data-theme', 'club-admin');
        return () => document.body.removeAttribute('data-theme');
    }, []);

    // Close sidebar on route change (mobile UX)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Data
    const { myClub, enforcement, loading, pendingMembersCount } = useClubAdminData(user);
    const apiState = enforcement?.state || 'normal';
    const activeIssues = enforcement?.activeIssues || 0;

    const getInitials = (name) => {
        if (!name) return 'CA';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/club-admin', icon: '📊', label: 'Home', exact: true },
        { path: '/club-admin/events', icon: '📅', label: 'Events' },
        { path: '/club-admin/members', icon: '👥', label: 'Members' },
        { path: '/club-admin/announcements', icon: '📢', label: 'Announcements' },
        { path: '/club-admin/settings', icon: '⚙️', label: 'Settings' },
    ];

    const isIssuesPage = location.pathname.includes('/club-admin/issues');
    const isBlocked = (apiState === 'locked' || apiState === 'suspended') && !isIssuesPage;

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-primary)' }}>Loading Club Admin...</div>;
    }

    return (
        <div className="ca-layout">
            {/* Mobile Overlay */}
            <div
                className={`ca-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`ca-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="ca-sidebar-header">
                    <h1 className="ca-club-name">
                        <span className="ca-club-logo">{getInitials(user?.club_name || myClub?.name || 'C')}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.club_name || myClub?.name || 'Club Admin'}
                        </span>
                    </h1>
                </div>

                <nav className="ca-sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) => `ca-nav-item ${isActive ? 'active' : ''}`}
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="ca-nav-icon">{item.icon}</span>
                                <span className="ca-nav-label">{item.label}</span>
                            </div>
                            {item.path === '/club-admin/members' && pendingMembersCount > 0 && (
                                <span style={{
                                    background: 'var(--color-danger)',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '99px',
                                    fontWeight: 700
                                }}>
                                    {pendingMembersCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Issues & Exit Link */}
                <div style={{ padding: 'var(--space-md)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <NavLink
                        to="/club-admin/issues"
                        className={`ca-nav-item ${activeIssues > 0 ? 'text-red-300' : ''}`}
                        style={{ marginBottom: '4px', ...(activeIssues > 0 ? { background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5' } : {}) }}
                    >
                        <span className="ca-nav-icon">⚠️</span>
                        <span className="ca-nav-label">Issues</span>
                        {activeIssues > 0 && (
                            <span style={{
                                marginLeft: 'auto',
                                background: 'var(--color-danger)',
                                color: 'white',
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '99px'
                            }}>
                                {activeIssues}
                            </span>
                        )}
                    </NavLink>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="ca-nav-item"
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.7)',
                            marginTop: 'var(--space-sm)',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <span className="ca-nav-icon">🔙</span>
                        <span className="ca-nav-label">Back to Dashboard</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ca-main">
                {/* Header */}
                <header className="ca-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            className="ca-mobile-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle Menu"
                        >
                            ☰
                        </button>
                        <h2 className="ca-header-title">Dashboard</h2>
                    </div>

                    <div className="ca-actions">
                        <NotificationDropdown />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={handleLogout}>
                            <div style={{
                                width: 32, height: 32,
                                background: 'var(--color-primary-light)',
                                color: 'white',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.875rem', fontWeight: 600
                            }}>
                                {getInitials(user?.full_name)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* ENFORCEMENT BANNER (Restricted State) */}
                {apiState === 'restricted' && (
                    <div className="ca-enforcement-banner restricted">
                        <span className="ca-enforcement-icon">⚠️</span>
                        <span className="ca-enforcement-text">
                            <strong>RESTRICTED:</strong> You have {activeIssues} unresolved issue(s). Event creation is disabled.
                            <a href="/club-admin/issues" className="ca-enforcement-link ms-2">Resolve Now</a>
                        </span>
                    </div>
                )}

                {/* BLOCKING OVERLAY (Locked/Suspended State) */}
                {isBlocked ? (
                    <div className="ca-content ca-focus-mode d-flex flex-column align-items-center justify-content-center text-center h-75">
                        <div style={{ marginBottom: 'var(--ca-spacing-lg)' }}>
                            <span style={{ fontSize: '4rem' }}>
                                {apiState === 'locked' ? '🔒' : '🚫'}
                            </span>
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 'var(--ca-spacing-md)', color: 'var(--ca-text)' }}>
                            {apiState === 'locked' && 'Club Operations Locked'}
                            {apiState === 'suspended' && 'Club Suspended'}
                        </h1>
                        <p style={{ fontSize: '1.125rem', color: 'var(--ca-text-muted)', marginBottom: 'var(--ca-spacing-xl)', maxWidth: '600px' }}>
                            {apiState === 'locked' && "Your club privileges have been revoked due to unresolved escalations. You cannot publish events or approve members until these are resolved."}
                            {apiState === 'suspended' && "Your club is currently inactive due to prolonged non-compliance."}
                        </p>
                        <button
                            className="ca-btn ca-btn-massive ca-btn-urgent"
                            onClick={() => navigate('/club-admin/issues')}
                        >
                            Go to Resolution Center
                        </button>
                    </div>
                ) : (
                    /* Normal Content Outlet */
                    <div className="ca-content">
                        <Outlet />
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClubAdminLayout;
