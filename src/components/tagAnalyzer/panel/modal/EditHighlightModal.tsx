import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Popover } from '@/design-system/components';
import type { ContextMenuPosition } from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from '../../domain/PanelModel';
import './PanelMarkupModal.scss';

export const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';

export type ActiveHighlightEditor = {
    position: ContextMenuPosition;
    highlightIndex: number;
    deleteOnCancel?: boolean;
};

type HighlightFormState = {
    labelText: string;
    startTimeText: string;
    endTimeText: string;
    fillColor: string;
    textColor: string;
};

export type ApplyHighlightChangeRequest = HighlightFormState & {
    activeHighlightEditor: ActiveHighlightEditor;
};

const HIGHLIGHT_TIME_FIELDS = [
    ['startTimeText', 'Start time (ms)', 'Highlight start time'],
    ['endTimeText', 'End time (ms)', 'Highlight end time'],
] as const;
const HIGHLIGHT_COLOR_FIELDS = [
    ['fillColor', 'Fill color', 'Highlight fill color'],
    ['textColor', 'Text color', 'Highlight text color'],
] as const;

function createHighlightFormState(
    highlight: PanelHighlight | undefined,
): HighlightFormState {
    return {
        labelText: highlight?.text ?? DEFAULT_HIGHLIGHT_LABEL,
        startTimeText: String(highlight?.timeRange.startTime ?? ''),
        endTimeText: String(highlight?.timeRange.endTime ?? ''),
        fillColor: highlight?.fillColor ?? DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
        textColor: highlight?.textColor ?? DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    };
}

const EditHighlightModal = ({
    activeHighlightEditor,
    highlight,
    onApplyHighlightChange,
    onCancel,
    onApplied,
}: {
    activeHighlightEditor: ActiveHighlightEditor | undefined;
    highlight: PanelHighlight | undefined;
    onApplyHighlightChange: (request: ApplyHighlightChangeRequest) => boolean;
    onCancel: () => void;
    onApplied: () => void;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [formState, setFormState] = useState(() =>
        createHighlightFormState(highlight),
    );

    useEffect(() => {
        setFormState(createHighlightFormState(highlight));
    }, [highlight]);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    if (!activeHighlightEditor || !highlight) {
        return null;
    }
    const sActiveHighlightEditor = activeHighlightEditor;

    function setField(field: keyof HighlightFormState, value: string) {
        setFormState((prev) => ({ ...prev, [field]: value }));
    }

    function apply() {
        if (onApplyHighlightChange({ activeHighlightEditor: sActiveHighlightEditor, ...formState })) {
            onApplied();
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            apply();
        } else if (event.key === 'Escape') {
            onCancel();
        }
    }

    return (
        <Popover
            isOpen
            position={sActiveHighlightEditor.position}
            onClose={onCancel}
            closeOnOutsideClick
        >
            <div className="panel-markup-modal panel-markup-modal--highlight">
                <div className="panel-markup-modal__title">
                    Edit highlight
                </div>
                <div className="panel-markup-modal__body">
                    <label className="panel-markup-modal__field">
                        Label
                        <input
                            ref={inputRef}
                            aria-label="Highlight label"
                            className="panel-markup-modal__input"
                            value={formState.labelText}
                            onChange={(event) => setField('labelText', event.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </label>
                    <div className="panel-markup-modal__row panel-markup-modal__row--two">
                        {HIGHLIGHT_TIME_FIELDS.map(([field, label, ariaLabel]) => (
                            <label className="panel-markup-modal__field" key={field}>
                                {label}
                                <input
                                    aria-label={ariaLabel}
                                    className="panel-markup-modal__input"
                                    type="number"
                                    value={formState[field]}
                                    onChange={(event) => setField(field, event.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </label>
                        ))}
                    </div>
                    <div className="panel-markup-modal__row panel-markup-modal__row--two">
                        {HIGHLIGHT_COLOR_FIELDS.map(([field, label, ariaLabel]) => (
                            <label className="panel-markup-modal__field" key={field}>
                                {label}
                                <input
                                    aria-label={ariaLabel}
                                    className="panel-markup-modal__color-input"
                                    type="color"
                                    value={formState[field]}
                                    onChange={(event) => setField(field, event.target.value)}
                                />
                            </label>
                        ))}
                    </div>
                    <div
                        className="panel-markup-modal__preview"
                        style={{
                            backgroundColor: `${formState.fillColor}29`,
                            borderColor: formState.fillColor,
                            color: formState.textColor,
                        }}
                    >
                        {formState.labelText.trim() || DEFAULT_HIGHLIGHT_LABEL}
                    </div>
                    <div className="panel-markup-modal__actions">
                        <Button size="sm" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={apply}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        </Popover>
    );
};

export default EditHighlightModal;
