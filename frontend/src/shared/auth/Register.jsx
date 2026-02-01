import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student'
    });
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await register(formData.name, formData.email, formData.password, formData.role);
        if (res.success) {
            navigate('/login');
        } else {
            setError(res.message);
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">CM</div>
                        <h2 className="auth-title">Create Account</h2>
                        <p className="auth-subtitle">Join thousands of students on campus</p>
                    </div>

                    {error && (
                        <div className="alert-custom alert-danger">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-control-custom"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="John Doe"
                                autoComplete="name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-control-custom"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="you@university.edu"
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-control-custom"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Create a strong password"
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <input type="hidden" name="role" value="student" />
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="auth-footer">
                        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
