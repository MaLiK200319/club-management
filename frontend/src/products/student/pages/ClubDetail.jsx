import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import '../student.css';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import api from '../../../services/api';
import EventFeedback from '../components/EventFeedback';
import CreateAnnouncementModal from '../../club-admin/components/CreateAnnouncementModal';
import BitButton from '../../../components/common/BitButton';
import './ClubDetail.css';

const ClubDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const { addToast } = useContext(ToastContext);
    const navigate = useNavigate();
    const [club, setClub] = useState(null);
    const [events, setEvents] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [members, setMembers] = useState([]);
    const [membershipStatus, setMembershipStatus] = useState(null); // 'approved', 'pending', or null
    const [membershipRole, setMembershipRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('about'); // about, events, announcements, members
    const [showAnnModal, setShowAnnModal] = useState(false);
    // newAnn state removed (handled in modal)
    const [selectedEventForFeedback, setSelectedEventForFeedback] = useState(null);

    useEffect(() => {
        fetchClubDetails();
    }, [id]);

    const fetchClubDetails = async () => {
        try {
            const requests = [
                api.get(`/clubs/${id}`),
                api.get(`/events/club/${id}`),
                api.get(`/clubs/${id}/announcements`)
            ];

            if (user) {
                requests.push(api.get(`/clubs/${id}/membership-status/${user.id}`));
            }

            const responses = await Promise.all(requests);

            setClub(responses[0].data);
            setEvents(responses[1].data);
            setAnnouncements(responses[2].data);

            if (user && responses[3]) {
                const statusData = responses[3].data;
                setMembershipStatus(statusData.status);
                setMembershipRole(statusData.role);
            }

            // Fetch members if status is approved or user is admin
            if (user && (user.role === 'admin' || (responses[3] && responses[3].data.status === 'approved'))) {
                const membersRes = await api.get(`/clubs/${id}/members`);
                setMembers(membersRes.data);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching club details:', error);
            setLoading(false);
        }
    };

    // handleCreateAnnouncement moved to Modal Component

    const handleDeleteAnnouncement = async (annId) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;

        try {
            await api.delete(`/announcements/${annId}`);
            addToast('Announcement deleted successfully', 'success');
            fetchClubDetails();
        } catch (error) {
            addToast('Failed to delete announcement', 'error');
        }
    };

    const handleJoinClub = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setActionLoading(true);
        try {
            await api.post(`/clubs/${id}/join`);
            addToast('Membership request sent! Waiting for approval.', 'success');
            fetchClubDetails();
        } catch (error) {
            addToast(error.response?.data?.message || 'Failed to join club', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeaveClub = async () => {
        if (!window.confirm('Are you sure you want to leave this club?')) return;

        setActionLoading(true);
        try {
            await api.delete(`/clubs/${id}/leave`);
            addToast('You have left the club', 'info');
            fetchClubDetails();
        } catch (error) {
            addToast(error.response?.data?.message || 'Failed to leave club', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRegisterEvent = async (eventId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const response = await api.post(`/events/${eventId}/register`);
            addToast(response.data.message, 'success');
            fetchClubDetails(); // Refresh data
        } catch (error) {
            addToast(error.response?.data?.message || 'Registration failed', 'error');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="club-detail-page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading club...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!club) {
        return (
            <div className="club-detail-page">
                <div className="container">
                    <div className="empty-state">
                        <h2>Club not found</h2>
                        <BitButton onClick={() => navigate('/clubs')}>
                            Back to Clubs
                        </BitButton>
                    </div>
                </div>
            </div>
        );
    }

    const getCategoryIcon = (category) => {
        const icons = {
            'Technology': '💻',
            'Arts': '🎨',
            'Sports': '⚽',
            'Business': '💼',
            'Environment': '🌱',
        };
        return icons[category] || '🎯';
    };

    const handleFollowClub = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setActionLoading(true);
        try {
            await api.post(`/clubs/${id}/follow`);
            setClub(prev => ({ ...prev, is_following: true, follower_count: prev.follower_count + 1 }));
            addToast('Club followed!', 'success');
        } catch (error) {
            addToast(error.response?.data?.message || 'Failed to follow club', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfollowClub = async () => {
        setActionLoading(true);
        try {
            await api.post(`/clubs/${id}/unfollow`);
            setClub(prev => ({ ...prev, is_following: false, follower_count: prev.follower_count - 1 }));
            addToast('Club unfollowed', 'info');
        } catch (error) {
            addToast(error.response?.data?.message || 'Failed to unfollow club', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ... existing join/leave handlers ...

    return (
        <div className="club-detail-page">
            {/* Hero Section */}
            <div className="club-hero">
                <div className="club-hero-overlay"></div>
                <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10 }}>
                    <Link to="/clubs" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <span>←</span> Back to Clubs
                    </Link>
                </div>
                <div className="container club-hero-content">
                    <div className="club-icon-large">
                        {getCategoryIcon(club.category)}
                    </div>
                    <h1 className="club-name-hero">{club.name}</h1>
                    <div className="club-meta-hero">
                        <span className="club-category-badge">{club.category}</span>
                        <span className="club-members-badge">
                            👥 {club.member_count} members
                        </span>
                        <span className="club-followers-badge">
                            🔔 {club.follower_count} followers
                        </span>
                        {membershipStatus === 'approved' && (
                            <span className="membership-role-badge">
                                🛡️ {membershipRole || 'Member'}
                            </span>
                        )}
                    </div>

                    <div className="club-actions-hero">
                        {!user ? (
                            <BitButton onClick={() => navigate('/login')}>
                                Login to Join
                            </BitButton>
                        ) : (
                            <>
                                {/* Follow Button */}
                                {club.is_following ? (
                                    <BitButton
                                        variant="secondary"
                                        onClick={handleUnfollowClub}
                                        isLoading={actionLoading}
                                    >
                                        🔕 Unfollow
                                    </BitButton>
                                ) : (
                                    <BitButton
                                        variant="secondary"
                                        onClick={handleFollowClub}
                                        isLoading={actionLoading}
                                    >
                                        🔔 Follow
                                    </BitButton>
                                )}

                                {!membershipStatus && (
                                    <BitButton
                                        onClick={handleJoinClub}
                                        isLoading={actionLoading}
                                    >
                                        Join Club
                                    </BitButton>
                                )}
                                {membershipStatus === 'pending' && (
                                    <BitButton variant="secondary" disabled>
                                        ⌛ Request Pending
                                    </BitButton>
                                )}
                                {membershipStatus === 'approved' && (
                                    <div className="membership-actions">
                                        <BitButton
                                            variant="danger"
                                            onClick={handleLeaveClub}
                                            isLoading={actionLoading}
                                        >
                                            Leave Club
                                        </BitButton>
                                        {(membershipRole === 'admin' || membershipRole === 'moderator' || user.role === 'admin') && (
                                            <BitButton
                                                variant="secondary"
                                                onClick={() => navigate(`/clubs/${id}/manage-members`)}
                                            >
                                                ⚙️ Manage Club
                                            </BitButton>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="club-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
                        onClick={() => setActiveTab('about')}
                    >
                        About
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        Events
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
                        onClick={() => setActiveTab('announcements')}
                    >
                        Announcements
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        Members
                    </button>
                </div>
            </div>

            <div className="container club-content">
                {activeTab === 'about' && (
                    <section className="club-section animate-up">
                        <h2 className="section-title">About This Club</h2>
                        <p className="club-description-full">{club.description}</p>
                        {club.contact_email && (
                            <div className="club-contact">
                                <strong>Contact:</strong> <a href={`mailto:${club.contact_email}`}>{club.contact_email}</a>
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'events' && (
                    <section className="club-section animate-up">
                        <h2 className="section-title">Upcoming Events</h2>
                        {events.length === 0 ? (
                            <div className="no-events">
                                <p>No upcoming events scheduled yet. Check back soon!</p>
                            </div>
                        ) : (
                            <div className="events-grid-detail">
                                {events.map(event => (
                                    <div key={event.id} className="event-card-detail">
                                        <div className="event-header-detail">
                                            <div className="event-date-small">
                                                <div className="month">{new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}</div>
                                                <div className="day">{new Date(event.start_time).getDate()}</div>
                                            </div>
                                            <div className="event-info-detail">
                                                <h3>{event.title}</h3>
                                                <p className="event-time">{formatDate(event.start_time)}</p>
                                            </div>
                                        </div>
                                        <p className="event-desc">{event.description?.substring(0, 150)}...</p>
                                        <div className="event-footer-detail">
                                            <div className="event-capacity">
                                                <span>📍 {event.location}</span>
                                                <span>👥 {event.registration_count || 0}/{event.capacity || '∞'}</span>
                                            </div>
                                            {user ? (
                                                event.is_registered ? (
                                                    new Date(event.start_time) < new Date() ? (
                                                        <BitButton onClick={() => setSelectedEventForFeedback(event)}>
                                                            Feedback
                                                        </BitButton>
                                                    ) : (
                                                        <BitButton variant="secondary" disabled style={{ background: '#dcfce7', color: '#16a34a', borderColor: 'transparent' }}>
                                                            Registered
                                                        </BitButton>
                                                    )
                                                ) : (event.registration_deadline && new Date(event.registration_deadline) < new Date()) ? (
                                                    <BitButton variant="secondary" disabled>
                                                        Deadline Passed
                                                    </BitButton>
                                                ) : event.is_full ? (
                                                    <BitButton variant="secondary" disabled>
                                                        Event Full
                                                    </BitButton>
                                                ) : (
                                                    <BitButton
                                                        onClick={() => handleRegisterEvent(event.id)}
                                                    >
                                                        Register Now
                                                    </BitButton>
                                                )
                                            ) : (
                                                <BitButton
                                                    onClick={() => navigate('/login')}
                                                >
                                                    Login to Register
                                                </BitButton>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'announcements' && (
                    <section className="club-section animate-up">
                        <div className="section-header-flex">
                            <h2 className="section-title">Announcements</h2>
                            {(membershipRole === 'admin' || membershipRole === 'moderator' || user?.role === 'admin') && (
                                <BitButton size="sm" onClick={() => setShowAnnModal(true)}>
                                    Create Announcement
                                </BitButton>
                            )}
                        </div>
                        {announcements.length === 0 ? (
                            <div className="no-events">
                                <p>No announcements yet.</p>
                            </div>
                        ) : (
                            <div className="announcements-list">
                                {announcements.map(ann => (
                                    <div key={ann.id} className={`announcement-card ${ann.priority}`}>
                                        <div className="ann-header">
                                            <span className="ann-date">{new Date(ann.created_at).toLocaleDateString()}</span>
                                            <div className="ann-badges">
                                                {ann.priority === 'high' && <span className="ann-priority-badge">High Priority</span>}
                                                {(membershipRole === 'admin' || membershipRole === 'moderator' || user?.role === 'admin') && (
                                                    <div style={{ cursor: 'pointer' }} onClick={() => handleDeleteAnnouncement(ann.id)}>🗑️</div>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="ann-title">{ann.title}</h3>
                                        <p className="ann-content">{ann.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'members' && (
                    <section className="club-section animate-up">
                        <h2 className="section-title">Club Members</h2>
                        {!user || (membershipStatus !== 'approved' && user.role !== 'admin') ? (
                            <div className="locked-content">
                                <div className="lock-icon">🔒</div>
                                <p>Join this club to see its members.</p>
                                {!user && <BitButton onClick={() => navigate('/login')}>Login to Join</BitButton>}
                                {user && !membershipStatus && <BitButton onClick={handleJoinClub}>Join Club</BitButton>}
                            </div>
                        ) : members.length === 0 ? (
                            <p>No members yet.</p>
                        ) : (
                            <div className="members-grid-custom">
                                {members.map(member => (
                                    <div key={member.membership_id} className="member-card-custom" onClick={() => navigate(`/profile/${member.user_id}`)}>
                                        <div className="member-avatar-sm">
                                            {member.avatar_url ? (
                                                <img src={`http://localhost/stage_raed/backend${member.avatar_url}`} alt={member.full_name} />
                                            ) : (
                                                member.full_name?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        <div className="member-info-sm">
                                            <div className="member-name-sm">{member.full_name}</div>
                                            <div className="member-role-sm">{member.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            {/* Announcement Modal */}
            {showAnnModal && (
                <CreateAnnouncementModal
                    clubId={id}
                    onClose={() => setShowAnnModal(false)}
                    onSuccess={() => {
                        addToast('Announcement created!', 'success');
                        fetchClubDetails();
                    }}
                />
            )}

            {/* Feedback Modal */}
            {selectedEventForFeedback && (
                <EventFeedback
                    eventId={selectedEventForFeedback.id}
                    onClose={() => setSelectedEventForFeedback(null)}
                    onFeedbackSubmitted={fetchClubDetails}
                />
            )}
        </div>
    );
};

export default ClubDetail;
