import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const ClubAdminIssues = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState([]);
    const [enforcementState, setEnforcementState] = useState('normal');
    const [deadline, setDeadline] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        fetchIssues();
    }, []);

    // Countdown Timer Effect
    useEffect(() => {
        if (!deadline) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = deadline - now;

            if (diff <= 0) {
                setTimeRemaining('00:00:00');
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [deadline]);

    const fetchIssues = async () => {
        try {
            setLoading(true);

            const response = await api.get('/intelligence/escalations');
            const allEscalations = response.data || [];
            const myEscalations = allEscalations.filter(
                e => e.target_type === 'club' && e.target_id === user.club_id && !e.resolved_at
            );

            setIssues(myEscalations);

            // Calculate state logic (copied from dashboard for consistency)
            const urgent = myEscalations.filter(e => e.severity === 'escalated' || e.severity === 'intervention');

            if (urgent.length > 0) {
                const oldest = urgent.reduce((prev, curr) =>
                    new Date(prev.created_at) < new Date(curr.created_at) ? prev : curr
                );
                const created = new Date(oldest.created_at);
                const now = new Date();
                const hoursOld = (now - created) / (1000 * 60 * 60);

                if (hoursOld > 168) {
                    setEnforcementState('suspended');
                    setDeadline(null);
                } else if (hoursOld > 48) {
                    setEnforcementState('locked');
                    // Deadline for suspension (7 days from creation)
                    setDeadline(new Date(created.getTime() + (168 * 60 * 60 * 1000)));
                } else {
                    setEnforcementState('restricted');
                    // Deadline for lock (48h from creation)
                    setDeadline(new Date(created.getTime() + (48 * 60 * 60 * 1000)));
                }
            } else if (myEscalations.length > 0) {
                setEnforcementState('restricted'); // Warnings
            } else {
                setEnforcementState('normal');
            }

        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        try {
            const notes = prompt("Describe how you have resolved this issue:");
            if (!notes) return;

            await api.post(`/intelligence/escalations/${id}/resolve`, { notes });
            // Optimistic updatre
            setIssues(prev => prev.filter(i => i.id !== id));
            fetchIssues(); // Full refresh to check state calc
        } catch (error) {
            alert("Failed to resolve: " + (error.response?.data?.message || error.message));
        }
    };

    if (loading) return <div className="ca-empty"><div className="ca-empty-icon">⏳</div></div>;

    if (issues.length === 0) {
        return (
            <div className="ca-empty" style={{ paddingTop: '100px' }}>
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🛡️</div>
                <h1 style={{ fontWeight: 800 }}>System Secure</h1>
                <p>No active threats detected. Carry on.</p>
            </div>
        );
    }

    return (
        <div>
            {/* 1. DEFCON HERO SECTION */}
            {enforcementState !== 'normal' && deadline && (
                <div className="ca-hero-locked">
                    <div className="ca-hero-content">
                        <div className="ca-hero-title">
                            <span style={{ fontSize: '3rem' }}>
                                {enforcementState === 'restricted' ? '⚠️' : '🔒'}
                            </span>
                            {enforcementState === 'restricted' ? 'SYSTEM RESTRICTED' : 'SYSTEM LOCKED'}
                        </div>
                        <div className="ca-hero-subtitle">
                            {enforcementState === 'restricted'
                                ? 'Event creation disabled. Failure to resolve prompts LOCKDOWN.'
                                : 'Operations frozen. Failure to resolve prompts PERMANENT SUSPENSION.'}
                        </div>
                    </div>

                    <div className="ca-countdown-container">
                        <div className="ca-countdown-label">
                            TIME UNTIL {enforcementState === 'restricted' ? 'LOCKDOWN' : 'SUSPENSION'}
                        </div>
                        <div className="ca-countdown-digits">
                            {timeRemaining || '00:00:00'}
                        </div>
                    </div>
                </div>
            )}

            <h2 className="ca-section-title" style={{ marginTop: 'var(--ca-spacing-xl)' }}>
                ACTION REQUIRED ({issues.length})
            </h2>

            {/* 2. ISSUE CARDS (Dominant Layout) */}
            <div className="ca-list">
                {issues.map(issue => (
                    <div
                        key={issue.id}
                        className="ca-card"
                        style={{
                            marginBottom: 'var(--ca-spacing-lg)',
                            borderLeft: `8px solid ${issue.severity === 'warning' ? '#F59E0B' : '#EF4444'}`
                        }}
                    >
                        <div className="ca-card-body" style={{ display: 'flex', gap: 'var(--ca-spacing-lg)', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    textTransform: 'uppercase',
                                    fontWeight: 800,
                                    color: issue.severity === 'warning' ? '#F59E0B' : '#EF4444',
                                    letterSpacing: '1px',
                                    marginBottom: '8px'
                                }}>
                                    {issue.severity.toUpperCase()} ALERT
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                                    {issue.type.replace('_', ' ').toUpperCase()}
                                </h3>
                                <p style={{ color: 'var(--ca-text-muted)', fontSize: '1.1rem' }}>
                                    {issue.resolution_notes || 'System detected anomaly requiring immediate explanations.'}
                                </p>
                            </div>

                            <button
                                className="ca-btn ca-btn-massive"
                                style={{ width: 'auto', padding: '1rem 3rem' }}
                                onClick={() => handleResolve(issue.id)}
                            >
                                RESOLVE ISSUE
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClubAdminIssues;
