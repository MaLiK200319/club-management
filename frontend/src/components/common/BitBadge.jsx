import React from 'react';
import './BitBadge.css';

/**
 * Standard Status Badge
 * @param {string} variant - success, warning, danger, info, bg
 */
const BitBadge = ({
    label,
    variant = 'bg',
    className = ''
}) => {
    return (
        <span className={`bit-badge bit-badge-${variant} ${className}`}>
            {label}
        </span>
    );
};

export default BitBadge;
