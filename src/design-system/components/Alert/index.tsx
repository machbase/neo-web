import React from 'react';
import styles from './index.module.scss';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

export interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    message: string;
    icon?: React.ReactNode;
    onClose?: () => void;
    className?: string;
}

const defaultIcons: Record<AlertVariant, string> = {
    error: '⚠',
    warning: '⚠',
    info: 'ℹ',
    success: '✓',
};

export const Alert = ({ variant = 'error', title, message, icon, onClose, className }: AlertProps) => {
    if (!message || message.length === 0) return null;

    const alertClasses = [styles.alert, styles[`alert--${variant}`], className].filter(Boolean).join(' ');

    const displayIcon = icon !== undefined ? icon : defaultIcons[variant];

    return (
        <div className={alertClasses}>
            <div className={styles['alert__content']}>
                {displayIcon && <span className={styles['alert__icon']}>{displayIcon}</span>}
                <div className={styles['alert__text']}>
                    {title && <div className={styles['alert__title']}>{title}</div>}
                    <div className={styles['alert__message']}>{message}</div>
                </div>
                {onClose && (
                    <button className={styles['alert__close']} onClick={onClose} aria-label="Close alert">
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

Alert.displayName = 'Alert';
