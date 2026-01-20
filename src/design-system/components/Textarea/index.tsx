import React, { forwardRef } from 'react';
import styles from './index.module.scss';

export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaVariant = 'default' | 'error' | 'success';
export type TextareaLabelPosition = 'top' | 'left';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
    size?: TextareaSize;
    variant?: TextareaVariant;
    error?: string;
    label?: string | React.ReactNode;
    labelPosition?: TextareaLabelPosition;
    helperText?: string;
    fullWidth?: boolean;
    resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        { size = 'md', variant = 'default', error, label, labelPosition = 'top', helperText, fullWidth = false, resize = 'vertical', className, disabled, id, style, ...props },
        ref
    ) => {
        const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
        const finalVariant = error ? 'error' : variant;

        const containerClasses = [
            styles['textarea-container'],
            styles[`textarea-container--label-${labelPosition}`],
            fullWidth && styles['textarea-container--full-width'],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const wrapperClasses = [
            styles['textarea-wrapper'],
            styles[`textarea-wrapper--${size}`],
            styles[`textarea-wrapper--${finalVariant}`],
            disabled && styles['textarea-wrapper--disabled'],
        ]
            .filter(Boolean)
            .join(' ');

        const textareaClasses = [styles.textarea, styles[`textarea--resize-${resize}`]].filter(Boolean).join(' ');

        const labelElement = label && (
            <label htmlFor={textareaId} className={styles['textarea-label']}>
                {label}
            </label>
        );

        const textareaElement = (
            <div className={wrapperClasses} style={style}>
                <textarea ref={ref} id={textareaId} className={textareaClasses} disabled={disabled} {...props} />
            </div>
        );

        return (
            <div className={containerClasses}>
                {labelPosition === 'top' && labelElement}
                <div className={styles['textarea-field-wrapper']}>
                    {labelPosition === 'left' && labelElement}
                    {textareaElement}
                </div>
                {(error || helperText) && <div className={`${styles['textarea-helper-text']} ${error ? styles['textarea-helper-text--error'] : ''}`}>{error || helperText}</div>}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
