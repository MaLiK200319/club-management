import React, { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="modern-navbar">
            <div className="container navbar-container">
                <Link className="navbar-brand-modern" to="/">
                    <div className="brand-logo">CM</div>
                    <span className="brand-text">ClubManager</span>
                </Link>

                <button
                    className="mobile-menu-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
                    <ul className="navbar-nav-modern">
                        <li className="nav-item-modern">
                            <Link
                                className={`nav-link-modern ${isActive('/') ? 'active' : ''}`}
                                to="/"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Home
                            </Link>
                        </li>
                        <li className="nav-item-modern">
                            <Link
                                className={`nav-link-modern ${isActive('/clubs') ? 'active' : ''}`}
                                to="/clubs"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Clubs
                            </Link>
                        </li>
                        {user && (
                            <li className="nav-item-modern">
                                <Link
                                    className={`nav-link-modern ${isActive('/dashboard') ? 'active' : ''}`}
                                    to="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                            </li>
                        )}
                    </ul>

                    <div className="navbar-actions">
                        {user ? (
                            <div className="user-section d-flex align-items-center">
                                <NotificationDropdown />
                                <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                                    <div className="user-avatar">
                                        {user.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="user-details">
                                        <span className="user-name">{user.full_name}</span>
                                        <span className="user-role">{user.role}</span>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="btn-logout">
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="auth-buttons">
                                <Link to="/login" className="btn-nav-secondary">Login</Link>
                                <Link to="/register" className="btn-nav-primary">Get Started</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
