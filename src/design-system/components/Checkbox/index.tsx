import React, { forwardRef } from 'react';
import styles from './index.module.scss';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
    size?: CheckboxSize;
    label?: React.ReactNode;
    error?: string;
    helperText?: string;
    indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ size = 'md', label, error, helperText, indeterminate = false, className, disabled, id, checked, onKeyDown, onChange, ...props }, ref) => {
        const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

        const containerClasses = [styles['checkbox-container'], className].filter(Boolean).join(' ');

        const wrapperClasses = [
            styles['checkbox-wrapper'],
            styles[`checkbox-wrapper--${size}`],
            disabled && styles['checkbox-wrapper--disabled'],
            error && styles['checkbox-wrapper--error'],
        ]
            .filter(Boolean)
            .join(' ');

        const checkboxClasses = [styles.checkbox, styles[`checkbox--${size}`], disabled && styles['checkbox--disabled'], error && styles['checkbox--error']]
            .filter(Boolean)
            .join(' ');

        // Handle indeterminate state
        React.useEffect(() => {
            if (ref && 'current' in ref && ref.current) {
                ref.current.indeterminate = indeterminate;
            }
        }, [indeterminate, ref]);

        // Handle Enter key press to toggle checkbox
        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !disabled) {
                e.preventDefault();
                // Create a synthetic change event and trigger onChange
                const syntheticEvent = {
                    ...e,
                    target: { ...e.currentTarget, checked: !checked },
                    currentTarget: { ...e.currentTarget, checked: !checked },
                } as React.ChangeEvent<HTMLInputElement>;
                onChange?.(syntheticEvent);
            }
            // Call the original onKeyDown handler if provided
            onKeyDown?.(e);
        };

        return (
            <div className={containerClasses}>
                <label htmlFor={checkboxId} className={wrapperClasses}>
                    <input ref={ref} type="checkbox" id={checkboxId} className={checkboxClasses} disabled={disabled} checked={checked} {...props} onChange={onChange} onKeyDown={handleKeyDown} />
                    <span className={styles['checkbox-checkmark']}>
                        {indeterminate ? (
                            <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </span>
                    {label && <span className={styles['checkbox-label']}>{label}</span>}
                </label>
                {(error || helperText) && <div className={`${styles['checkbox-helper-text']} ${error ? styles['checkbox-helper-text--error'] : ''}`}>{error || helperText}</div>}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox';
