import React from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './index.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'none';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type TooltipPlace = 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    children?: React.ReactNode;
    isToolTip?: boolean;
    toolTipContent?: React.ReactNode;
    toolTipPlace?: TooltipPlace;
    toolTipMaxWidth?: number;
}

export const Button = ({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    className,
    children,
    isToolTip = false,
    toolTipContent,
    toolTipPlace = 'top-end',
    toolTipMaxWidth,
    ...props
}: ButtonProps) => {
    const buttonClasses = [
        styles.button,
        styles[`button--${variant}`],
        styles[`button--${size}`],
        loading && styles['button--loading'],
        fullWidth && styles['button--full-width'],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    // Generate unique tooltip ID
    const tooltipId = `tooltip-${Math.random().toString(36).substring(2, 9)}`;
    const tooltipStyle = toolTipMaxWidth && toolTipMaxWidth < 500 ? { width: `${toolTipMaxWidth}px` } : undefined;

    return (
        <>
            <button className={buttonClasses} disabled={disabled || loading} {...props}>
                {loading ? (
                    <svg className={styles['button__spinner']} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 20" />
                    </svg>
                ) : (
                    <>
                        {isToolTip && icon ? (
                            <div className={`tooltip-${tooltipId} tooltip-icon`} style={{ display: 'flex' }}>
                                <span className={styles['button__icon']}>{icon}</span>
                            </div>
                        ) : (
                            <>
                                {icon && iconPosition === 'left' && <span className={styles['button__icon']}>{icon}</span>}
                                {children && <span className={styles['button__text']}>{children}</span>}
                                {icon && iconPosition === 'right' && <span className={styles['button__icon']}>{icon}</span>}
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
};

// Icon Button Component
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> {
    icon: React.ReactNode;
    'aria-label': string;
}

export const IconButton = ({ icon, className, ...props }: IconButtonProps) => {
    const iconButtonClasses = [styles['icon-button'], className].filter(Boolean).join(' ');

    return (
        <Button {...props} className={iconButtonClasses}>
            {icon}
        </Button>
    );
};

Button.displayName = 'Button';
IconButton.displayName = 'IconButton';
