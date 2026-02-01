import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './student.css';

const StudentLayout = () => {
    const { user } = useAuth();

    // Apply Student Theme on Mount
    useEffect(() => {
        document.body.setAttribute('data-theme', 'student');
        return () => document.body.removeAttribute('data-theme');
    }, []);

    const navItems = [
        { path: '/student/home', icon: '🏠', label: 'Home' },
        { path: '/student/events', icon: '🎫', label: 'Events' },
        { path: '/student/my-stuff', icon: '🎒', label: 'My Stuff' },
        { path: '/student/profile', icon: '👤', label: 'Profile' },
    ];

    return (
        <div className="st-layout">
            <header className="st-header">
                <div className="st-brand">ClubHub</div>
                <div className="st-user-pill">
                    {/* Placeholder for user avatar if needed later */}
                </div>
            </header>

            <main className="st-content">
                <Outlet />
            </main>

            <nav className="st-bottom-nav">
                <NavLink
                    to="/student/profile"
                    className={({ isActive }) => `st-nav-item ${isActive ? 'active' : ''}`}
                >
                    <span className="st-nav-icon">👤</span>
                    <span>Profile</span>
                </NavLink>
            </nav>
        </div>
    );
};

export default StudentLayout;
