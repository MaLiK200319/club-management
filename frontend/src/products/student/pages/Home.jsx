import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';
import '../student.css';

const StudentHome = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [clubs, setClubs] = useState([]);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            setLoading(true);
            const [eventsRes, clubsRes] = await Promise.all([
                api.get('/events'),
                api.get('/clubs')
            ]);

            // Filter future events
            const allEvents = eventsRes.data || [];
            const upcoming = allEvents
                .filter(e => new Date(e.start_time) > new Date() && e.status === 'published')
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                .slice(0, 5);

            setEvents(upcoming);
            setClubs((clubsRes.data || []).slice(0, 6));

            // Fetch announcements from user's memberships
            try {
                const membershipRes = await api.get('/memberships/my');
                const memberships = membershipRes.data || [];
                const clubIds = memberships
                    .filter(m => m.status === 'approved')
                    .map(m => m.club_id);

                if (clubIds.length > 0) {
                    const announcementPromises = clubIds.slice(0, 3).map(clubId =>
                        api.get(`/clubs/${clubId}/announcements`).catch(() => ({ data: [] }))
                    );
                    const announcementResults = await Promise.all(announcementPromises);
                    const allAnnouncements = announcementResults
                        .flatMap((res, idx) => (res.data || []).map(a => ({
                            ...a,
                            club_name: memberships.find(m => m.club_id === clubIds[idx])?.club_name || 'Club'
                        })))
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 5);
                    setAnnouncements(allAnnouncements);
                }
            } catch (err) {
                console.log('Could not fetch announcements:', err);
            }

        } catch (error) {
            console.error("Feed error", error);
        } finally {
            setLoading(false);
        }
    };

    const getTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours} hours ago`;
        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    if (loading) return <div className="p-5 text-center">Loading your feed...</div>;

    const featuredEvent = events[0];
    const otherEvents = events.slice(1);

    return (
        <div>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 className="st-page-title">{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}! 👋</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-h3)' }}>Ready to explore what's happening?</p>
            </header>

            {/* Featured Event */}
            {featuredEvent && (
                <section style={{ marginBottom: 'var(--space-2xl)' }}>
                    <div className="st-section-title">🔥 Happening Soon</div>

                    <BitCard className="st-event-card-lg" style={{ padding: 0 }}>
                        <div style={{ padding: 'var(--space-lg)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                            <div style={{
                                fontSize: '3rem',
                                background: 'var(--bg-app)',
                                padding: 'var(--space-md)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                🎉
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                    <span style={{
                                        textTransform: 'uppercase',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: 'var(--color-primary)'
                                    }}>
                                        {new Date(featuredEvent.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <BitBadge label="Featured" variant="info" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-xs)' }}>
                                    {featuredEvent.title}
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                                    {featuredEvent.description?.substring(0, 80) || 'Join us for this exciting event!'}...
                                </p>
                                <Link to={`/clubs/${featuredEvent.club_id}`}>
                                    <BitButton variant="primary">View Details</BitButton>
                                </Link>
                            </div>
                        </div>
                    </BitCard>
                </section>
            )}

            {/* Horizontal Scroll Events */}
            {otherEvents.length > 0 && (
                <section style={{ marginBottom: 'var(--space-2xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                        <h2 className="st-section-title" style={{ margin: 0 }}>More Events</h2>
                        <Link to="/student/events" style={{ color: 'var(--color-primary)' }}>See All</Link>
                    </div>

                    <div className="st-scroll-container" style={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: 'var(--space-md)',
                        paddingBottom: 'var(--space-sm)'
                    }}>
                        {otherEvents.map(event => (
                            <BitCard key={event.id} style={{ minWidth: '200px' }} clickable>
                                <Link to={`/clubs/${event.club_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{
                                        height: '100px',
                                        background: 'var(--bg-app)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2rem',
                                        marginBottom: 'var(--space-md)'
                                    }}>
                                        📅
                                    </div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                                        {event.title}
                                    </h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </Link>
                            </BitCard>
                        ))}
                    </div>
                </section>
            )}

            {/* Club Updates / Announcements */}
            <section style={{ marginBottom: 'var(--space-2xl)' }}>
                <h2 className="st-section-title">📢 From Your Clubs</h2>
                {announcements.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {announcements.map(ann => (
                            <BitCard key={ann.id}>
                                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                    <div style={{
                                        width: '40px', height: '40px',
                                        background: 'var(--bg-app)',
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, color: 'var(--text-muted)'
                                    }}>
                                        {(ann.club_name || 'C').substring(0, 1)}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                                            <span style={{ fontWeight: 600 }}>{ann.club_name || 'Club'}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {getTimeAgo(ann.created_at)}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{ann.content || ann.message}</div>
                                    </div>
                                </div>
                            </BitCard>
                        ))}
                    </div>
                ) : (
                    <BitCard style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                            Join clubs to see their announcements here!
                        </p>
                        <Link to="/student/my-stuff">
                            <BitButton variant="secondary">Browse Clubs</BitButton>
                        </Link>
                    </BitCard>
                )}
            </section>

            {/* Discover Clubs */}
            <section style={{ marginBottom: 'var(--space-2xl)' }}>
                <h2 className="st-section-title">🌟 Discover Clubs</h2>
                {clubs.length > 0 ? (
                    <div className="st-scroll-container" style={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: 'var(--space-md)',
                        paddingBottom: 'var(--space-sm)'
                    }}>
                        {clubs.map(club => (
                            <Link key={club.id} to={`/clubs/${club.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <BitCard style={{ minWidth: '180px' }} clickable>
                                    <div style={{
                                        height: '80px',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2rem',
                                        marginBottom: 'var(--space-md)'
                                    }}>
                                        {club.name?.substring(0, 1) || '🏫'}
                                    </div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-xs)' }}>{club.name}</h4>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {club.member_count || 0} members
                                    </div>
                                </BitCard>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <BitCard style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🚀</div>
                        <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>Find Your Community</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                            Join over 50+ student organizations on campus.
                        </p>
                        <Link to="/clubs">
                            <BitButton variant="secondary">Browse Clubs</BitButton>
                        </Link>
                    </BitCard>
                )}
            </section>

        </div>
    );
};

export default StudentHome;
