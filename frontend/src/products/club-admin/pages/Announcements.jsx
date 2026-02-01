import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';

const ClubAdminAnnouncements = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/clubs/${user.club_id}/announcements`);
            setAnnouncements(response.data || []);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        try {
            setSubmitting(true);
            await api.post('/announcements', {
                club_id: user.club_id,
                title: formData.title,
                content: formData.content
            });
            setFormData({ title: '', content: '' });
            setShowForm(false);
            fetchAnnouncements();
        } catch (error) {
            console.error('Error creating announcement:', error);
            alert(error.response?.data?.message || 'Failed to create announcement');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;

        try {
            await api.delete(`/announcements/${id}`);
            fetchAnnouncements();
        } catch (error) {
            console.error('Error deleting announcement:', error);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="ca-empty">
                <div className="ca-empty-icon">⏳</div>
                <div className="ca-empty-title">Loading announcements...</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h1 className="ca-header-title">Announcements</h1>
                <BitButton
                    variant="primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? 'Cancel' : '+ New Announcement'}
                </BitButton>
            </div>

            {/* New Announcement Form */}
            {showForm && (
                <BitCard title="New Announcement" style={{ marginBottom: 'var(--space-lg)' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--text-main)' }}>
                                Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Announcement title"
                                className="bit-input-field"
                                required
                            />
                        </div>
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, color: 'var(--text-main)' }}>
                                Content
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Write your announcement..."
                                rows={4}
                                className="bit-input-field"
                                style={{ resize: 'vertical' }}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                            <BitButton
                                variant="secondary"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </BitButton>
                            <BitButton
                                type="submit"
                                variant="primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Publishing...' : 'Publish'}
                            </BitButton>
                        </div>
                    </form>
                </BitCard>
            )}

            {/* Announcements List */}
            {announcements.length === 0 ? (
                <BitCard style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', opacity: 0.5 }}>📢</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 'var(--space-xs)' }}>No announcements yet</div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Create your first announcement to reach your club members</div>
                    <BitButton
                        variant="primary"
                        onClick={() => setShowForm(true)}
                    >
                        Create Announcement
                    </BitButton>
                </BitCard>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {announcements.map(announcement => (
                        <BitCard key={announcement.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                    {announcement.title}
                                </h3>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {formatDate(announcement.created_at)}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-main)', margin: '0 0 var(--space-md)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {announcement.content}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <BitButton
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(announcement.id)}
                                >
                                    Delete
                                </BitButton>
                            </div>
                        </BitCard>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClubAdminAnnouncements;
