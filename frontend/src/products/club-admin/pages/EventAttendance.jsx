import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContext } from '../../../context/ToastContext';
import { eventService } from '../../../services/apiService';
import AttendanceTable from '../components/AttendanceTable';

const EventAttendance = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            // 1. Fetch Event Details to Validate State
            const eventRes = await eventService.getById(id);
            const eventData = eventRes.data;

            if (eventData.status === 'draft' || eventData.status === 'cancelled') {
                setError('Attendance validation is only available for Published or Completed events.');
                setLoading(false);
                return;
            }

            setEvent(eventData);

            // 2. Fetch Registrations
            // Note: ApiService needs getRegistrations. If not exists, check backend contract.
            // Backend endpoint: GET /events/:id/registrations
            const regRes = await eventService.getRegistrations(id);
            setRegistrations(regRes.data || []);
            setLoading(false);

        } catch (err) {
            console.error(err);
            setError('Failed to load event data. You may not have permission.');
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId, newStatus) => {
        setUpdating(userId);
        try {
            // Optimistic Update
            setRegistrations(prev => prev.map(r =>
                r.user_id === userId ? { ...r, status: newStatus } : r
            ));

            await eventService.updateRegistrationStatus(id, userId, newStatus);

            // Should initiate notification separately via backend hooks (Phase 2 audit confirmed hooks exist)
        } catch (err) {
            console.error("Update failed", err);
            // Revert on failure
            fetchData();
            addToast("Failed to update status.", 'error');
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return (
        <div className="container mt-5 text-center">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    if (error) return (
        <div className="container mt-5">
            <div className="alert alert-danger shadow-sm">
                <h4 className="alert-heading">Access Denied</h4>
                <p>{error}</p>
                <hr />
                <button className="btn btn-outline-danger" onClick={() => navigate('/dashboard')}>
                    Return to Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Attendance: {event?.title}</h2>
                    <p className="text-muted mb-0">
                        {new Date(event?.event_date).toLocaleDateString()} at {event?.location} |
                        <span className={`badge ms-2 ${event?.status === 'published' ? 'bg-success' : 'bg-secondary'}`}>
                            {event?.status?.toUpperCase()}
                        </span>
                    </p>
                </div>
                <button className="btn btn-outline-primary" onClick={() => navigate(-1)}>
                    &larr; Back
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <AttendanceTable
                        registrations={registrations}
                        onUpdateStatus={handleUpdateStatus}
                        updating={updating}
                    />
                </div>
            </div>
        </div>
    );
};

export default EventAttendance;
