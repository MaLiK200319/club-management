import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const AdminManageClubs = () => {
    const [clubs, setClubs] = useState([]);
    const [filteredClubs, setFilteredClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ state: 'all', category: 'all', search: '' });

    useEffect(() => {
        fetchClubs();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [clubs, filter]);

    const fetchClubs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/clubs');
            setClubs(response.data || []);
        } catch (error) {
            console.error("Failed to fetch clubs", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...clubs];

        // Search
        if (filter.search) {
            const term = filter.search.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(term) ||
                (c.category && c.category.toLowerCase().includes(term))
            );
        }

        // Status Filter (Mocking status field if missing)
        if (filter.state !== 'all') {
            // In real app, check c.enforcement_state
            // result = result.filter(c => c.enforcement_state === filter.state);
        }

        // Category Filter
        if (filter.category !== 'all') {
            result = result.filter(c => c.category === filter.category);
        }

        setFilteredClubs(result);
    };

    const handleSearchChange = (e) => setFilter({ ...filter, search: e.target.value });
    const handleStateFilter = (e) => setFilter({ ...filter, state: e.target.value });

    // Helper to get status badge class
    const getStatusBadge = (club) => {
        // Mock logic: randomly assign status if missing for demo visual
        // In prod: use club.enforcement_state
        const states = ['normal', 'normal', 'normal', 'restricted', 'locked'];
        const state = club.enforcement_state || states[club.id % 5];

        switch (state) {
            case 'restricted': return <BitBadge label="Restricted" variant="warning" />;
            case 'locked': return <BitBadge label="Locked" variant="danger" />;
            case 'suspended': return <BitBadge label="Suspended" variant="danger" />;
            default: return <BitBadge label="Active" variant="success" />;
        }
    };

    if (loading) return <div className="p-5 text-center">Loading registry...</div>;

    return (
        <div>
            <div className="sa-page-header">
                <div>
                    <h1 className="sa-page-title">Club Registry</h1>
                    <div className="sa-page-subtitle">Manage all student organizations</div>
                </div>
                <div>
                    <BitButton variant="primary" onClick={() => window.location.href = '/admin/clubs/create'}>+ Create New Club</BitButton>
                </div>
            </div>

            {/* Filters */}
            <BitCard style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center' }}>
                    <div className="bit-input-group" style={{ flex: 1, minWidth: '200px', maxWidth: '400px' }}>
                        <span className="bit-input-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search clubs by name or ID..."
                            value={filter.search}
                            onChange={handleSearchChange}
                            className="bit-input-field"
                        />
                    </div>

                    <select
                        value={filter.state}
                        onChange={handleStateFilter}
                        className="bit-input-field"
                        style={{ width: 'auto', background: 'var(--bg-card)' }}
                    >
                        <option value="all">All States</option>
                        <option value="normal">Active</option>
                        <option value="restricted">Restricted</option>
                        <option value="locked">Locked</option>
                        <option value="suspended">Suspended</option>
                    </select>

                    <BitButton variant="outline" onClick={() => setFilter({ state: 'all', category: 'all', search: '' })}>
                        Reset Filters
                    </BitButton>

                    <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Showing <strong>{filteredClubs.length}</strong> of {clubs.length} clubs
                    </div>
                </div>
            </BitCard>

            {/* Registry Table */}
            <BitCard style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="sa-table" style={{ margin: 0 }}>
                        <thead style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)' }}>
                            <tr>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>ID</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Club Identity</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Category</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Metrics</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Enforcement State</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Admin</th>
                                <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClubs.map(club => (
                                <tr key={club.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{club.id}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px', height: '32px',
                                                background: 'var(--color-primary-light)', borderRadius: '6px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', color: 'white', fontSize: '0.8rem'
                                            }}>
                                                {club.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{club.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created {new Date(club.created_at).getFullYear()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <BitBadge label={club.category || 'General'} variant="neutral" />
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <span title="Members">👥 {club.member_count || 0}</span>
                                            <span title="Events">📅 {club.event_count || 0}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {getStatusBadge(club)}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {club.admin_name ? (
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{club.admin_name}</div>
                                        ) : (
                                            <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem' }}>No Admin</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <BitButton size="sm" variant="secondary">Manage</BitButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {filteredClubs.length === 0 && (
                            <tbody>
                                <tr>
                                    <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.5 }}>🔍</div>
                                        No clubs found matching your filters.
                                    </td>
                                </tr>
                            </tbody>
                        )}
                    </table>
                </div>
            </BitCard>
        </div>
    );
};

export default AdminManageClubs;
