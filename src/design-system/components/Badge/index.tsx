import React, { ReactNode } from 'react';
import { Tooltip } from 'react-tooltip';
import styles from './index.module.scss';

export type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'muted';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type TooltipPlace = 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end';

export type BadgeProps = {
    /** The content to display in the badge */
    children: ReactNode;
    /** Visual style variant */
    variant?: BadgeVariant;
    /** Size of the badge */
    size?: BadgeSize;
    /** Show a dot indicator on the left */
    showDot?: boolean;
    /** Custom dot color (overrides variant color) */
    dotColor?: string;
    /** Additional CSS class */
    className?: string;
    /** Additional inline styles */
    style?: React.CSSProperties;
    /** Enable tooltip */
    isToolTip?: boolean;
    /** Tooltip content */
    toolTipContent?: React.ReactNode;
    /** Tooltip placement */
    toolTipPlace?: TooltipPlace;
    /** Tooltip max width */
    toolTipMaxWidth?: number;
};

export const Badge = ({
    children,
    variant = 'neutral',
    size = 'md',
    showDot = false,
    dotColor,
    className,
    style,
    isToolTip = false,
    toolTipContent,
    toolTipPlace = 'top',
    toolTipMaxWidth,
}: BadgeProps) => {
    const badgeClasses = [
        styles.badge,
        styles[`badge--${variant}`],
        styles[`badge--${size}`],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    // Generate unique IDs (replace colons for CSS selector compatibility)
    const uniqueId = React.useId().replace(/:/g, '');
    const tooltipId = `badge-tooltip-${uniqueId}`;
    const tooltipStyle = toolTipMaxWidth && toolTipMaxWidth < 500 ? { width: `${toolTipMaxWidth}px` } : undefined;

    return (
        <>
            <div className={`${badgeClasses}${isToolTip ? ` tooltip-${tooltipId}` : ''}`} style={style}>
                {showDot && (
                    <span
                        className={styles.dot}
                        style={dotColor ? { backgroundColor: dotColor } : undefined}
                    />
                )}
                <span className={styles.text}>{children}</span>
            </div>
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
