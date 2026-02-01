import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { ToastContext } from '../../../context/ToastContext';
import { authService, userService, membershipService } from '../../../services/apiService';
import './Profile.css';

function Profile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const userId = id || currentUser?.id;
    const isOwnProfile = !id || parseInt(id) === parseInt(currentUser?.id);

    const [profile, setProfile] = useState(null);
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (userId) {
            fetchProfile();
            fetchUserClubs();
        }
    }, [userId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await userService.getProfile(userId);
            setProfile(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to load profile');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserClubs = async () => {
        try {
            const response = await membershipService.getUserClubs(userId);
            setClubs(response.data);
        } catch (err) {
            console.error('Failed to load clubs:', err);
        }
    };

    if (loading) {
        return (
            <div className="profile-container">
                <div className="loading-spinner">Loading profile...</div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="profile-container">
                <div className="error-message">{error || 'Profile not found'}</div>
            </div>
        );
    }

    const approvedClubs = Array.isArray(clubs) ? clubs.filter(c => c.membership_status === 'approved') : [];
    const pendingClubs = Array.isArray(clubs) ? clubs.filter(c => c.membership_status === 'pending') : [];

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="profile-avatar-section">
                    <div className="profile-avatar">
                        {profile.avatar_url ? (
                            <img src={`http://localhost/stage_raed/backend${profile.avatar_url}`} alt={profile.full_name} />
                        ) : (
                            <div className="avatar-placeholder">
                                {profile.full_name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    {isOwnProfile && (
                        <button
                            className="btn btn-edit-profile"
                            onClick={() => navigate('/profile/edit')}
                        >
                            ✏️ Edit Profile
                        </button>
                    )}
                </div>

                <div className="profile-info">
                    <h1 className="profile-name">{profile.full_name}</h1>
                    <p className="profile-role">
                        {profile.role === 'admin' ? '👑 Administrator' : '🎓 Student'}
                    </p>

                    <div className="profile-details">
                        {profile.student_id && (
                            <div className="profile-detail-item">
                                <span className="label">Student ID:</span>
                                <span className="value">{profile.student_id}</span>
                            </div>
                        )}
                        {profile.major && (
                            <div className="profile-detail-item">
                                <span className="label">Major:</span>
                                <span className="value">{profile.major}</span>
                            </div>
                        )}
                        {profile.year_level && (
                            <div className="profile-detail-item">
                                <span className="label">Year:</span>
                                <span className="value">{profile.year_level}</span>
                            </div>
                        )}
                        <div className="profile-detail-item">
                            <span className="label">Email:</span>
                            <span className="value">{profile.email}</span>
                        </div>
                        <div className="profile-detail-item">
                            <span className="label">Joined:</span>
                            <span className="value">
                                {new Date(profile.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {profile.bio && (
                        <div className="profile-bio">
                            <h3>Bio</h3>
                            <p>{profile.bio}</p>
                        </div>
                    )}

                    {profile.interests && (
                        <div className="profile-interests">
                            <h3>Interests</h3>
                            <div className="interests-tags">
                                {profile.interests.split(',').map((interest, index) => (
                                    <span key={index} className="interest-tag">
                                        {interest.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="profile-clubs-section">
                <h2>
                    {isOwnProfile ? 'My Clubs' : `${profile.full_name?.split(' ')[0] || 'User'}'s Clubs`}
                </h2>

                {approvedClubs.length > 0 ? (
                    <div className="clubs-grid">
                        {approvedClubs.map(club => (
                            <div
                                key={club.club_id}
                                className="club-card"
                                onClick={() => navigate(`/clubs/${club.club_id}`)}
                            >
                                {club.logo_url && (
                                    <img src={club.logo_url} alt={club.name} className="club-logo" />
                                )}
                                <h3>{club.name}</h3>
                                <p className="club-category">{club.category}</p>
                                <span className="club-role-badge">{club.membership_role}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>
                            {isOwnProfile
                                ? "You haven't joined any clubs yet."
                                : "No clubs yet."}
                        </p>
                        {isOwnProfile && (
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/clubs')}
                            >
                                Browse Clubs
                            </button>
                        )}
                    </div>
                )}

                {isOwnProfile && pendingClubs.length > 0 && (
                    <div className="pending-clubs-section">
                        <h3>Pending Membership Requests</h3>
                        <div className="pending-clubs-list">
                            {pendingClubs.map(club => (
                                <div key={club.club_id} className="pending-club-item">
                                    <span>{club.name}</span>
                                    <span className="status-pending">⏳ Pending Approval</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Profile;
