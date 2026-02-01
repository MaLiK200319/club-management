import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './super-admin.css';

const SuperAdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Apply Super Admin Theme
    useEffect(() => {
        document.body.setAttribute('data-theme', 'super-admin');
        return () => document.body.removeAttribute('data-theme');
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin/dashboard', label: 'Dashboard' },
        { path: '/admin/clubs', label: 'Clubs' },
        { path: '/admin/users', label: 'Users' },
        { path: '/admin/governance', label: 'System' },
    ];

    return (
        <div className="sa-layout">
            {/* Top Navigation / Authority Header */}
            <header className="sa-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        className="sa-mobile-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        ☰
                    </button>
                    <div className="sa-brand">
                        <span className="sa-brand-icon">⚡</span>
                        <span>Institute Admin</span>
                    </div>
                </div>

                <nav className={`sa-nav ${mobileMenuOpen ? 'open' : ''}`}>
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sa-nav-item ${isActive ? 'active' : ''}`}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                    {/* Mobile Only Logout in Nav */}
                    <button
                        className="sa-nav-item"
                        onClick={handleLogout}
                        style={{ display: mobileMenuOpen ? 'block' : 'none', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#ffaaa5' }}
                    >
                        Logout
                    </button>
                </nav>

                <div className="sa-user-menu">
                    <button className="sa-nav-item" onClick={() => navigate('/')}>
                        Exit to Site
                    </button>
                    <button className="sa-nav-item active" style={{ background: '#EF4444', borderColor: '#EF4444' }} onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="sa-container">
                <Outlet />
            </main>
        </div>
    );
};

export default SuperAdminLayout;
