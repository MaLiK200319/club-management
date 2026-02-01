import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import './Clubs.css';

const Clubs = () => {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchClubs();
    }, []);

    const fetchClubs = async () => {
        try {
            const response = await api.get('/clubs');
            setClubs(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching clubs:', error);
            setLoading(false);
        }
    };

    const categories = ['all', 'Technology', 'Arts', 'Sports', 'Business', 'Environment'];

    const filteredClubs = clubs.filter(club => {
        const matchesCategory = filter === 'all' || club.category === filter;
        const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            club.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getCategoryIcon = (category) => {
        const icons = {
            'Technology': '💻',
            'Arts': '🎨',
            'Sports': '⚽',
            'Business': '💼',
            'Environment': '🌱',
        };
        return icons[category] || '🎯';
    };

    if (loading) {
        return (
            <div className="clubs-page">
                <div className="container">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading clubs...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="clubs-page">
            <div className="clubs-header">
                <div className="container">
                    <h1 className="page-title">Discover Clubs</h1>
                    <p className="page-subtitle">Find your community and explore your passions</p>

                    <div className="clubs-controls">
                        <div className="search-box">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                                <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search clubs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="category-filters">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    className={`filter-btn ${filter === category ? 'active' : ''}`}
                                    onClick={() => setFilter(category)}
                                >
                                    {category === 'all' ? 'All' : category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <section className="clubs-grid-section">
                <div className="container">
                    {filteredClubs.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔍</div>
                            <h3>No clubs found</h3>
                            <p>Try adjusting your filters or search query</p>
                        </div>
                    ) : (
                        <div className="clubs-grid">
                            {filteredClubs.map(club => (
                                <div key={club.id} className="club-card">
                                    <div className="club-card-header">
                                        <div className="club-icon">
                                            {getCategoryIcon(club.category)}
                                        </div>
                                        <span className="club-category">{club.category}</span>
                                    </div>
                                    <h3 className="club-name">{club.name}</h3>
                                    <p className="club-description">
                                        {club.description.length > 120
                                            ? club.description.substring(0, 120) + '...'
                                            : club.description}
                                    </p>
                                    <div className="club-card-footer">
                                        <div className="club-members">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M8 8C9.66 8 11 6.66 11 5C11 3.34 9.66 2 8 2C6.34 2 5 3.34 5 5C5 6.66 6.34 8 8 8ZM8 9.5C5.67 9.5 1 10.67 1 13V14H15V13C15 10.67 10.33 9.5 8 9.5Z" fill="currentColor" />
                                            </svg>
                                            <span>{club.member_count || 0} members</span>
                                        </div>
                                        <Link to={`/clubs/${club.id}`} className="btn-view-club">
                                            View Club
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Clubs;
