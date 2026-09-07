import { createElement, type CSSProperties, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from 'react';
import styles from './Presentation.module.scss';

export function Text({
    as = 'span', variant = 'body', tone = 'inherited', weight, truncate,
    className, ...props
}: TextProps) {
    return createElement(as, {
        ...props,
        className: [styles.text, className].filter(Boolean).join(' '),
        'data-variant': variant,
        'data-tone': tone,
        'data-weight': weight,
        'data-truncate': truncate || undefined,
    });
}

export type LayoutGap = 0 | 2 | 4 | 8 | 12 | 16 | 24;

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'section';
    variant?: 'plain' | 'outlined' | 'inset';
    density?: 'compact' | 'normal';
};

export function Surface({
    as = 'div', variant = 'plain', density = 'normal', className, ...props
}: SurfaceProps) {
    return createElement(as, {
        ...props,
        className: [styles.surface, className].filter(Boolean).join(' '),
        'data-variant': variant,
        'data-density': density,
    });
}

export function Stack({ as: Tag = 'div', gap = 12, align = 'stretch', className, style, ...props }: LayoutProps) {
    return (
        <Tag
            {...props}
            className={[styles.stack, className].filter(Boolean).join(' ')}
            data-align={align}
            style={gapStyle(gap, style)}
        />
    );
}

export function Inline({
    as: Tag = 'div', gap = 8, align = 'center', justify = 'start', wrap, className, style, ...props
}: LayoutProps & { justify?: 'start' | 'center' | 'end' | 'between'; wrap?: boolean }) {
    return (
        <Tag
            {...props}
            className={[styles.inline, className].filter(Boolean).join(' ')}
            data-align={align}
            data-justify={justify}
            data-wrap={wrap || undefined}
            style={gapStyle(gap, style)}
        />
    );
}

export function Field({
    label, htmlFor, error, gap = 4, children, ...props
}: HTMLAttributes<HTMLDivElement> & {
    label?: ReactNode;
    htmlFor?: string;
    error?: ReactNode;
    gap?: LayoutGap;
}) {
    return (
        <Stack {...props} gap={gap}>
            {label !== undefined && (
                <Text as={htmlFor ? 'label' : 'div'} htmlFor={htmlFor} variant="label" tone="muted">
                    {label}
                </Text>
            )}
            {children}
            {error && <Text variant="caption" tone="danger">{error}</Text>}
        </Stack>
    );
}

export function Section({
    title, headerAddon, variant = 'plain', density = 'normal', gap,
    className, testId, children,
}: {
    title: string;
    headerAddon?: ReactNode;
    variant?: 'plain' | 'outlined' | 'inset';
    density?: 'compact' | 'normal';
    gap?: LayoutGap;
    className?: string;
    testId?: string;
    children: ReactNode;
}) {
    return (
        <Surface
            as="section"
            className={[styles.section, className].filter(Boolean).join(' ')}
            data-testid={testId}
            variant={variant}
            density={density}
            style={gap === undefined ? undefined : { gap }}
        >
            <Inline className={styles.sectionHeader}>
                <Text as="h4" variant="section" tone="default">{title}</Text>
                {headerAddon}
            </Inline>
            {children}
        </Surface>
    );
}

// -------------------- Local --------------------

type TextProps = HTMLAttributes<HTMLElement> & {
    as?: 'span' | 'p' | 'div' | 'h3' | 'h4' | 'label' | 'legend' | 'dt' | 'dd';
    htmlFor?: LabelHTMLAttributes<HTMLLabelElement>['htmlFor'];
    variant?: 'title' | 'section' | 'body' | 'label' | 'caption';
    tone?: 'inherited' | 'default' | 'secondary' | 'muted' | 'subtle' | 'danger' | 'warning';
    weight?: 'normal' | 'medium' | 'semibold';
    truncate?: boolean;
};

type Alignment = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type LayoutProps = HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'span' | 'section' | 'dl' | 'fieldset' | 'label';
    gap?: LayoutGap;
    align?: Alignment;
};

function gapStyle(gap: LayoutGap, style?: CSSProperties): CSSProperties {
    return { '--layout-gap': `${gap}px`, ...style } as CSSProperties;
}
