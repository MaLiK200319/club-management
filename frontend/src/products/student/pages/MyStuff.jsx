import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import BitButton from '../../../components/common/BitButton';
import BitCard from '../../../components/common/BitCard';
import BitBadge from '../../../components/common/BitBadge';
import '../student.css';

const MyStuff = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('tickets');
    const [memberships, setMemberships] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch user's memberships (clubs they're in)
            try {
                const membershipRes = await api.get('/memberships/my');
                setMemberships(membershipRes.data || []);
            } catch (err) {
                console.log('Could not fetch memberships:', err);
            }

            // Fetch user's event registrations (tickets)
            try {
                const registrationsRes = await api.get('/registrations/my');
                const allRegistrations = registrationsRes.data || [];
                const now = new Date();

                // Split into upcoming (tickets) and past events
                const upcoming = allRegistrations.filter(r => new Date(r.event_start_time || r.start_time) > now);
                const past = allRegistrations.filter(r => new Date(r.event_start_time || r.start_time) <= now);

                setTickets(upcoming);
                setPastEvents(past.slice(0, 5)); // Only show last 5 past events
            } catch (err) {
                console.log('Could not fetch registrations:', err);
            }

        } catch (error) {
            console.error('MyStuff fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    };

    const getStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
            case 'confirmed': return 'success';
            case 'pending': return 'warning';
            case 'rejected':
            case 'suspended': return 'danger';
            default: return 'bg';
        }
    };

    if (loading) {
        return <div className="p-5 text-center">Loading your stuff...</div>;
    }

    return (
        <div>
            <div className="st-header" style={{ display: 'block', paddingBottom: 'var(--space-md)' }}>
                <h1 className="st-page-title" style={{ fontSize: '1.75rem', marginBottom: 'var(--space-md)' }}>My Stuff</h1>
            </div>

            <div className="st-tabs" style={{ display: 'flex', gap: 'var(--space-sm)', padding: '0 var(--space-lg) var(--space-md)', overflowX: 'auto' }}>
                <BitButton
                    size="sm"
                    variant={activeTab === 'tickets' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('tickets')}
                >
                    My Tickets ({tickets.length})
                </BitButton>
                <BitButton
                    size="sm"
                    variant={activeTab === 'clubs' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('clubs')}
                >
                    My Clubs ({memberships.length})
                </BitButton>
                <BitButton
                    size="sm"
                    variant={activeTab === 'history' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </BitButton>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: '0 var(--space-md) var(--space-2xl)' }}>
                {activeTab === 'tickets' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {tickets.length > 0 ? (
                            tickets.map(ticket => (
                                <BitCard key={ticket.id} style={{ borderLeft: '4px solid var(--color-accent)' }}>
                                    <div style={{ padding: 'var(--space-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-md)' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    UPCOMING EVENT
                                                </div>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '4px 0', color: 'var(--text-main)' }}>
                                                    {ticket.event_title || ticket.title || 'Event'}
                                                </h3>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                    {formatDate(ticket.event_start_time || ticket.start_time)} • {formatTime(ticket.event_start_time || ticket.start_time)}
                                                </div>
                                            </div>
                                            <BitBadge label={ticket.status || 'CONFIRMED'} variant={getStatusVariant(ticket.status || 'confirmed')} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                            <Link
                                                to={`/clubs/${ticket.club_id || ticket.event?.club_id}`}
                                                style={{ flex: 1, textDecoration: 'none' }}
                                            >
                                                <BitButton variant="primary" style={{ width: '100%' }}>View Details</BitButton>
                                            </Link>
                                        </div>
                                    </div>
                                </BitCard>
                            ))
                        ) : (
                            <BitCard style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎫</div>
                                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>No Upcoming Tickets</h3>
                                <p>You haven't registered for any upcoming events yet.</p>
                                <div style={{ marginTop: 'var(--space-md)' }}>
                                    <Link to="/student/events">
                                        <BitButton variant="primary">Browse Events</BitButton>
                                    </Link>
                                </div>
                            </BitCard>
                        )}
                    </div>
                )}

                {activeTab === 'clubs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {memberships.length > 0 ? (
                            memberships.map(club => (
                                <BitCard key={club.id}>
                                    <div style={{ padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                            <div style={{
                                                width: '40px', height: '40px',
                                                background: 'var(--bg-app)',
                                                borderRadius: 'var(--radius-sm)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                                            }}>
                                                {(club.club_name || club.name || 'C').substring(0, 1)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{club.club_name || club.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    <BitBadge label={club.status} variant={getStatusVariant(club.status)} />
                                                </div>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/clubs/${club.club_id || club.id}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <BitButton variant="secondary" size="sm">View</BitButton>
                                        </Link>
                                    </div>
                                </BitCard>
                            ))
                        ) : (
                            <BitCard style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🏫</div>
                                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>No Club Memberships</h3>
                                <p>You haven't joined any clubs yet.</p>
                                <div style={{ marginTop: 'var(--space-md)' }}>
                                    <Link to="/clubs">
                                        <BitButton variant="primary">Discover Clubs</BitButton>
                                    </Link>
                                </div>
                            </BitCard>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {pastEvents.length > 0 ? (
                            pastEvents.map(event => (
                                <BitCard key={event.id}>
                                    <div style={{ padding: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{event.event_title || event.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Attended {formatDate(event.event_start_time || event.start_time)}
                                            </div>
                                        </div>
                                        <BitButton variant="secondary" size="sm">⭐ Rate</BitButton>
                                    </div>
                                </BitCard>
                            ))
                        ) : (
                            <BitCard style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📜</div>
                                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>No History Yet</h3>
                                <p>Your past events will appear here.</p>
                            </BitCard>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyStuff;
