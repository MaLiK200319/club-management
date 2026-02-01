import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const ClubAdminMembers = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState({ pending: [], approved: [], rejected: [] });
    const [activeTab, setActiveTab] = useState('pending');
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/clubs/${user.club_id}/members`);
            const allMembers = response.data || [];

            const pending = allMembers.filter(m => m.status === 'pending');
            const approved = allMembers.filter(m => m.status === 'approved');
            const rejected = allMembers.filter(m => m.status === 'rejected');

            setMembers({ pending, approved, rejected });

            // If we have pending, default to that tab
            if (pending.length > 0) {
                setActiveTab('pending');
            } else if (approved.length > 0) {
                setActiveTab('approved');
            }
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMemberAction = async (userId, action) => {
        try {
            setProcessing(userId);
            await api.put(`/memberships/clubs/${user.club_id}/users/${userId}`, {
                status: action
            });
            fetchMembers();
        } catch (error) {
            if (error.response?.status === 403) {
                alert(error.response.data.message || 'Action blocked by enforcement policy');
            } else {
                console.error('Error updating member:', error);
            }
        } finally {
            setProcessing(null);
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>⏳</div>
                <div>Loading members...</div>
            </div>
        );
    }

    const tabs = [
        { key: 'pending', label: 'Pending', count: members.pending.length, icon: '⏳' },
        { key: 'approved', label: 'Approved', count: members.approved.length, icon: '✅' },
        { key: 'rejected', label: 'Rejected', count: members.rejected.length, icon: '❌' },
    ];

    const currentMembers = members[activeTab] || [];

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 className="ca-header-title">Member Management</h1>
                <p style={{ color: 'var(--text-muted)' }}>Review and manage your club members</p>
            </div>

            {/* Warning Banner */}
            {members.pending.length > 5 && (
                <BitCard style={{
                    marginBottom: 'var(--space-lg)',
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FCD34D',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-md)'
                }}>
                    <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                    <span style={{ fontWeight: 500 }}>
                        {members.pending.length} members pending. More than 7 days may trigger a warning.
                    </span>
                </BitCard>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', overflowX: 'auto', paddingBottom: '4px' }}>
                {tabs.map(tab => (
                    <BitButton
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        variant={activeTab === tab.key ? 'primary' : 'secondary'}
                        size="sm"
                    >
                        <span style={{ marginRight: '4px' }}>{tab.icon}</span>
                        {tab.label} ({tab.count})
                    </BitButton>
                ))}
            </div>

            {/* Member List */}
            <BitCard style={{ padding: 0 }}>
                {currentMembers.length === 0 ? (
                    <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>👥</div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>No {activeTab} members</h3>
                        {activeTab === 'pending' && (
                            <p>New membership requests will appear here</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {currentMembers.map((member, index) => (
                            <div key={member.user_id} style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-md)',
                                borderBottom: index !== currentMembers.length - 1 ? '1px solid var(--border-light)' : 'none'
                            }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%',
                                    background: 'var(--color-primary)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 600
                                }}>
                                    {getInitials(member.full_name)}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, fontWeight: 500, color: 'var(--text-main)' }}>{member.full_name}</h4>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {activeTab === 'pending' && `Applied ${formatDate(member.joined_at || member.created_at)}`}
                                        {activeTab === 'approved' && `Member since ${formatDate(member.joined_at || member.created_at)}`}
                                        {activeTab === 'rejected' && `Rejected`}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                    {activeTab === 'pending' && (
                                        <>
                                            <BitButton
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleMemberAction(member.user_id, 'approved')}
                                                disabled={processing === member.user_id}
                                            >
                                                {processing === member.user_id ? '...' : '✓ Approve'}
                                            </BitButton>
                                            <BitButton
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleMemberAction(member.user_id, 'rejected')}
                                                disabled={processing === member.user_id}
                                            >
                                                ✗ Reject
                                            </BitButton>
                                        </>
                                    )}
                                    {activeTab === 'approved' && (
                                        <BitButton
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleMemberAction(member.user_id, 'rejected')}
                                            disabled={processing === member.user_id}
                                        >
                                            Remove
                                        </BitButton>
                                    )}
                                    {activeTab === 'rejected' && (
                                        <BitButton
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleMemberAction(member.user_id, 'approved')}
                                            disabled={processing === member.user_id}
                                        >
                                            Re-approve
                                        </BitButton>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </BitCard>
        </div>
    );
};

export default ClubAdminMembers;
