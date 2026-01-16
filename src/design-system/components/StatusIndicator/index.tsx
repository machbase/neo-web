import styles from './index.module.scss';

export type StatusIndicatorVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'running';
export type StatusIndicatorSize = 'sm' | 'md' | 'lg';

export interface StatusIndicatorProps {
    variant?: StatusIndicatorVariant;
    size?: StatusIndicatorSize;
    className?: string;
    style?: React.CSSProperties;
}

export const StatusIndicator = ({ variant = 'neutral', size = 'md', className, style }: StatusIndicatorProps) => {
    const indicatorClasses = [styles.statusIndicator, styles[`statusIndicator--${variant}`], styles[`statusIndicator--${size}`], className].filter(Boolean).join(' ');

    return <span className={indicatorClasses} style={style} />;
};

StatusIndicator.displayName = 'StatusIndicator';
