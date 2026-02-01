import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import './FeedbackDashboard.css';

const FeedbackDashboard = () => {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEventFeedback();
    }, []);

    const fetchEventFeedback = async () => {
        try {
            setLoading(true);
            // Fetch events for the admin's club
            const eventsRes = await api.get(`/clubs/${user.club_id}/events`);
            const eventsData = eventsRes.data || [];

            // Fetch feedback for each event
            const eventsWithFeedback = await Promise.all(
                eventsData.map(async (event) => {
                    try {
                        const feedbackRes = await api.get(`/events/${event.id}/feedback`);
                        return {
                            ...event,
                            feedback: feedbackRes.data.feedback || [],
                            averageRating: feedbackRes.data.average_rating,
                            totalRatings: feedbackRes.data.total_ratings
                        };
                    } catch (err) {
                        return { ...event, feedback: [], averageRating: null, totalRatings: 0 };
                    }
                })
            );

            // Sort by average rating (lowest first to highlight problem events)
            eventsWithFeedback.sort((a, b) => {
                if (a.averageRating === null) return 1;
                if (b.averageRating === null) return -1;
                return a.averageRating - b.averageRating;
            });

            setEvents(eventsWithFeedback);
        } catch (err) {
            setError('Failed to load feedback data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getRatingClass = (rating) => {
        if (rating === null) return 'rating-none';
        if (rating < 2.5) return 'rating-low';
        if (rating < 3.5) return 'rating-medium';
        return 'rating-high';
    };

    const renderStars = (rating) => {
        if (rating === null) return 'No ratings';
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        return (
            <span className="stars">
                {'★'.repeat(fullStars)}
                {hasHalf && '½'}
                {'☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0))}
                <span className="rating-number">({rating.toFixed(1)})</span>
            </span>
        );
    };

    if (loading) {
        return <div className="feedback-dashboard loading">Loading feedback data...</div>;
    }

    if (error) {
        return <div className="feedback-dashboard error">{error}</div>;
    }

    const lowRatedEvents = events.filter(e => e.averageRating !== null && e.averageRating < 3);

    return (
        <div className="feedback-dashboard">
            <div className="dashboard-header">
                <h1>📊 QA Feedback Dashboard</h1>
                <p>Monitor event satisfaction and identify areas for improvement.</p>
            </div>

            {lowRatedEvents.length > 0 && (
                <div className="alert-section">
                    <h2>⚠️ Attention Required</h2>
                    <p>The following events have low satisfaction ratings (below 3.0):</p>
                    <ul className="alert-list">
                        {lowRatedEvents.map(event => (
                            <li key={event.id} className="alert-item">
                                <strong>{event.title}</strong> — {renderStars(event.averageRating)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="events-grid">
                {events.map(event => (
                    <div key={event.id} className={`event-card ${getRatingClass(event.averageRating)}`}>
                        <div className="event-card-header">
                            <h3>{event.title}</h3>
                            <span className={`status-badge status-${event.status}`}>{event.status}</span>
                        </div>
                        <div className="event-rating">
                            {renderStars(event.averageRating)}
                            <span className="total-reviews">({event.totalRatings} reviews)</span>
                        </div>

                        {event.feedback.length > 0 && (
                            <div className="recent-feedback">
                                <h4>Recent Comments:</h4>
                                <ul>
                                    {event.feedback.slice(0, 3).map((fb, idx) => (
                                        <li key={idx} className={fb.rating < 3 ? 'negative' : ''}>
                                            <span className="fb-rating">{'★'.repeat(fb.rating)}</span>
                                            {fb.comment && <p>"{fb.comment}"</p>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}

                {events.length === 0 && (
                    <div className="no-events">
                        <p>No events to display. Create events to start collecting feedback.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackDashboard;
