import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import {
    Button,
    type ContextMenuPosition,
} from '@/design-system/components';
import {
    DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
    DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    type PanelHighlight,
} from '../../domain/PanelDomain';
import type { HighlightActions } from '../usePanelHighlight';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../../domain/time/TimeInputFormatters';
import PanelMarkupPopover from './PanelMarkupPopover';
import './PanelMarkupModal.scss';

export const DEFAULT_HIGHLIGHT_LABEL = 'unnamed';

export type HighlightEditorState = {
    position: ContextMenuPosition;
    highlightIndex: number;
    deleteOnCancel?: boolean;
};

export type HighlightFormState = {
    labelText: string;
    startTimeText: string;
    endTimeText: string;
    fillColor: string;
    textColor: string;
};

const HIGHLIGHT_TIME_FIELDS = [
    ['startTimeText', 'Start time (Local)', 'Highlight start time'],
    ['endTimeText', 'End time (Local)', 'Highlight end time'],
] as const;
const HIGHLIGHT_COLOR_FIELDS = [
    ['fillColor', 'Fill color', 'Highlight fill color'],
    ['textColor', 'Text color', 'Highlight text color'],
] as const;

function createHighlightFormState(
    highlight: PanelHighlight | undefined,
    isNumericXAxis: boolean,
): HighlightFormState {
    return {
        labelText: highlight?.text ?? DEFAULT_HIGHLIGHT_LABEL,
        startTimeText:
            highlight?.timeRange.startTime !== undefined
                ? formatAxisInputValue(
                      highlight.timeRange.startTime,
                      isNumericXAxis,
                  )
                : '',
        endTimeText:
            highlight?.timeRange.endTime !== undefined
                ? formatAxisInputValue(
                      highlight.timeRange.endTime,
                      isNumericXAxis,
                  )
                : '',
        fillColor: highlight?.fillColor ?? DEFAULT_PANEL_HIGHLIGHT_FILL_COLOR,
        textColor: highlight?.textColor ?? DEFAULT_PANEL_HIGHLIGHT_TEXT_COLOR,
    };
}

function getHighlightTimeFields(isNumericXAxis: boolean) {
    return isNumericXAxis
        ? [
              ['startTimeText', 'Start value', 'Highlight start value'],
              ['endTimeText', 'End value', 'Highlight end value'],
          ] as const
        : HIGHLIGHT_TIME_FIELDS;
}

const EditHighlightModal = ({
    activeHighlightEditor,
    temporaryHighlight,
    highlightActions,
    onApplyHighlightChange,
    onCancel,
    onApplied,
    isNumericXAxis,
}: {
    activeHighlightEditor: HighlightEditorState | undefined;
    temporaryHighlight: PanelHighlight | undefined;
    highlightActions: HighlightActions;
    onApplyHighlightChange: (
        formState: HighlightFormState,
        activeHighlightEditor: HighlightEditorState,
    ) => boolean;
    onCancel: () => void;
    onApplied: () => void;
    isNumericXAxis: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const highlight = activeHighlightEditor
        ? highlightActions.getHighlightByIndex(activeHighlightEditor.highlightIndex) ??
          temporaryHighlight
        : undefined;
    const [formState, setFormState] = useState(() =>
        createHighlightFormState(highlight, isNumericXAxis),
    );

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    if (!activeHighlightEditor || !highlight) {
        return null;
    }
    const sActiveHighlightEditor = activeHighlightEditor;
    const sParsedStartTime = parseAxisInputValue(
        formState.startTimeText,
        isNumericXAxis,
    );
    const sParsedEndTime = parseAxisInputValue(
        formState.endTimeText,
        isNumericXAxis,
    );
    const sCanApply =
        sParsedStartTime !== undefined &&
        sParsedEndTime !== undefined &&
        sParsedEndTime > sParsedStartTime;

    function setField(field: keyof HighlightFormState, value: string) {
        setFormState((prev) => ({ ...prev, [field]: value }));
    }

    function apply() {
        if (onApplyHighlightChange(formState, sActiveHighlightEditor)) {
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
        <PanelMarkupPopover
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
                        {getHighlightTimeFields(isNumericXAxis).map(([field, label, ariaLabel]) => (
                            <label className="panel-markup-modal__field" key={field}>
                                {label}
                                <input
                                    aria-label={ariaLabel}
                                    className="panel-markup-modal__input"
                                    placeholder={
                                        isNumericXAxis
                                            ? NUMERIC_AXIS_INPUT_FORMAT
                                            : LOCAL_DATE_TIME_INPUT_FORMAT
                                    }
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
                        <Button size="sm" disabled={!sCanApply} onClick={apply}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>
        </PanelMarkupPopover>
    );
};

export default EditHighlightModal;
