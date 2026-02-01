import React from 'react';
import './BitButton.css';

/**
 * Standard Button Component for the application.
 * @param {string} variant - primary, secondary, ghost, danger
 * @param {string} size - sm, md, lg
 * @param {boolean} isLoading - Shows spinner
 * @param {ReactNode} leftIcon - Icon to show on the left
 */
const BitButton = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled,
    className = '',
    onClick,
    type = 'button',
    ...props
}) => {
    const baseClass = `bit-btn bit-btn-${variant} bit-btn-${size}`;
    const loadingClass = isLoading ? 'bit-btn-loading' : '';

    return (
        <button
            type={type}
            className={`${baseClass} ${loadingClass} ${className}`}
            disabled={disabled || isLoading}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default BitButton;
