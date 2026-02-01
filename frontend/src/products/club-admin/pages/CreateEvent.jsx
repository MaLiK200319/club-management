import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const ClubAdminCreateEvent = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        location: '',
        capacity: ''
    });
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!user.club_id) {
            setError("Club ID missing using profile.");
            setLoading(false);
            return;
        }

        try {
            // Basic validation
            if (!formData.title || !formData.start_time || !formData.location) {
                throw new Error("Please fill in all required fields.");
            }

            // Prepare payload
            const payload = {
                club_id: user.club_id,
                title: formData.title,
                description: formData.description,
                start_time: formData.start_time,
                location: formData.location,
                capacity: formData.capacity ? parseInt(formData.capacity) : null,
                status: 'draft' // Default to draft
            };

            await api.post('/events/create', payload);
            navigate('/club-admin/events');

        } catch (err) {
            console.error("Create event error:", err);
            setError(err.response?.data?.message || err.message || "Failed to create event");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ca-container">
            <div className="ca-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="ca-card-header">
                    <h2 className="ca-card-title">Create New Event</h2>
                </div>
                <div className="ca-card-body">
                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '10px', background: '#FEE2E2', color: '#991B1B', borderRadius: '6px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="d-block mb-1 font-weight-bold">Event Title *</label>
                            <input
                                type="text"
                                name="title"
                                className="form-control"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Annual Tech Symposium"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="d-block mb-1 font-weight-bold">Description</label>
                            <textarea
                                name="description"
                                className="form-control"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe your event..."
                                rows="4"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="mb-4">
                            <div>
                                <label className="d-block mb-1 font-weight-bold">Date & Time *</label>
                                <input
                                    type="datetime-local"
                                    name="start_time"
                                    className="form-control"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                    required
                                />
                            </div>
                            <div>
                                <label className="d-block mb-1 font-weight-bold">Location *</label>
                                <input
                                    type="text"
                                    name="location"
                                    className="form-control"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. Auditorium A / Zoom"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="d-block mb-1 font-weight-bold">Capacity (Optional)</label>
                            <input
                                type="number"
                                name="capacity"
                                className="form-control"
                                value={formData.capacity}
                                onChange={handleChange}
                                placeholder="Max attendees (leave blank for unlimited)"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                                min="1"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button
                                type="button"
                                className="ca-btn ca-btn-outline"
                                onClick={() => navigate('/club-admin/events')}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="ca-btn ca-btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Draft Event'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ClubAdminCreateEvent;
