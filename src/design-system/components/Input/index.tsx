import React, { forwardRef } from 'react';
import styles from './index.module.scss';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'error' | 'success';
export type InputLabelPosition = 'top' | 'left';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    size?: InputSize;
    variant?: InputVariant;
    error?: string;
    label?: string | React.ReactNode;
    labelPosition?: InputLabelPosition;
    helperText?: string;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            size = 'md',
            variant = 'default',
            error,
            label,
            labelPosition = 'top',
            helperText,
            fullWidth = false,
            leftIcon,
            rightIcon,
            className,
            disabled,
            id,
            style,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
        const finalVariant = error ? 'error' : variant;

        const containerClasses = [
            styles['input-container'],
            styles[`input-container--label-${labelPosition}`],
            fullWidth && styles['input-container--full-width'],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const wrapperClasses = [
            styles['input-wrapper'],
            styles[`input-wrapper--${size}`],
            styles[`input-wrapper--${finalVariant}`],
            disabled && styles['input-wrapper--disabled'],
            leftIcon && styles['input-wrapper--has-left-icon'],
            rightIcon && styles['input-wrapper--has-right-icon'],
        ]
            .filter(Boolean)
            .join(' ');

        const labelElement = label && (
            <label htmlFor={inputId} className={styles['input-label']}>
                {label}
            </label>
        );

        const inputElement = (
            <div className={wrapperClasses} style={style}>
                {leftIcon && <span className={styles['input-icon--left']}>{leftIcon}</span>}
                <input ref={ref} id={inputId} className={styles.input} disabled={disabled} {...props} />
                {rightIcon && <span className={styles['input-icon--right']}>{rightIcon}</span>}
            </div>
        );

        return (
            <div className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['input-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    {inputElement}
                </div>
                {(error || helperText) && (
                    <div className={`${styles['input-helper-text']} ${error ? styles['input-helper-text--error'] : ''}`}>
                        {error || helperText}
                    </div>
                )}
            </div>
        );
});

Input.displayName = 'Input';
