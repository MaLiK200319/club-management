import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const EventFeedback = ({ eventId, onClose, onFeedbackSubmitted }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [existingFeedback, setExistingFeedback] = useState([]);
    const [stats, setStats] = useState({ avg: 0, total: 0 });

    useEffect(() => {
        fetchFeedback();
    }, [eventId]);

    const fetchFeedback = async () => {
        try {
            const res = await api.get(`/events/${eventId}/feedback`);
            setExistingFeedback(res.data.feedback);
            setStats({ avg: res.data.average_rating, total: res.data.total_ratings });
        } catch (error) {
            console.error('Error fetching feedback:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/events/${eventId}/feedback`, { rating, comment });
            alert('Thank you for your feedback!');
            onFeedbackSubmitted();
            fetchFeedback();
            onClose();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content-custom feedback-modal">
                <div className="modal-header">
                    <h2>Event Feedback</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="feedback-content">
                    {stats.total > 0 && (
                        <div className="feedback-stats">
                            <div className="avg-rating">{stats.avg} <span>★</span></div>
                            <div className="total-ratings">Based on {stats.total} reviews</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="feedback-form">
                        <div className="rating-selector">
                            <label>Your Rating:</label>
                            <div className="stars">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        className={rating >= s ? 'star active' : 'star'}
                                        onClick={() => setRating(s)}
                                    >★</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Comment (Optional)</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Share your experience..."
                                rows="3"
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-submit w-full" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </form>

                    <div className="feedback-list-mini">
                        <h3>Recent Reviews</h3>
                        {existingFeedback.length === 0 ? (
                            <p className="empty-msg">No reviews yet. Be the first!</p>
                        ) : (
                            <div className="reviews-scroll">
                                {existingFeedback.map(f => (
                                    <div key={f.id} className="review-item">
                                        <div className="review-header">
                                            <span className="review-rating">{'★'.repeat(f.rating)}</span>
                                            <span className="review-date">{new Date(f.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="review-comment">{f.comment}</p>
                                        <div className="review-user">{f.full_name}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventFeedback;
