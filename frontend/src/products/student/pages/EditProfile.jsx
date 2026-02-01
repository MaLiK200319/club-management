import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, authService } from '../../../services/apiService';
import './EditProfile.css';

function EditProfile() {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();

    const [formData, setFormData] = useState({
        full_name: '',
        student_id: '',
        major: '',
        year_level: '',
        bio: '',
        interests: ''
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await userService.getProfile(currentUser.id);
            const profile = response.data;
            setFormData({
                full_name: profile.full_name || '',
                student_id: profile.student_id || '',
                major: profile.major || '',
                year_level: profile.year_level || '',
                bio: profile.bio || '',
                interests: profile.interests || ''
            });

            if (profile.avatar_url) {
                setAvatarPreview(`http://localhost/stage_raed/backend${profile.avatar_url}`);
            }
        } catch (err) {
            console.error('Failed to load profile:', err);
            setMessage({ type: 'error', text: 'Failed to load profile' });
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'File size must be less than 5MB' });
                return;
            }

            if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
                setMessage({ type: 'error', text: 'Only JPG, PNG, and GIF files are allowed' });
                return;
            }

            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Update profile info
            await userService.updateProfile(currentUser.id, formData);

            // Upload avatar if selected
            if (avatarFile) {
                const formDataAvatar = new FormData();
                formDataAvatar.append('avatar', avatarFile);
                await userService.uploadAvatar(currentUser.id, formDataAvatar);
            }

            // Update local storage
            const updatedUser = { ...currentUser, full_name: formData.full_name };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setMessage({ type: 'success', text: 'Profile updated successfully!' });

            setTimeout(() => {
                navigate('/profile');
            }, 1500);
        } catch (err) {
            console.error('Failed to update profile:', err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="edit-profile-container">
            <div className="edit-profile-card">
                <h1>✏️ Edit Profile</h1>

                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Avatar Upload */}
                    <div className="avatar-upload-section">
                        <label>Profile Picture</label>
                        <div className="avatar-upload-wrapper">
                            <div className="avatar-preview">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {formData.full_name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="avatar-upload-controls">
                                <input
                                    type="file"
                                    id="avatar"
                                    accept="image/jpeg,image/jpg,image/png,image/gif"
                                    onChange={handleAvatarChange}
                                    hidden
                                />
                                <label htmlFor="avatar" className="btn btn-upload">
                                    📸 Choose Photo
                                </label>
                                <p className="upload-hint">Max 5MB • JPG, PNG, GIF</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Student ID</label>
                            <input
                                type="text"
                                name="student_id"
                                value={formData.student_id}
                                onChange={handleInputChange}
                                placeholder="e.g., STU202400001"
                            />
                        </div>

                        <div className="form-group">
                            <label>Major</label>
                            <input
                                type="text"
                                name="major"
                                value={formData.major}
                                onChange={handleInputChange}
                                placeholder="e.g., Computer Science"
                            />
                        </div>

                        <div className="form-group">
                            <label>Year Level</label>
                            <select
                                name="year_level"
                                value={formData.year_level}
                                onChange={handleInputChange}
                            >
                                <option value="">Select year level</option>
                                <option value="Freshman">Freshman</option>
                                <option value="Sophomore">Sophomore</option>
                                <option value="Junior">Junior</option>
                                <option value="Senior">Senior</option>
                                <option value="Graduate">Graduate</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            rows="4"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Interests</label>
                        <input
                            type="text"
                            name="interests"
                            value={formData.interests}
                            onChange={handleInputChange}
                            placeholder="Separate with commas (e.g., coding, music, sports)"
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/profile')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : '💾 Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditProfile;
