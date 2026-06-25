import type { ReactNode } from 'react';
import { Input } from '@/design-system/components';
import { parseEditorNumber } from './EditorFieldUtils';
import styles from '../PanelEditor.module.scss';

export function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{title}</span>
            </div>
            {children}
        </section>
    );
}

type NumberInputWidth = 'compact' | 'threshold' | 'standard';

const NUMBER_INPUT_WIDTH_CLASS: Record<NumberInputWidth, string> = {
    compact: styles.numberInputCompact,
    threshold: styles.numberInputThreshold,
    standard: styles.numberInputStandard,
};

export function NumberInput({
    value,
    onChange,
    disabled,
    width,
    size = 'sm',
    error,
    placeholder,
}: {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    disabled?: boolean;
    width?: NumberInputWidth;
    size?: 'sm' | 'md';
    error?: boolean;
    placeholder?: string;
}) {
    return (
        <Input
            type="number"
            disabled={disabled}
            value={value ?? ''}
            variant={error ? 'error' : 'default'}
            placeholder={placeholder}
            aria-invalid={error}
            onChange={(event) => onChange(parseEditorNumber(event.target.value))}
            size={size}
            className={width ? NUMBER_INPUT_WIDTH_CLASS[width] : undefined}
        />
    );
}
