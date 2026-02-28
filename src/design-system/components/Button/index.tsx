import React, { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './index.module.scss';
import { Check, Copy } from '@/assets/icons/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'none';
export type ButtonSize = 'xsm' | 'sm' | 'md' | 'lg' | 'icon' | 'fit' | 'side';
export type TooltipPlace = 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end';
export type LabelPosition = 'left' | 'right' | 'top';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    active?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    children?: React.ReactNode;
    isToolTip?: boolean;
    toolTipContent?: React.ReactNode;
    toolTipPlace?: TooltipPlace;
    toolTipMaxWidth?: number;
    forceOpacity?: boolean;
    shadow?: boolean;
    label?: React.ReactNode;
    labelPosition?: LabelPosition;
}

export const Button = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    active = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    className,
    children,
    isToolTip = false,
    toolTipContent,
    toolTipPlace = 'top-end',
    toolTipMaxWidth,
    forceOpacity = false,
    shadow = false,
    label,
    labelPosition = 'left',
    ...props
}: ButtonProps) => {
    const buttonClasses = [
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        loading && styles['button--loading'],
        active && styles['button--active'],
        fullWidth && styles['button--full-width'],
        forceOpacity && styles['button--force-opacity'],
        shadow && styles['button--shadow'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    // Generate unique IDs (replace colons for CSS selector compatibility)
    const uniqueId = React.useId().replace(/:/g, '');
    const buttonId = props.id || (label ? `button-${uniqueId}` : undefined);
    const tooltipId = `tooltip-${uniqueId}`;
    const tooltipStyle = toolTipMaxWidth && toolTipMaxWidth < 500 ? { width: `${toolTipMaxWidth}px` } : undefined;

    const buttonElement = (
        <>
            <button id={buttonId} className={buttonClasses} disabled={disabled || loading} {...props}>
                {loading ? (
                    <svg className={styles['button__spinner']} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 20" />
                    </svg>
                ) : (
                    <>
                        {isToolTip && icon ? (
                            <div className={`tooltip-${tooltipId} tooltip-icon`} style={{ display: 'flex' }}>
                                <div className={styles['button__icon']}>{icon}</div>
                            </div>
                        ) : (
                            <>
                                {icon && iconPosition === 'left' && <div className={styles['button__icon']}>{icon}</div>}
                                {children && <div className={styles['button__text']}>{children}</div>}
                                {icon && iconPosition === 'right' && <div className={styles['button__icon']}>{icon}</div>}
                            </>
                        )}
                    </>
                )}
            </button>
            {isToolTip && toolTipContent && (
                <Tooltip
                    className="tooltip-div"
                    place={toolTipPlace}
                    positionStrategy="absolute"
                    anchorSelect={`.tooltip-${tooltipId}`}
                    content={typeof toolTipContent === 'string' ? toolTipContent : undefined}
                    style={tooltipStyle}
                    delayShow={700}
                >
                    {typeof toolTipContent !== 'string' ? toolTipContent : undefined}
                </Tooltip>
            )}
        </>
    );

    if (label) {
        const wrapperClasses = [styles['button-with-label'], styles[`button-with-label--${labelPosition}`], fullWidth && styles['button-with-label--full-width']]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={wrapperClasses}>
                <label htmlFor={buttonId} className={styles['button-label']}>
                    {label}
                </label>
                {buttonElement}
            </div>
        );
    }

    return buttonElement;
};

// Icon Button Component
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> {
    icon: React.ReactNode;
    'aria-label': string;
}

export const IconButton = ({ icon, className, ...props }: IconButtonProps) => {
    const iconButtonClasses = [styles['icon-button'], className].filter(Boolean).join(' ');

    return <Button {...props} icon={icon} className={iconButtonClasses} />;
};

// Button Group Component
export interface ButtonGroupProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    fullWidth?: boolean;
    label?: string;
    labelPosition?: 'top' | 'left';
}

export const ButtonGroup = ({ children, className, style, fullWidth = false, label, labelPosition = 'top' }: ButtonGroupProps) => {
    const groupClasses = [styles['button-group'], fullWidth && styles['button-group--full-width'], className].filter(Boolean).join(' ');

    const containerClasses = [
        styles['button-group-container'],
        label && styles[`button-group-container--label-${labelPosition}`],
        fullWidth && styles['button-group-container--full-width'],
    ]
        .filter(Boolean)
        .join(' ');

    if (label) {
        return (
            <div className={containerClasses}>
                {label && <label className={styles['button-group-label']}>{label}</label>}
                <div className={groupClasses} style={style}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={groupClasses} style={style}>
            {children}
        </div>
    );
};

// Copy Button Component
export interface CopyButtonProps extends Omit<ButtonProps, 'icon' | 'onClick'> {
    onClick: () => void;
    'aria-label'?: string;
}

export const CopyButton = ({ onClick, className, ...props }: CopyButtonProps) => {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => {
                setIsCopied(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    const handleClick = () => {
        onClick();
        setIsCopied(true);
    };

    return <Button {...props} icon={isCopied ? <Check size={14} /> : <Copy size={12} />} onClick={handleClick} className={className} />;
};

// Attach components as static properties
Button.Group = ButtonGroup;
Button.Copy = CopyButton;
Button.displayName = 'Button';
IconButton.displayName = 'IconButton';
ButtonGroup.displayName = 'ButtonGroup';
CopyButton.displayName = 'CopyButton';
