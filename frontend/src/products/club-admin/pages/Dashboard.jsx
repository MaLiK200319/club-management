import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import useClubAdminData from '../hooks/useClubAdminData';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const ClubAdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Use the enhanced hook
    const { myClub, enforcement, loading } = useClubAdminData(user);
    const { state: enforcementState, deadline: nextDeadline, activeIssues } = enforcement || { state: 'normal', activeIssues: 0 };

    // Derived stats for the view
    const stats = {
        totalMembers: myClub?.member_count || 0,
        activeIssues: activeIssues
    };

    const [dashboardEvents, setDashboardEvents] = useState([]);
    const [dashboardPending, setDashboardPending] = useState(0);

    useEffect(() => {
        if (!loading && myClub && enforcementState === 'normal') {
            // Only fetch operational data if we have access
            fetchOperationalData();
        }
    }, [loading, myClub, enforcementState]);

    const fetchOperationalData = async () => {
        try {
            const clubId = myClub?.id || user?.club_id;
            if (!clubId) {
                console.warn("Fetch skipped: no club ID");
                return;
            }

            const [eventsRes, membersRes] = await Promise.all([
                api.get(`/clubs/${clubId}/events`),
                api.get(`/clubs/${clubId}/members`)
            ]);

            // Debug logging
            // console.log("Dashboard Data:", { events: eventsRes.data, members: membersRes.data });

            // Ensure events is an array
            let events = [];
            if (eventsRes?.data && Array.isArray(eventsRes.data)) {
                events = eventsRes.data;
            } else if (eventsRes?.data?.data && Array.isArray(eventsRes.data.data)) {
                // handle unexpected pagination wrapper
                events = eventsRes.data.data;
            }

            // Ensure members is an array
            let members = [];
            if (membersRes?.data && Array.isArray(membersRes.data)) {
                members = membersRes.data;
            } else if (membersRes?.data?.data && Array.isArray(membersRes.data.data)) {
                members = membersRes.data.data;
            }

            const pending = members.filter(m => m.status === 'pending');
            const comingEvents = events.filter(e => new Date(e.start_time) > new Date() && e.status === 'published');

            setDashboardEvents(comingEvents);
            setDashboardPending(pending.length);
        } catch (error) {
            console.error("Dashboard fetch error", error);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-xl)' }}><div className="spinner-border text-primary"></div></div>;

    // =========================================================
    // STATE 1: FORCED RESOLUTION (Restricted / Locked / Suspended)
    // =========================================================
    if (enforcementState !== 'normal') {
        const isRestricted = enforcementState === 'restricted';
        const isLocked = enforcementState === 'locked';
        const isSuspended = enforcementState === 'suspended';

        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(241, 245, 249, 0.9)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)'
            }}>
                <BitCard style={{ maxWidth: '600px', textAlign: 'center', padding: 'var(--space-xl)', border: `2px solid var(--color-danger)` }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>
                        {isRestricted ? '⚠️' : isLocked ? '🔒' : '🚫'}
                    </div>

                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 'var(--space-md)', color: 'var(--color-danger)' }}>
                        {isRestricted && 'Action Required'}
                        {isLocked && 'Operations Locked'}
                        {isSuspended && 'Club Suspended'}
                    </h1>

                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
                        {isRestricted && `You have ${activeIssues} active issue(s) that require immediate attention. New event creation is disabled.`}
                        {isLocked && `Your privileges have been revoked due to unresolved escalations. You cannot publish events or approve members.`}
                        {isSuspended && `Your club is currently inactive. Please contact the administration.`}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)' }}>
                        <Link to="/club-admin/issues">
                            <BitButton variant="danger" size="lg">
                                Resolve Issues ({activeIssues})
                            </BitButton>
                        </Link>
                    </div>

                    {isRestricted && (
                        <div style={{ marginTop: 'var(--space-lg)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
                            <strong>Warning:</strong> Failure to act may result in account lockdown.
                        </div>
                    )}
                </BitCard>
            </div>
        );
    }

    // =========================================================
    // STATE 2: HEALTHY (Normal)
    // =========================================================
    return (
        <div>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h2 className="ca-header-title">Welcome back, {user?.name?.split(' ')[0] || 'Admin'}</h2>
                <p style={{ color: 'var(--text-muted)' }}>Here's what's happening in your club today.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-xl)' }}>
                {/* DOMINANT CARD 1: NEXT EVENT */}
                <BitCard style={{ display: 'flex', flexDirection: 'column', minHeight: '300px', borderTop: '4px solid var(--color-accent)' }}>
                    <div style={{
                        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--text-muted)', marginBottom: 'var(--space-sm)'
                    }}>
                        Next Big Moment
                    </div>

                    {dashboardEvents.length > 0 ? (
                        <>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 'var(--space-md) 0', color: 'var(--text-main)' }}>
                                {dashboardEvents[0].title}
                            </h2>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline' }}>
                                {Math.ceil((new Date(dashboardEvents[0].start_time) - new Date()) / (1000 * 60 * 60 * 24))}
                                <span style={{ fontSize: '1rem', marginLeft: '8px', color: 'var(--text-muted)', fontWeight: 500 }}>days to go</span>
                            </div>
                            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)' }}>
                                <Link to={`/club-admin/events`}>
                                    <BitButton variant="primary">Manage Event</BitButton>
                                </Link>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.7, padding: 'var(--space-lg) 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📅</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>Empty Calendar</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Plan your next event to keep momentum.</p>
                            <Link to="/club-admin/events/new">
                                <BitButton variant="primary">+ Create Event</BitButton>
                            </Link>
                        </div>
                    )}
                </BitCard>

                {/* DOMINANT CARD 2: MEMBERSHIP PIPELINE */}
                <BitCard style={{ display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                    <div style={{
                        fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                        color: 'var(--text-muted)', marginBottom: 'var(--space-sm)'
                    }}>
                        Membership Pipeline
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {dashboardPending > 0 ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--color-warning)', lineHeight: 1 }}>{dashboardPending}</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginTop: 'var(--space-xs)' }}>Pending Requests</div>
                                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Don't keep them waiting.</p>
                                <Link to="/club-admin/members">
                                    <BitButton variant="default" style={{ background: 'var(--text-main)', color: 'white' }}>Review Applications</BitButton>
                                </Link>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.totalMembers}</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>Active Members</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-success)', marginTop: 'var(--space-sm)', fontWeight: 600 }}>
                                    Your community is growing!
                                </div>
                            </div>
                        )}
                    </div>
                </BitCard>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                <Link to="/club-admin/announcements">
                    <BitButton variant="secondary">📢 Make Announcement</BitButton>
                </Link>
                <Link to="/club-admin/settings">
                    <BitButton variant="secondary">⚙️ Club Settings</BitButton>
                </Link>
            </div>
        </div>
    );
};

export default ClubAdminDashboard;
