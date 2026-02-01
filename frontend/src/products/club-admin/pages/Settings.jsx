import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const ClubAdminSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [club, setClub] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        email: '',
        location: ''
    });

    useEffect(() => {
        fetchClubData();
    }, []);

    const fetchClubData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/clubs/${user.club_id}`);
            const clubData = response.data;
            setClub(clubData);
            setFormData({
                name: clubData.name || '',
                description: clubData.description || '',
                category: clubData.category || '',
                email: clubData.email || '',
                location: clubData.location || ''
            });
        } catch (error) {
            console.error('Error fetching club:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);
            await api.put(`/clubs/${user.club_id}`, formData);
            alert('Settings saved successfully');
        } catch (error) {
            if (error.response?.status === 403) {
                alert(error.response.data.message || 'Action blocked by enforcement policy');
            } else {
                console.error('Error saving settings:', error);
                alert('Failed to save settings');
            }
        } finally {
            setSaving(false);
        }
    };

    const categories = [
        { value: 'academic', label: 'Academic' },
        { value: 'sports', label: 'Sports' },
        { value: 'arts', label: 'Arts & Culture' },
        { value: 'technology', label: 'Technology' },
        { value: 'social', label: 'Social' },
        { value: 'other', label: 'Other' }
    ];

    if (loading) {
        return (
            <div className="ca-empty">
                <div className="ca-empty-icon">⏳</div>
                <div className="ca-empty-title">Loading settings...</div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="ca-header-title" style={{ marginBottom: 'var(--space-lg)' }}>Club Settings</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)', maxWidth: '800px' }}>
                {/* Club Profile */}
                <BitCard title="Club Profile">
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--text-main)' }}>
                                Club Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bit-input-field"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--text-main)' }}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="bit-input-field"
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--text-main)' }}>
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="bit-input-field"
                                style={{ background: 'var(--bg-card)' }}
                            >
                                <option value="">Select category</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
                            <BitButton
                                type="submit"
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </BitButton>
                        </div>
                    </form>
                </BitCard>

                {/* Club Stats */}
                <BitCard title="Club Information">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Status</div>
                            <BitBadge
                                variant={club?.status === 'active' ? 'success' : 'danger'}
                                label={club?.status?.toUpperCase() || 'ACTIVE'}
                            />
                        </div>

                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Created</div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                {club?.created_at ? new Date(club.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Club ID</div>
                            <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                #{user.club_id}
                            </div>
                        </div>
                    </div>
                </BitCard>
            </div>
        </div>
    );
};

export default ClubAdminSettings;
