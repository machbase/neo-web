import type { CSSProperties, ReactNode } from 'react';
import { Input } from '@/design-system/components';
import { parseEditorNumber } from './EditorFieldUtils';
import styles from '../PanelEditor.module.scss';

export function Section({
    title,
    headerAddon,
    children,
}: {
    title: string;
    headerAddon?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{title}</span>
                {headerAddon}
            </div>
            {children}
        </section>
    );
}

type NumberInputWidth = 'compact' | 'threshold' | 'standard' | 'auto';

const NUMBER_INPUT_WIDTH_CLASS: Record<
    Exclude<NumberInputWidth, 'auto'>,
    string
> = {
    compact: styles.numberInputCompact,
    threshold: styles.numberInputThreshold,
    standard: styles.numberInputStandard,
};
const AUTO_NUMBER_INPUT_MIN_WIDTH_PX = 48;
const AUTO_NUMBER_INPUT_MAX_WIDTH_PX = 180;
const AUTO_NUMBER_INPUT_WIDTH_PADDING_PX = 28;
const AUTO_NUMBER_INPUT_MIN_CHARACTER_COUNT = 2;
const AUTO_NUMBER_INPUT_EXTRA_CHARACTER_COUNT = 2;

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
    const sAutoWidthStyle =
        width === 'auto'
            ? createAutoNumberInputStyle(value, placeholder)
            : undefined;
    const sWidthClass =
        width && width !== 'auto'
            ? NUMBER_INPUT_WIDTH_CLASS[width]
            : undefined;

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
            className={sWidthClass}
            style={sAutoWidthStyle}
        />
    );
}

function createAutoNumberInputStyle(
    value: number | undefined,
    placeholder: string | undefined,
): CSSProperties {
    const sDisplayValue = value === undefined ? placeholder ?? '' : String(value);
    const sCharacterCount = Math.max(
        AUTO_NUMBER_INPUT_MIN_CHARACTER_COUNT,
        sDisplayValue.length + AUTO_NUMBER_INPUT_EXTRA_CHARACTER_COUNT,
    );

    return {
        width: `calc(${sCharacterCount}ch + ${AUTO_NUMBER_INPUT_WIDTH_PADDING_PX}px)`,
        minWidth: AUTO_NUMBER_INPUT_MIN_WIDTH_PX,
        maxWidth: AUTO_NUMBER_INPUT_MAX_WIDTH_PX,
    };
}
