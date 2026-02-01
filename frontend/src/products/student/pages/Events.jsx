import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import '../student.css';

const StudentEvents = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        filterEvents();
    }, [events, filter, searchQuery]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await api.get('/events');
            const allEvents = response.data || [];
            // Only show future published events
            setEvents(
                allEvents
                    .filter(e => new Date(e.start_time) > new Date() && e.status === 'published')
                    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            );
        } catch (error) {
            console.error("Events fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    const filterEvents = () => {
        let result = [...events];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.title?.toLowerCase().includes(query) ||
                e.description?.toLowerCase().includes(query) ||
                e.location?.toLowerCase().includes(query)
            );
        }

        // Apply time filter
        if (filter === 'this_week') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            result = result.filter(e => new Date(e.start_time) < nextWeek);
        } else if (filter === 'this_month') {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            result = result.filter(e => new Date(e.start_time) < nextMonth);
        }

        setFilteredEvents(result);
    };

    const formatEventDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const formatEventTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    };

    if (loading) return <div className="p-5 text-center">Loading events...</div>;

    return (
        <div>
            <div className="st-header" style={{ display: 'block', paddingBottom: 'var(--space-md)' }}>
                <h1 className="st-page-title" style={{ fontSize: '1.5rem', marginBottom: 'var(--space-md)' }}>Find Events</h1>
                <div className="bit-input-group">
                    <span className="bit-input-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bit-input-field"
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="st-tabs" style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                padding: '0 var(--space-lg) var(--space-md)',
                overflowX: 'auto'
            }}>
                <BitButton
                    size="sm"
                    variant={filter === 'all' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('all')}
                >
                    All
                </BitButton>
                <BitButton
                    size="sm"
                    variant={filter === 'this_week' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('this_week')}
                >
                    This Week
                </BitButton>
                <BitButton
                    size="sm"
                    variant={filter === 'this_month' ? 'primary' : 'secondary'}
                    onClick={() => setFilter('this_month')}
                >
                    This Month
                </BitButton>
            </div>

            {/* Events List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: '0 var(--space-md) var(--space-2xl)' }}>
                {filteredEvents.map(event => (
                    <Link
                        key={event.id}
                        to={`/clubs/${event.club_id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        <BitCard clickable style={{ display: 'flex', alignItems: 'center', padding: 0 }}>
                            <div style={{
                                width: '80px',
                                alignSelf: 'stretch',
                                background: 'var(--bg-app)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>
                                📅
                            </div>
                            <div style={{ padding: 'var(--space-md)', flex: 1 }}>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--color-primary)',
                                    fontWeight: 600,
                                    textTransform: 'uppercase'
                                }}>
                                    {formatEventDate(event.start_time)}
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0', color: 'var(--text-main)' }}>{event.title}</h3>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    📍 {event.location || 'TBD'} • {formatEventTime(event.start_time)}
                                </div>
                                {event.capacity && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {event.registration_count || 0}/{event.capacity} spots filled
                                    </div>
                                )}
                            </div>
                        </BitCard>
                    </Link>
                ))}

                {filteredEvents.length === 0 && (
                    <BitCard style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔍</div>
                        {searchQuery ? (
                            <>
                                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>No Results</h3>
                                <p>No events match "{searchQuery}". Try a different search.</p>
                            </>
                        ) : (
                            <>
                                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--text-main)' }}>No Events Found</h3>
                                <p>There are no upcoming events {filter !== 'all' ? 'for this time period' : 'right now'}.</p>
                            </>
                        )}
                        {filter !== 'all' && (
                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <BitButton variant="secondary" onClick={() => setFilter('all')}>
                                    View All Events
                                </BitButton>
                            </div>
                        )}
                    </BitCard>
                )}
            </div>
        </div>
    );
};

export default StudentEvents;
