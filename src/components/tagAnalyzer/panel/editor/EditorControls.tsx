import type { ReactNode } from 'react';
import { Input } from '@/design-system/components';
import styles from './PanelEditor.module.scss';

export function Section({
    title,
    headerAddon,
    className,
    children,
}: {
    title: string;
    headerAddon?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            className={[styles.section, className].filter(Boolean).join(' ')}
        >
            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>{title}</span>
                {headerAddon}
            </div>
            {children}
        </section>
    );
}

const NUMBER_INPUT_WIDTH_CLASS = {
    compact: styles.numberInputCompact,
    threshold: styles.numberInputThreshold,
    standard: styles.numberInputStandard,
    auto: undefined,
} as const;

type NumberInputWidth = keyof typeof NUMBER_INPUT_WIDTH_CLASS;

export function NumberInput({
    value,
    onChange,
    disabled,
    width,
    error,
    placeholder,
}: {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    disabled?: boolean;
    width: NumberInputWidth;
    error?: boolean;
    placeholder?: string;
}) {
    const sCharacterCount = Math.max(
        2,
        (value === undefined ? placeholder ?? '' : String(value)).length + 2,
    );

    return (
        <Input
            type="number"
            disabled={disabled}
            value={value ?? ''}
            variant={error ? 'error' : 'default'}
            placeholder={placeholder}
            aria-invalid={error}
            onChange={(event) =>
                onChange(
                    event.target.value === ''
                        ? undefined
                        : Number(event.target.value),
                )
            }
            size="sm"
            className={NUMBER_INPUT_WIDTH_CLASS[width]}
            style={
                width === 'auto'
                    ? {
                          width: `calc(${sCharacterCount}ch + 28px)`,
                          minWidth: 48,
                          maxWidth: 180,
                      }
                    : undefined
            }
        />
    );
}
