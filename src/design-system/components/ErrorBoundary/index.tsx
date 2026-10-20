import { Component, CSSProperties, ReactNode } from 'react';
import { Button } from '../Button';
import styles from './index.module.scss';

export type ErrorBoundaryVariant = 'region' | 'tab' | 'unit' | 'inline';

export interface ErrorBoundaryAction {
    label: string;
    onClick: () => void;
    /** Local test ID inside the card (LOCATOR_POLICY: scoped under the card's own ID). */
    testId: string;
}

export interface ErrorBoundaryProps {
    /** Tag for the console line and the card's test ID, e.g. `tab:sql:a.sql`, `dsh-panel:<id>`. */
    name: string;
    /** Fallback density: a whole layout region, one tab body, one panel/cell, or one row-sized item (a tab, a tree row, a log line). */
    variant: ErrorBoundaryVariant;
    /** Clears the error when any value changes (shallow compare). */
    resetKeys?: unknown[];
    /** Buttons shown after Retry — the way out when a retry keeps failing (Close tab, Delete panel …). */
    actions?: ErrorBoundaryAction[];
    onError?: (aError: Error) => void;
    /** Called when the error is cleared (Retry or a reset key change). */
    onReset?: () => void;
    /** Sizing for the error card where its parent does not give it any (e.g. a shrink-to-fit root). */
    fallbackStyle?: CSSProperties;
    children: ReactNode;
}

interface State {
    error: Error | null;
}

const TITLES: Record<ErrorBoundaryVariant, string> = {
    region: 'This area failed to render.',
    tab: 'This tab failed to render.',
    unit: 'Failed to render.',
    inline: "Can't show this item.",
};

// A region or tab fails alone, so it may interrupt a screen reader. Panels and cells can fail many at
// once (one bad option shared by a board), and an alert each would read the same line over and over:
// those are labelled groups, read when reached instead of announced.
const ROLE_PROPS: Record<ErrorBoundaryVariant, { role: string; 'aria-label'?: string }> = {
    region: { role: 'alert' },
    tab: { role: 'alert' },
    unit: { role: 'group', 'aria-label': TITLES.unit },
    inline: { role: 'group', 'aria-label': TITLES.inline },
};

const changed = (aPrev: unknown[] = [], aNext: unknown[] = []) => aPrev.length !== aNext.length || aPrev.some((aItem, aIdx) => !Object.is(aItem, aNext[aIdx]));

/**
 * Keeps a render error inside the area that threw it, so the rest of the app stays usable.
 *
 * NOT LOGGED TO THE CONSOLE PANEL HERE. React already passes every caught error to `console.error`
 * (dev and prod builds alike), and the app forwards `console.error` to the console panel
 * (`UncaughtErrorObserver`). Writing to the panel as well would print each error twice, so this
 * only adds the one line that says *where* it happened.
 *
 * Only render/lifecycle errors are caught. Event handlers, async calls and timers still go to
 * `window.onerror` as before.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
    state: State = { error: null };

    static getDerivedStateFromError(aError: Error): State {
        return { error: aError };
    }

    componentDidCatch(aError: Error) {
        // Two arguments: the console panel prints `${message} ${loc}`, so a single one ends in "undefined".
        console.error(`[ErrorBoundary:${this.props.name}]`, aError?.message ?? String(aError));
        this.props.onError?.(aError);
    }

    componentDidUpdate(aPrevProps: ErrorBoundaryProps, aPrevState: State) {
        // Only an error that was already showing: when the keys change in the very render that threw,
        // they are the cause, and resetting would throw and log a second time.
        if (this.state.error && aPrevState.error && changed(aPrevProps.resetKeys, this.props.resetKeys)) this.reset();
    }

    reset = () => {
        this.setState({ error: null });
        this.props.onReset?.();
    };

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        const { variant, name, actions, fallbackStyle } = this.props;
        return <ErrorCard name={name} variant={variant} message={error?.message || String(error)} actions={actions} fallbackStyle={fallbackStyle} onRetry={this.reset} />;
    }
}

export interface ErrorCardProps {
    /** Same key the boundary uses; the card's test ID is `error-boundary-<encoded name>`. */
    name: string;
    variant: ErrorBoundaryVariant;
    message: string;
    /** Replaces the variant's title when the card says something more specific than a render failure. */
    title?: string;
    actions?: ErrorBoundaryAction[];
    /** Omitted when trying again cannot help (the data itself is unusable): no Retry button then. */
    onRetry?: () => void;
    fallbackStyle?: CSSProperties;
}

/**
 * The error card on its own. A boundary renders it for a render error; a view renders it directly
 * for data it already knows it cannot show (a panel the loader could not read) — no exception is
 * thrown for that, so nothing is logged beyond the loader's one line.
 */
export const ErrorCard = ({ name, variant, message, title, actions = [], onRetry, fallbackStyle }: ErrorCardProps) =>
    variant === 'inline' ? (
        // One line in the slot of the item it replaces; the message is on hover, there is no room to print it.
        <div className={styles.inline} style={fallbackStyle} title={message} {...ROLE_PROPS.inline} data-testid={`error-boundary-${encodeURIComponent(name)}`}>
            <span className={styles.inline__title}>{title ?? TITLES.inline}</span>
            {onRetry ? (
                <button type="button" className={styles.inline__action} data-testid="retry" onClick={onRetry}>
                    Retry
                </button>
            ) : null}
            {actions.map((aAction) => (
                <button type="button" key={aAction.testId} className={styles.inline__action} data-testid={aAction.testId} onClick={aAction.onClick}>
                    {aAction.label}
                </button>
            ))}
        </div>
    ) : (
    <div className={[styles.fallback, styles[`fallback--${variant}`]].join(' ')} style={fallbackStyle} {...ROLE_PROPS[variant]} data-testid={`error-boundary-${encodeURIComponent(name)}`}>
        <div className={styles.fallback__title}>{title ?? TITLES[variant]}</div>
        <div className={styles.fallback__message} title={message}>
            {message}
        </div>
        <div className={styles.fallback__actions}>
            {onRetry ? (
                <Button size="sm" variant="primary" data-testid="retry" onClick={onRetry}>
                    Retry
                </Button>
            ) : null}
            {actions.map((aAction) => (
                <Button key={aAction.testId} size="sm" variant="secondary" data-testid={aAction.testId} onClick={aAction.onClick}>
                    {aAction.label}
                </Button>
            ))}
        </div>
    </div>
    );
