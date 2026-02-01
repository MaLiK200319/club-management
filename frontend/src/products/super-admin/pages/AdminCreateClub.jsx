import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import api from '../../../services/api';
import './AdminCreateClub.css';

const AdminCreateClub = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Technology',
        contact_email: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Only Super Admin can create clubs
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        return (
            <div className="admin-page">
                <div className="container">
                    <div className="error-state">
                        <h2>Access Denied</h2>
                        <p>Only administrators can access this page.</p>
                        <button onClick={() => navigate('/dashboard')} className="btn-primary-custom">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/clubs/create', formData);
            alert('Club created successfully!');
            navigate('/dashboard');
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create club');
            setLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="container">
                <div className="admin-header">
                    <h1 className="page-title">Create New Club</h1>
                    <button onClick={() => navigate('/dashboard')} className="btn-back">
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="admin-form-container">
                    {error && <div className="alert-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="admin-form">
                        <div className="form-group-admin">
                            <label className="form-label-admin">Club Name *</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input-admin"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Tech Innovators Club"
                            />
                        </div>

                        <div className="form-group-admin">
                            <label className="form-label-admin">Category *</label>
                            <select
                                name="category"
                                className="form-select-admin"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            >
                                <option value="Technology">Technology</option>
                                <option value="Arts">Arts</option>
                                <option value="Sports">Sports</option>
                                <option value="Business">Business</option>
                                <option value="Environment">Environment</option>
                            </select>
                        </div>

                        <div className="form-group-admin">
                            <label className="form-label-admin">Description *</label>
                            <textarea
                                name="description"
                                className="form-textarea-admin"
                                value={formData.description}
                                onChange={handleChange}
                                required
                                rows="6"
                                placeholder="Describe your club's mission, activities, and what makes it unique..."
                            />
                        </div>

                        <div className="form-group-admin">
                            <label className="form-label-admin">Contact Email</label>
                            <input
                                type="email"
                                name="contact_email"
                                className="form-input-admin"
                                value={formData.contact_email}
                                onChange={handleChange}
                                placeholder="club@university.edu"
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Club'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminCreateClub;
