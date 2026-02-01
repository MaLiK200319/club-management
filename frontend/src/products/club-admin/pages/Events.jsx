import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const ClubAdminEvents = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState({ upcoming: [], needsAttention: [], past: [] });
    const [enforcementBlocked, setEnforcementBlocked] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/clubs/${user.club_id}/events`);
            const allEvents = Array.isArray(response.data) ? response.data : (response.data?.events || []);

            const now = new Date();
            const upcoming = [];
            const needsAttention = [];
            const past = [];

            allEvents.forEach(event => {
                const eventDate = new Date(event.start_time);
                if (event.status === 'cancelled') {
                    // Skip cancelled events
                } else if (eventDate > now) {
                    upcoming.push(event);
                } else {
                    // Check if needs attention (low rating)
                    if (event.avg_rating && event.avg_rating < 3.5) {
                        needsAttention.push(event);
                    } else {
                        past.push(event);
                    }
                }
            });

            // Sort upcoming by date
            upcoming.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            past.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

            setEvents({ upcoming, needsAttention, past: past.slice(0, 5) });
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return {
            day: date.getDate(),
            month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
            time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'published': return 'success';
            case 'closed': return 'info';
            case 'cancelled': return 'danger';
            case 'draft':
            default: return 'bg';
        }
    };

    const handleStatusChange = async (eventId, newStatus) => {
        try {
            await api.put(`/events/${eventId}/status`, { status: newStatus });
            fetchEvents();
        } catch (error) {
            if (error.response?.status === 403) {
                // Enforcement blocked
                alert(error.response.data.message || 'Action blocked');
            } else {
                console.error('Error updating status:', error);
            }
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>⏳</div>
                <div>Loading events...</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <div>
                    <h1 className="ca-header-title">My Events</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your club's schedule</p>
                </div>
                {enforcementBlocked ? (
                    <BitButton disabled variant="secondary">Create Event (Disabled)</BitButton>
                ) : (
                    <Link to="/club-admin/events/new">
                        <BitButton variant="primary">+ Create Event</BitButton>
                    </Link>
                )}
            </div>

            {/* Upcoming Events */}
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-main)' }}>📅 Upcoming</div>
            {events.upcoming.length === 0 ? (
                <BitCard style={{ marginBottom: 'var(--space-xl)', textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>📭</div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>No upcoming events</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Create your first event to get started</p>
                    <Link to="/club-admin/events/new">
                        <BitButton variant="primary">Create Event</BitButton>
                    </Link>
                </BitCard>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                    {events.upcoming.map(event => {
                        const date = formatDate(event.start_time);
                        return (
                            <BitCard key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
                                <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{date.day}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{date.month}</div>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 var(--space-xs)', color: 'var(--text-main)' }}>{event.title}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        <span>{date.time}</span>
                                        <span>•</span>
                                        <span>{event.registration_count || 0}/{event.capacity || '∞'} registered</span>
                                        <BitBadge label={event.status} variant={getStatusVariant(event.status)} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    <BitButton variant="secondary" size="sm" onClick={() => navigate(`/events/${event.id}`)}>
                                        View
                                    </BitButton>
                                    {event.status === 'draft' && (
                                        <BitButton variant="primary" size="sm" onClick={() => handleStatusChange(event.id, 'published')}>
                                            Publish
                                        </BitButton>
                                    )}
                                    {event.status === 'published' && (
                                        <BitButton variant="danger" size="sm" onClick={() => handleStatusChange(event.id, 'cancelled')}>
                                            Cancel
                                        </BitButton>
                                    )}
                                </div>
                            </BitCard>
                        );
                    })}
                </div>
            )}

            {/* Needs Attention */}
            {events.needsAttention.length > 0 && (
                <>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--color-warning)' }}>⚠️ Needs Attention</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                        {events.needsAttention.map(event => {
                            const date = formatDate(event.start_time);
                            return (
                                <BitCard key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', borderLeft: '4px solid var(--color-warning)' }}>
                                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)', lineHeight: 1 }}>{date.day}</div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{date.month}</div>
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 var(--space-xs)', color: 'var(--text-main)' }}>{event.title}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                            <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                                                ⚠️ Rating: {event.avg_rating?.toFixed(1) || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <BitButton variant="secondary" size="sm">Feedback</BitButton>
                                    </div>
                                </BitCard>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Past Events */}
            {events.past.length > 0 && (
                <>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-main)' }}>✅ Completed</div>
                    <BitCard>
                        {events.past.map((event, index) => {
                            const date = formatDate(event.start_time);
                            return (
                                <div key={event.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: 'var(--space-md)',
                                    borderBottom: index !== events.past.length - 1 ? '1px solid var(--border-light)' : 'none'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{event.title}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            {date.month} {date.day} • ★ {event.avg_rating?.toFixed(1) || 'N/A'} • {event.registration_count || 0} attended
                                        </div>
                                    </div>
                                    <BitButton variant="secondary" size="sm" onClick={() => navigate(`/events/${event.id}`)}>
                                        Details
                                    </BitButton>
                                </div>
                            );
                        })}
                    </BitCard>
                </>
            )}
        </div>
    );
};

export default ClubAdminEvents;
