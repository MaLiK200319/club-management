import React, { useContext, useState, useRef, useEffect } from 'react';
import { NotificationContext } from '../context/NotificationContext';
import { Link } from 'react-router-dom';

const NotificationDropdown = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useContext(NotificationContext);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read_at) {
            markAsRead(notification.id);
        }
        setIsOpen(false);
    };

    return (
        <div className="notification-dropdown-container" ref={dropdownRef} style={{ position: 'relative', marginRight: '15px' }}>
            <button
                onClick={toggleDropdown}
                className="btn-icon"
                style={{
                    background: 'none',
                    border: 'none',
                    position: 'relative',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: '#333'
                }}
                aria-label="Notifications"
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: '#e74c3c',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="dropdown-menu show" style={{
                    position: 'absolute',
                    right: '0',
                    top: '100%',
                    width: '320px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: 'none',
                    borderRadius: '8px',
                    zIndex: 1000
                }}>
                    <div className="dropdown-header d-flex justify-content-between align-items-center p-3 border-bottom">
                        <h6 className="m-0 fw-bold">Notifications</h6>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="btn btn-sm btn-link text-decoration-none p-0"
                                style={{ fontSize: '0.8rem' }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted">
                                <small>No notifications yet</small>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item p-3 border-bottom ${!notification.read_at ? 'bg-light' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                >
                                    <div className="d-flex w-100 justify-content-between">
                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                            {new Date(notification.created_at).toLocaleDateString()}
                                        </small>
                                        {!notification.read_at && <span className="badge bg-primary rounded-pill" style={{ width: '8px', height: '8px', padding: 0 }}> </span>}
                                    </div>
                                    <p className="mb-1 text-dark" style={{ fontSize: '0.9rem' }}>{notification.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
