import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({
        totalClubs: 0,
        totalUsers: 0,
        activeEvents: 0,
        avgRating: 0
    });
    const [escalations, setEscalations] = useState([]);
    const [enforcementCounts, setEnforcementCounts] = useState({
        normal: 0,
        restricted: 0,
        locked: 0,
        suspended: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSystemData();
    }, []);

    const fetchSystemData = async () => {
        try {
            setLoading(true);
            const [clubsRes, usersRes, eventsRes, escalationsRes] = await Promise.all([
                api.get('/clubs'),
                api.get('/users'),
                api.get('/events'),
                api.get('/intelligence/escalations')
            ]);

            const clubData = clubsRes.data || [];
            const userData = usersRes.data || [];
            const eventData = eventsRes.data || [];
            const escData = escalationsRes.data || [];

            // Calculate Enforcement Counts
            const counts = { normal: 0, restricted: 0, locked: 0, suspended: 0 };
            clubData.forEach(c => {
                const state = c.enforcement_state || 'normal';
                counts[state] = (counts[state] || 0) + 1;
            });

            setStats({
                totalClubs: clubData.length,
                totalUsers: userData.length,
                activeEvents: eventData.length,
                avgRating: 4.2
            });

            setEnforcementCounts(counts);
            setEscalations(escData.filter(e => !e.resolved_at).slice(0, 5));

        } catch (error) {
            console.error("Failed to load admin dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading system telemetry...</div>;

    return (
        <div>
            <div className="sa-page-header">
                <div>
                    <h1 className="sa-page-title">System Health</h1>
                    <div className="sa-page-subtitle">Real-time governance overview</div>
                </div>
                <div>
                    <BitButton variant="secondary" onClick={fetchSystemData}>↻ Refresh Data</BitButton>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="sa-stats-grid">
                <BitCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Clubs</span>
                        <span style={{ fontSize: '1.5rem' }}>🏛️</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.totalClubs}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-success)', marginTop: 'var(--space-sm)' }}>
                        ↑ 2 new this month
                    </div>
                </BitCard>

                <BitCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Users</span>
                        <span style={{ fontSize: '1.5rem' }}>👥</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.totalUsers}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                        Active Accounts
                    </div>
                </BitCard>

                <BitCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Events</span>
                        <span style={{ fontSize: '1.5rem' }}>📅</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.activeEvents}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                        Scheduled this month
                    </div>
                </BitCard>

                <BitCard>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Avg Quality</span>
                        <span style={{ fontSize: '1.5rem' }}>★</span>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.avgRating}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                        Across all feedback
                    </div>
                </BitCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-xl)' }}>

                {/* Active Escalations */}
                <BitCard style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(0,0,0,0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--color-danger)' }}>🔴</span>
                            <strong style={{ color: 'var(--text-main)' }}>Active Escalations</strong>
                        </div>
                        <BitBadge variant="danger" label={`${escalations.length} Needs Review`} />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)' }}>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Severity</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issue</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Age</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {escalations.map(esc => (
                                    <tr key={esc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '16px 24px' }}>
                                            <BitBadge
                                                variant={esc.severity === 'escalated' ? 'danger' : 'warning'}
                                                label={esc.severity.toUpperCase()}
                                            />
                                        </td>
                                        <td style={{ padding: '16px 24px', fontWeight: 500 }}>Club #{esc.target_id}</td>
                                        <td style={{ padding: '16px 24px' }}>{esc.type}</td>
                                        <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{Math.floor((new Date() - new Date(esc.created_at)) / (1000 * 60 * 60))}h</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <BitButton variant="secondary" size="sm">Review</BitButton>
                                        </td>
                                    </tr>
                                ))}
                                {escalations.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No active escalations. Good job!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </BitCard>

                {/* Enforcement Health */}
                <BitCard>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                        Enforcement Status
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                            <span>🟢 Normal</span>
                            <strong>{enforcementCounts.normal}</strong>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', marginBottom: '16px' }}>
                            <div style={{ width: `${stats.totalClubs ? (enforcementCounts.normal / stats.totalClubs) * 100 : 0}%`, height: '100%', background: 'var(--color-success)', borderRadius: '4px' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                            <span>🟡 Restricted</span>
                            <strong>{enforcementCounts.restricted}</strong>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', marginBottom: '16px' }}>
                            <div style={{ width: `${stats.totalClubs ? (enforcementCounts.restricted / stats.totalClubs) * 100 : 0}%`, height: '100%', background: 'var(--color-warning)', borderRadius: '4px' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                            <span>🔴 Locked</span>
                            <strong>{enforcementCounts.locked}</strong>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', marginBottom: '16px' }}>
                            <div style={{ width: `${stats.totalClubs ? (enforcementCounts.locked / stats.totalClubs) * 100 : 0}%`, height: '100%', background: '#F97316', borderRadius: '4px' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                            <span>⛔ Suspended</span>
                            <strong>{enforcementCounts.suspended}</strong>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px' }}>
                            <div style={{ width: `${stats.totalClubs ? (enforcementCounts.suspended / stats.totalClubs) * 100 : 0}%`, height: '100%', background: 'var(--color-danger)', borderRadius: '4px' }}></div>
                        </div>
                    </div>
                </BitCard>

            </div>
        </div>
    );
};

export default SuperAdminDashboard;
