import { ReactNode } from 'react';
import styles from './index.module.scss';

export type BadgeVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'muted';
export type BadgeSize = 'sm' | 'md' | 'lg';

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
};

export const Badge = ({
    children,
    variant = 'neutral',
    size = 'md',
    showDot = false,
    dotColor,
    className,
    style,
}: BadgeProps) => {
    const badgeClasses = [
        styles.badge,
        styles[`badge--${variant}`],
        styles[`badge--${size}`],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={badgeClasses} style={style}>
            {showDot && (
                <span
                    className={styles.dot}
                    style={dotColor ? { backgroundColor: dotColor } : undefined}
                />
            )}
            <span className={styles.text}>{children}</span>
        </div>
    );
};
