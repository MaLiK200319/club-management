import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Home.css';

const Home = () => {
    const { user } = useContext(AuthContext);

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-gradient"></div>
                <div className="container hero-content">
                    <div className="row align-items-center min-vh-100 py-5">
                        <div className="col-lg-6 hero-text">
                            <div className="badge-pill mb-4">
                                <span className="pulse-dot"></span>
                                Connecting Campus Communities
                            </div>
                            <h1 className="hero-title">
                                Discover & Join
                                <span className="gradient-text"> Amazing Clubs</span>
                            </h1>
                            <p className="hero-description">
                                Your gateway to university life. Explore clubs, attend events, and build
                                connections that last a lifetime.
                            </p>
                            <div className="hero-actions">
                                {user ? (
                                    <Link to="/dashboard" className="btn-primary-custom">
                                        Go to Dashboard
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </Link>
                                ) : (
                                    <>
                                        <Link to="/register" className="btn-primary-custom">
                                            Get Started
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </Link>
                                        <Link to="/clubs" className="btn-secondary-custom">
                                            Explore Clubs
                                        </Link>
                                    </>
                                )}
                            </div>
                            <div className="stats-row">
                                <div className="stat-item">
                                    <div className="stat-number">50+</div>
                                    <div className="stat-label">Active Clubs</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">1000+</div>
                                    <div className="stat-label">Members</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-number">200+</div>
                                    <div className="stat-label">Events/Year</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6 hero-visual">
                            <div className="floating-cards">
                                <div className="floating-card card-1">
                                    <div className="card-icon">🎨</div>
                                    <div className="card-title">Arts & Culture</div>
                                    <div className="card-members">250+ members</div>
                                </div>
                                <div className="floating-card card-2">
                                    <div className="card-icon">💻</div>
                                    <div className="card-title">Tech & Innovation</div>
                                    <div className="card-members">400+ members</div>
                                </div>
                                <div className="floating-card card-3">
                                    <div className="card-icon">⚽</div>
                                    <div className="card-title">Sports & Fitness</div>
                                    <div className="card-members">350+ members</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Everything You Need</h2>
                        <p className="section-description">
                            Powerful tools to enhance your campus experience
                        </p>
                    </div>
                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                        <rect x="5" y="5" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="2" />
                                        <path d="M15 20L18 23L25 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Easy Registration</h3>
                                <p className="feature-description">
                                    Join clubs and register for events with just one click. Track everything in your personalized dashboard.
                                </p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                        <circle cx="20" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                                        <path d="M10 32C10 25.373 14.477 20 20 20C25.523 20 30 25.373 30 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Build Your Profile</h3>
                                <p className="feature-description">
                                    Showcase your interests, track your participation, and build a portfolio of campus involvement.
                                </p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="feature-card">
                                <div className="feature-icon">
                                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                        <rect x="8" y="8" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
                                        <path d="M8 16H32M16 8V32" stroke="currentColor" strokeWidth="2" />
                                    </svg>
                                </div>
                                <h3 className="feature-title">Discover Events</h3>
                                <p className="feature-description">
                                    Never miss out. Get personalized recommendations and instant notifications for upcoming events.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!user && (
                <section className="cta-section">
                    <div className="container">
                        <div className="cta-card">
                            <div className="cta-content">
                                <h2 className="cta-title">Ready to Get Started?</h2>
                                <p className="cta-description">
                                    Join thousands of students making the most of their university experience.
                                </p>
                                <Link to="/register" className="btn-primary-custom">
                                    Create Your Account
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;
