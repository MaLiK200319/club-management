import React from 'react';
import './BitCard.css';

/**
 * Standard Card Component
 * @param {string} title - Optional header title
 * @param {string} subtitle - Optional header subtitle
 * @param {boolean} clickable - Adds hover effect and pointer cursor
 * @param {ReactNode} actions - Component to render in header right
 * @param {ReactNode} footer - Component to render in footer slot
 */
const BitCard = ({
    children,
    title,
    subtitle,
    clickable = false,
    actions,
    footer,
    className = '',
    onClick,
    ...props
}) => {
    return (
        <div
            className={`bit-card ${clickable ? 'clickable' : ''} ${className}`}
            onClick={onClick}
            {...props}
        >
            {(title || actions) && (
                <div className="bit-card-header">
                    <div className="bit-card-header-content">
                        {title && <h3 className="bit-card-title">{title}</h3>}
                        {subtitle && <p className="bit-card-subtitle">{subtitle}</p>}
                    </div>
                    {actions && <div className="bit-card-actions">{actions}</div>}
                </div>
            )}

            <div className="bit-card-body">
                {children}
            </div>

            {footer && (
                <div className="bit-card-footer">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default BitCard;
