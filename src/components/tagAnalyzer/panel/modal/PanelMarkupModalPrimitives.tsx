import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
} from 'react';
import { Button, type ContextMenuPosition } from '@/design-system/components';
import {
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
} from '../../domain/time/formatting/TimeInputFormatters';
import PanelMarkupPopover from './PanelMarkupPopover';
import './PanelMarkupModal.scss';

const COLOR_FIELDS = [
    ['fillColor', 'Fill color', 'fill'],
    ['textColor', 'Text color', 'text'],
] as const;

export function PanelMarkupModal({
    title,
    className,
    position,
    onClose,
    children,
    actions,
    draggable = false,
    outsideCloseIgnoreSelector,
    closeOnScroll,
}: {
    title: string;
    className: string;
    position: ContextMenuPosition;
    onClose: () => void;
    children: ReactNode;
    actions: ReactNode;
    draggable?: boolean;
    outsideCloseIgnoreSelector?: string;
    closeOnScroll?: boolean;
}) {
    return (
        <PanelMarkupPopover
            position={position}
            onClose={onClose}
            draggable={draggable}
            outsideCloseIgnoreSelector={outsideCloseIgnoreSelector}
            closeOnScroll={closeOnScroll}
        >
            <div
                className={`panel-markup-modal ${className} ${draggable ? 'panel-markup-modal--draggable' : ''}`}
            >
                <div className="panel-markup-modal__title">{title}</div>
                <div className="panel-markup-modal__body">{children}</div>
                <div className="panel-markup-modal__actions">{actions}</div>
            </div>
        </PanelMarkupPopover>
    );
}

export function TextField<T extends Record<string, unknown>>({
    field,
    label,
    ariaLabel,
    placeholder,
    inputRef,
    state,
    setField,
    onKeyDown,
}: {
    field: keyof T;
    label: string;
    ariaLabel?: string;
    placeholder?: string;
    inputRef?: RefObject<HTMLInputElement>;
    state: T;
    setField: <K extends keyof T>(field: K, value: T[K]) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className="panel-markup-modal__field">
            {label}
            <input
                ref={inputRef}
                aria-label={ariaLabel ?? label}
                className="panel-markup-modal__input"
                placeholder={placeholder}
                value={String(state[field] ?? '')}
                onChange={(event) => setField(field, event.target.value as T[keyof T])}
                onKeyDown={onKeyDown}
            />
        </label>
    );
}

export function ColorFields<T extends Record<'fillColor' | 'textColor', string>>({
    state,
    setField,
    ariaPrefix,
}: {
    state: T;
    setField: <K extends keyof T>(field: K, value: T[K]) => void;
    ariaPrefix: string;
}) {
    return (
        <div className="panel-markup-modal__row panel-markup-modal__row--two">
            {COLOR_FIELDS.map(([field, label, ariaLabel]) => (
                <label className="panel-markup-modal__field" key={field}>
                    {label}
                    <input
                        aria-label={`${ariaPrefix} ${ariaLabel} color`}
                        className="panel-markup-modal__color-input"
                        type="color"
                        value={state[field]}
                        onChange={(event) =>
                            setField(field, event.target.value as T[typeof field])
                        }
                    />
                </label>
            ))}
        </div>
    );
}

export function useFocusedInput() {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    return inputRef;
}

export function useMarkupForm<T extends Record<string, unknown>>(
    initialState: () => T,
    apply: (state: T) => boolean,
    onCancel: () => void,
    onApplied: () => void,
) {
    const [state, setState] = useState(initialState);
    const setField = <K extends keyof T>(field: K, value: T[K]) =>
        setState((prev) => ({ ...prev, [field]: value }));
    const applyForm = () => {
        if (apply(state)) {
            onApplied();
        }
    };
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') applyForm();
        if (event.key === 'Escape') onCancel();
    };

    return { state, setField, applyForm, handleKeyDown };
}

export const getAxisPlaceholder = (isNumericXAxis: boolean) =>
    isNumericXAxis ? NUMERIC_AXIS_INPUT_FORMAT : LOCAL_DATE_TIME_INPUT_FORMAT;

export function ModalActions({
    canApply,
    onCancel,
    onApply,
    deleteAction,
}: {
    canApply: boolean;
    onCancel: () => void;
    onApply: () => void;
    deleteAction?: () => void;
}) {
    return (
        <>
            {deleteAction && (
                <Button size="sm" variant="ghost" onClick={deleteAction}>
                    Delete
                </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
            </Button>
            <Button size="sm" disabled={!canApply} onClick={onApply}>
                Apply
            </Button>
        </>
    );
}
