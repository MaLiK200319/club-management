import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api'; // Direct API for custom fetches if needed
import { clubService, eventService, announcementService } from '../../services/apiService';
import useClubAdminData from '../../products/club-admin/hooks/useClubAdminData';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Data States
    const [events, setEvents] = useState([]);
    const [followedClubs, setFollowedClubs] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    // myClub comes from hook now
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    // Custom Hook for Club Admin
    const { myClub, loading: clubLoading } = useClubAdminData(user);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, myClub]); // Re-fetch if myClub loads

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            if (user.role === 'student') {
                // ... (existing student logic) ...
                const [eventsRes, clubsRes, annRes] = await Promise.all([
                    eventService.getUserEvents(user.id),
                    clubService.getFollowedClubs(user.id),
                    announcementService.getRecent(5)
                ]);
                setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
                setFollowedClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);
                setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);

            } else if (user.role === 'club_admin') {
                // Fetch: My Club Data (Dependencies: myClub from hook)
                if (myClub) {
                    const [eventsRes, membersRes] = await Promise.all([
                        eventService.getByClub(myClub.id),
                        api.get(`/clubs/${myClub.id}/pending-members`)
                    ]);

                    setEvents(eventsRes.data);
                    setStats({
                        pendingMembers: membersRes.data.length,
                        activeEvents: eventsRes.data.filter(e => new Date(e.start_time) > new Date()).length
                    });
                } else if (!clubLoading) {
                    // Fallback if club_id missing but loading done
                    // console.warn("Club Admin has no club linked");
                }

            } else if (user.role === 'super_admin' || user.role === 'admin') {
                // Fetch: System Stats
                const [eventsRes, clubsRes] = await Promise.all([
                    eventService.getAll(),
                    clubService.getAllForAdmin()
                ]);
                setStats({
                    events: eventsRes.data.length,
                    clubs: clubsRes.data.length,
                    activeClubs: clubsRes.data.filter(c => c.status === 'active').length
                });
                setEvents(eventsRes.data.slice(0, 5)); // Recent events
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="container">
                <div className="dashboard-header">
                    <div className="user-welcome">
                        <div className="user-avatar-large">
                            {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h1 className="dashboard-title">Welcome back, {user.full_name}!</h1>
                            <span className="user-role-badge">{user.role}</span>
                        </div>
                    </div>
                </div>

                {/* STUDENT DASHBOARD */}
                {user.role === 'student' && (
                    <div className="dashboard-content">
                        {/* Followed Clubs */}
                        <div className="section-header">
                            <h2>My Followed Clubs</h2>
                            <Link to="/clubs" className="btn-action-secondary">Explore Clubs</Link>
                        </div>
                        {followedClubs.length === 0 ? (
                            <div className="empty-horizontal">
                                <p>You aren't following any clubs yet.</p>
                            </div>
                        ) : (
                            <div className="clubs-grid-sm">
                                {followedClubs.map(club => (
                                    <Link to={`/clubs/${club.id}`} key={club.id} className="club-card-sm">
                                        <div className="club-logo-sm">
                                            {club.logo_url ? <img src={club.logo_url} alt="" /> : '🏛️'}
                                        </div>
                                        <div className="club-name-sm">{club.name}</div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Registered Events */}
                        <div className="section-header" style={{ marginTop: '2rem' }}>
                            <h2>My Upcoming Events</h2>
                        </div>
                        {events.length === 0 ? (
                            <div className="empty-state-card">
                                <div className="empty-icon">📅</div>
                                <h3>No Events Yet</h3>
                                <p>Register for events to track them here!</p>
                            </div>
                        ) : (
                            <div className="events-list">
                                {events.map(event => (
                                    <div key={event.id} className="event-card-dash">
                                        <div className="event-date-badge">
                                            <div className="month">{new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}</div>
                                            <div className="day">{new Date(event.start_time).getDate()}</div>
                                        </div>
                                        <div className="event-details">
                                            <h3 className="event-title">{event.title}</h3>
                                            <div className="event-meta">
                                                <span>📍 {event.location}</span>
                                                <span>🕐 {formatDate(event.start_time)}</span>
                                            </div>
                                        </div>
                                        <div className="event-actions">
                                            <span className="status-registered">✓ Registered</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Announcements */}
                        <div className="section-header" style={{ marginTop: '2rem' }}>
                            <h2>Latest News</h2>
                        </div>
                        <div className="dash-announcements">
                            {announcements.length === 0 ? (
                                <p>No recent announcements.</p>
                            ) : (
                                announcements.map(ann => (
                                    <div key={ann.id} className={`dash-ann-card ${ann.priority}`}>
                                        <div className="dash-ann-header">
                                            <span className="ann-club-name">{ann.club_name}</span>
                                            <span className="ann-date-sm">{new Date(ann.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="ann-title-sm">{ann.title}</h4>
                                        <p className="ann-preview-sm">{ann.content.substring(0, 80)}...</p>
                                        <Link to={`/clubs/${ann.club_id}`} className="ann-link-sm">Read More</Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* CLUB ADMIN DASHBOARD */}
                {user.role === 'club_admin' && (
                    <div className="dashboard-content">
                        {!myClub ? (
                            <div className="error-state">
                                <h3>No Club Linked</h3>
                                <p>You are a Club Admin but no club is linked to your account. Please contact Super Admin.</p>
                            </div>
                        ) : (
                            <>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-icon">👥</div>
                                        <div className="stat-value">{myClub.member_count}</div>
                                        <div className="stat-label">Members</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">🔔</div>
                                        <div className="stat-value">{myClub.follower_count}</div>
                                        <div className="stat-label">Followers</div>
                                    </div>
                                    <div className="stat-card warning">
                                        <div className="stat-icon">⌛</div>
                                        <div className="stat-value">{stats.pendingMembers}</div>
                                        <div className="stat-label">Pending Requests</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">📅</div>
                                        <div className="stat-value">{stats.activeEvents}</div>
                                        <div className="stat-label">Active Events</div>
                                    </div>
                                </div>

                                <div className="admin-actions">
                                    <Link to={`/club-admin/members`} className="admin-action-card">
                                        <div className="action-icon">👥</div>
                                        <div className="action-text">
                                            <h3>Manage Members</h3>
                                            <p>Approve join requests</p>
                                        </div>
                                    </Link>
                                    <Link to="/club-admin/events/new" className="admin-action-card">
                                        <div className="action-icon">➕</div>
                                        <div className="action-text">
                                            <h3>Create Event</h3>
                                            <p>Host a new activity</p>
                                        </div>
                                    </Link>
                                    <Link to="/club-admin/events" className="admin-action-card">
                                        <div className="action-icon">📅</div>
                                        <div className="action-text">
                                            <h3>Manage Events</h3>
                                            <p>Edit & Publish events</p>
                                        </div>
                                    </Link>
                                    <div className="admin-action-card" onClick={() => navigate(`/clubs/${myClub.id}`)}>
                                        <div className="action-icon">🏛️</div>
                                        <div className="action-text">
                                            <h3>View Club Page</h3>
                                            <p>See how it looks publicly</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="section-header">
                                    <h2>Upcoming Events</h2>
                                </div>
                                <div className="events-list">
                                    {events.map(event => (
                                        <div key={event.id} className="event-card-dash">
                                            <div className="event-details">
                                                <h3 className="event-title">{event.title}</h3>
                                                <div className="event-meta">
                                                    <span>{new Date(event.start_time).toLocaleDateString()}</span>
                                                    <span>{event.registration_count} / {event.capacity || '∞'} Registrations</span>
                                                </div>
                                            </div>
                                            <div className="event-actions">
                                                <span className={`status-badge ${event.status}`}>{event.status}</span>
                                                {event.status === 'draft' && (
                                                    <button
                                                        className="btn-publish-sm"
                                                        onClick={async () => {
                                                            if (window.confirm('Publish this event?')) {
                                                                await api.put(`/events/${event.id}/status`, { status: 'published' });
                                                                fetchDashboardData();
                                                            }
                                                        }}
                                                    >
                                                        Publish
                                                    </button>
                                                )}
                                                <Link to="/club-admin/events" className="btn-manage-sm">View All</Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* SUPER ADMIN DASHBOARD */}
                {(user.role === 'super_admin' || user.role === 'admin') && (
                    <div className="dashboard-content">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon">🏛️</div>
                                <div className="stat-value">{stats.clubs}</div>
                                <div className="stat-label">Total Clubs</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">📅</div>
                                <div className="stat-value">{stats.events}</div>
                                <div className="stat-label">Total Events</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon">✅</div>
                                <div className="stat-value">{stats.activeClubs}</div>
                                <div className="stat-label">Active Clubs</div>
                            </div>
                        </div>

                        <div className="admin-actions">
                            <Link to="/admin/clubs/create" className="admin-action-card">
                                <div className="action-icon">➕</div>
                                <div className="action-text">
                                    <h3>Create New Club</h3>
                                    <p>Launch a new organization</p>
                                </div>
                            </Link>
                            <Link to="/admin/clubs" className="admin-action-card">
                                <div className="action-icon">⚙️</div>
                                <div className="action-text">
                                    <h3>Manage Clubs</h3>
                                    <p>Oversee all clubs</p>
                                </div>
                            </Link>
                            <Link to="/admin/users" className="admin-action-card">
                                <div className="action-icon">👥</div>
                                <div className="action-text">
                                    <h3>User Management</h3>
                                    <p>Find students & admins</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
