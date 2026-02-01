import React, { useState } from 'react';
import api from '../../../services/api';

const CreateAnnouncementModal = ({ clubId, onClose, onSuccess }) => {
    const [newAnn, setNewAnn] = useState({ title: '', content: '', priority: 'normal' });
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');

        try {
            await api.post(`/clubs/${clubId}/announcements`, newAnn);
            onSuccess();
            onClose();
            setNewAnn({ title: '', content: '', priority: 'normal' });
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create announcement');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content-custom">
                <div className="modal-header">
                    <h2>Create Announcement</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                {error && <div className="alert alert-danger p-2 mb-3">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title</label>
                        <input
                            type="text"
                            required
                            value={newAnn.title}
                            onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                            placeholder="e.g., Important Meeting"
                        />
                    </div>
                    <div className="form-group">
                        <label>Priority</label>
                        <select
                            value={newAnn.priority}
                            onChange={(e) => setNewAnn({ ...newAnn, priority: e.target.value })}
                        >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Content</label>
                        <textarea
                            required
                            value={newAnn.content}
                            onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })}
                            rows="5"
                            placeholder="Announcement details..."
                        ></textarea>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-submit" disabled={actionLoading}>
                            {actionLoading ? 'Creating...' : 'Post Announcement'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAnnouncementModal;
