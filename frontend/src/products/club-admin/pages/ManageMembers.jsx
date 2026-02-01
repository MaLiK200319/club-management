import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { membershipService, clubService } from '../../../services/apiService';
import { AuthContext } from '../../../context/AuthContext';
import './ManageMembers.css';

const ManageMembers = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [club, setClub] = useState(null);
    const [members, setMembers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [clubRes, membersRes, pendingRes] = await Promise.all([
                clubService.getById(id),
                membershipService.getClubMembers(id),
                membershipService.getPendingMembers(id)
            ]);

            setClub(clubRes.data);
            setMembers(membersRes.data);
            setPendingMembers(pendingRes.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching management data:', err);
            setError('Failed to load member data. You might not have permission.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (userId, status) => {
        try {
            await membershipService.updateMember(id, userId, { status });
            alert(`Member ${status === 'approved' ? 'approved' : 'rejected'}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update member status');
        }
    };

    const handleUpdateRole = async (userId, role) => {
        try {
            await membershipService.updateMember(id, userId, { role });
            alert(`Role updated to ${role}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update role');
        }
    };

    if (loading) return <div className="loading-container">Loading management panel...</div>;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="manage-members-page">
            <div className="container">
                <header className="manage-header">
                    <button className="btn-back" onClick={() => navigate(`/clubs/${id}`)}>← Back to Club</button>
                    <h1>Manage Members: {club?.name}</h1>
                </header>

                {/* Pending Requests */}
                <section className="manage-section">
                    <h2 className="section-title">Pending Requests ({pendingMembers.length})</h2>
                    {pendingMembers.length === 0 ? (
                        <p className="empty-msg">No pending membership requests.</p>
                    ) : (
                        <div className="manage-grid">
                            {pendingMembers.map(m => (
                                <div key={m.membership_id} className="manage-card">
                                    <div className="user-info-basic">
                                        <div className="avatar-placeholder">{m.full_name?.charAt(0)}</div>
                                        <div>
                                            <h3>{m.full_name}</h3>
                                            <p>{m.email}</p>
                                        </div>
                                    </div>
                                    <div className="manage-actions">
                                        <button className="btn-approve" onClick={() => handleUpdateStatus(m.user_id, 'approved')}>Approve</button>
                                        <button className="btn-reject" onClick={() => handleUpdateStatus(m.user_id, 'rejected')}>Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Current Members */}
                <section className="manage-section">
                    <h2 className="section-title">Approved Members ({members.length})</h2>
                    {members.length === 0 ? (
                        <p className="empty-msg">No members joined yet.</p>
                    ) : (
                        <div className="manage-table-container">
                            <table className="manage-table">
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Current Role</th>
                                        <th>Change Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.membership_id}>
                                            <td>
                                                <div className="member-cell">
                                                    <div className="avatar-xs">{m.full_name?.charAt(0)}</div>
                                                    <div>
                                                        <div className="member-name">{m.full_name}</div>
                                                        <div className="member-email">{m.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`role-badge ${m.membership_role}`}>
                                                    {m.membership_role}
                                                </span>
                                            </td>
                                            <td>
                                                <select
                                                    value={m.membership_role}
                                                    onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                                                    className="role-select"
                                                    disabled={m.user_id === user.id}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="moderator">Moderator</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td>
                                                {m.user_id !== user.id && (
                                                    <button className="btn-remove" onClick={() => handleUpdateStatus(m.user_id, 'rejected')}>
                                                        Remove
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ManageMembers;
