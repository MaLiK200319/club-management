import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import api from '../../../services/api';
import { clubService } from '../../../services/apiService';
import BitCard from '../../../components/common/BitCard';
import BitButton from '../../../components/common/BitButton';
import BitBadge from '../../../components/common/BitBadge';

const AdminUserManagement = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [roleData, setRoleData] = useState({ role: 'student', club_id: '' });

    useEffect(() => {
        if (user?.role === 'super_admin' || user?.role === 'admin') {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, clubsRes] = await Promise.all([
                api.get('/users'),
                clubService.getAllForAdmin()
            ]);
            setUsers(usersRes.data);
            setClubs(clubsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Only Super Admin can access
    if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        return (
            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🚫</div>
                <h2>Access Denied</h2>
                <p>Only Super Administrators can manage users.</p>
                <BitButton onClick={() => navigate('/dashboard')} variant="primary" style={{ marginTop: 'var(--space-lg)' }}>
                    Back to Dashboard
                </BitButton>
            </div>
        );
    }

    const openRoleModal = (u) => {
        setSelectedUser(u);
        setRoleData({ role: u.role, club_id: u.club_id || '' });
        setShowModal(true);
    };

    const handleRoleUpdate = async () => {
        try {
            await api.put(`/users/${selectedUser.id}/role`, roleData);
            alert('User role updated successfully!');
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update role');
        }
    };

    const filteredUsers = users.filter(u => {
        if (filter === 'all') return true;
        return u.role === filter;
    });

    const getRoleVariant = (role) => {
        switch (role) {
            case 'super_admin': return 'danger';
            case 'admin': return 'warning';
            case 'club_admin': return 'primary';
            case 'student': return 'bg';
            default: return 'default';
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>Loading users...</div>;

    return (
        <div>
            <div className="sa-page-header">
                <div>
                    <h1 className="sa-page-title">User Management</h1>
                    <div className="sa-page-subtitle">Manage student accounts and assign Club Admin roles.</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                <BitButton
                    variant={filter === 'all' ? 'primary' : 'outline'}
                    onClick={() => setFilter('all')}
                >
                    All ({users.length})
                </BitButton>
                <BitButton
                    variant={filter === 'student' ? 'primary' : 'outline'}
                    onClick={() => setFilter('student')}
                >
                    Students ({users.filter(u => u.role === 'student').length})
                </BitButton>
                <BitButton
                    variant={filter === 'club_admin' ? 'primary' : 'outline'}
                    onClick={() => setFilter('club_admin')}
                >
                    Club Admins ({users.filter(u => u.role === 'club_admin').length})
                </BitButton>
                <BitButton
                    variant={filter === 'super_admin' ? 'primary' : 'outline'}
                    onClick={() => setFilter('super_admin')}
                >
                    Super Admins ({users.filter(u => u.role === 'super_admin').length})
                </BitButton>
            </div>

            <BitCard style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>User Info</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Linked Club</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-app)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                            }}>
                                                {u.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div
                                                    style={{ fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}
                                                    onClick={() => navigate(`/profile/${u.id}`)}
                                                >
                                                    {u.full_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>{u.email}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <BitBadge variant={getRoleVariant(u.role)} label={u.role} />
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {u.club_id ? (
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                                {clubs.find(c => c.id === u.club_id)?.name || `Club #${u.club_id}`}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <BitButton
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openRoleModal(u)}
                                        >
                                            Change Role
                                        </BitButton>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No users found matching filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </BitCard>

            {/* Role Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)'
                }}>
                    <BitCard style={{ width: '100%', maxWidth: '500px', padding: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Change User Role</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                &times;
                            </button>
                        </div>

                        <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-muted)' }}>
                            Updating role for: <strong style={{ color: 'var(--text-main)' }}>{selectedUser?.full_name}</strong>
                        </p>

                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>New Role</label>
                            <select
                                value={roleData.role}
                                onChange={(e) => setRoleData({ ...roleData, role: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px',
                                    border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-app)', color: 'var(--text-main)'
                                }}
                            >
                                <option value="student">Student</option>
                                <option value="club_admin">Club Admin</option>
                                <option value="super_admin">Super Admin</option>
                            </select>
                        </div>

                        {roleData.role === 'club_admin' && (
                            <div style={{ marginBottom: 'var(--space-lg)' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Link to Club *</label>
                                <select
                                    value={roleData.club_id}
                                    onChange={(e) => setRoleData({ ...roleData, club_id: e.target.value })}
                                    style={{
                                        width: '100%', padding: '12px',
                                        border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                                        background: 'var(--bg-app)', color: 'var(--text-main)'
                                    }}
                                    required
                                >
                                    <option value="">Select a Club</option>
                                    {clubs.filter(c => c.status === 'active').map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
                            <BitButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</BitButton>
                            <BitButton variant="primary" onClick={handleRoleUpdate}>Save Changes</BitButton>
                        </div>
                    </BitCard>
                </div>
            )}
        </div>
    );
};

export default AdminUserManagement;
