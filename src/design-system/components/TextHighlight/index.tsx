import { ReactNode } from 'react';
import styles from './index.module.scss';

export type TextHighlightVariant = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'muted';

export type TextHighlightProps = {
    /** The text content to highlight */
    children: ReactNode;
    /** Visual style variant */
    variant?: TextHighlightVariant;
    /** Additional CSS class */
    className?: string;
    /** Additional inline styles */
    style?: React.CSSProperties;
};

export const TextHighlight = ({ children, variant = 'neutral', className, style }: TextHighlightProps) => {
    const highlightClasses = [styles.textHighlight, styles[`textHighlight--${variant}`], className].filter(Boolean).join(' ');

    return (
        <span className={highlightClasses} style={style}>
            {children}
        </span>
    );
};
