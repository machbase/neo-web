import './PanelFooter.scss';
import {
    useState,
    type KeyboardEvent,
} from 'react';
import {
    MdCenterFocusStrong,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { Button, Toast } from '@/design-system/components';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import type {
    PanelNavigatorShiftActions,
    PanelRangeHandlers,
    PanelZoomActions,
} from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { getChartLayoutMetrics } from './Chart/layout/PanelChartLayoutMetrics';
import { formatRangeBoundaryLabel } from '../domain/time/TimeFormatters';
import {
    formatAxisInputValue,
    LOCAL_DATE_TIME_INPUT_FORMAT,
    NUMERIC_AXIS_INPUT_FORMAT,
    parseAxisInputValue,
} from '../domain/time/TimeInputFormatters';

const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };
type NavigatorRangeEdge = 'start' | 'end';
const NAVIGATOR_RANGE_EDGES: NavigatorRangeEdge[] = ['start', 'end'];
type NavigatorRangeEditor = {
    edge: NavigatorRangeEdge;
    value: string;
};

const PanelFooter = ({
    pShowLegend,
    pNavigatorRange,
    pIsLoading,
    pOnNavigatorRangeChange,
    pNavigatorShiftActions,
    pZoomActions,
    pIsNumericXAxis,
}: {
    pShowLegend: boolean;
    pNavigatorRange: TimeRangeMs;
    pIsLoading: boolean;
    pOnNavigatorRangeChange: PanelRangeHandlers['onNavigatorRangeChange'];
    pNavigatorShiftActions: PanelNavigatorShiftActions;
    pZoomActions: PanelZoomActions;
    pIsNumericXAxis: boolean;
}) => {
    const [rangeEditor, setRangeEditor] = useState<NavigatorRangeEditor | undefined>(
        undefined,
    );
    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sToolbarTop = `${sLayout.toolbarTop}px`;
    const sNavigatorShiftTop = `${sLayout.sliderTop + 1}px`;
    const sRangeLabelsTop = `${sLayout.sliderTop + sLayout.sliderHeight + 4}px`;
    const sHasNavigatorRange =
        Number.isFinite(pNavigatorRange.startTime) &&
        Number.isFinite(pNavigatorRange.endTime) &&
        pNavigatorRange.endTime > pNavigatorRange.startTime;
    const navigatorControls = [
        { key: 'zoomIn4', tooltip: 'Zoom in', icon: <img src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomIn(0.4) },
        { key: 'zoomIn2', tooltip: 'Zoom in', icon: <img src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomIn(0.2) },
        { key: 'focus', tooltip: 'Focus', icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: pZoomActions.onFocus },
        { key: 'zoomOut2', tooltip: 'Zoom out', icon: <img src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomOut(0.2) },
        { key: 'zoomOut4', tooltip: 'Zoom out', icon: <img src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomOut(0.4) },
    ];

    function openNavigatorRangeEditor(edge: NavigatorRangeEdge): void {
        const sTimestamp =
            edge === 'start'
                ? pNavigatorRange.startTime
                : pNavigatorRange.endTime;

        if (!Number.isFinite(sTimestamp)) {
            return;
        }

        setRangeEditor({
            edge,
            value: formatAxisInputValue(sTimestamp, pIsNumericXAxis),
        });
    }

    function discardNavigatorRangeEditorWithError(message: string): void {
        Toast.error(message, undefined);
        setRangeEditor(undefined);
    }

    function applyNavigatorRangeEditor(): void {
        if (!rangeEditor) {
            return;
        }

        const sTimestamp = parseAxisInputValue(
            rangeEditor.value,
            pIsNumericXAxis,
        );

        if (sTimestamp === undefined) {
            discardNavigatorRangeEditorWithError(
                pIsNumericXAxis
                    ? 'Enter a valid numeric value.'
                    : 'Enter a valid local date/time.',
            );
            return;
        }

        const sNextRange =
            rangeEditor.edge === 'start'
                ? {
                      startTime: sTimestamp,
                      endTime: pNavigatorRange.endTime,
                  }
                : {
                      startTime: pNavigatorRange.startTime,
                      endTime: sTimestamp,
                  };

        if (sNextRange.startTime >= sNextRange.endTime) {
            discardNavigatorRangeEditorWithError('Start must be before end.');
            return;
        }

        pOnNavigatorRangeChange({
            min: sNextRange.startTime,
            max: sNextRange.endTime,
        });
        setRangeEditor(undefined);
    }

    function handleNavigatorRangeEditorKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
    ): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyNavigatorRangeEditor();
        }

        if (event.key === 'Escape') {
            setRangeEditor(undefined);
        }
    }

    return (
        <div className={`footer-form${pIsLoading ? ' is-loading' : ''}`}>
            {pIsLoading && (
                <span className="navigator-loading-indicator">
                    Loading navigator...
                </span>
            )}
            <div style={{ top: sToolbarTop }} className="toolbar-controls">
                <Button.Group
                    style={{ border: 'solid 0.5px #454545', borderRadius: '4px' }}
                >
                    {navigatorControls.map((control) => (
                        <Button
                            key={control.key}
                            size="icon"
                            variant="ghost"
                            isToolTip
                            toolTipContent={control.tooltip}
                            icon={control.icon}
                            disabled={pIsLoading}
                            onClick={control.action}
                        />
                    ))}
                </Button.Group>
            </div>
            <div
                style={{ top: sNavigatorShiftTop }}
                className="navigator-shift-controls"
            >
                {[
                    {
                        key: 'back',
                        tooltip: 'Move navigator backward',
                        icon: <VscChevronLeft size={16} />,
                        action: pNavigatorShiftActions.onShiftLeft,
                    },
                    {
                        key: 'forward',
                        tooltip: 'Move navigator forward',
                        icon: <VscChevronRight size={16} />,
                        action: pNavigatorShiftActions.onShiftRight,
                    },
                ].map((control) => (
                    <Button
                        key={control.key}
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={control.tooltip}
                        icon={control.icon}
                        disabled={pIsLoading}
                        onClick={control.action}
                    />
                ))}
            </div>
            <div style={{ top: sRangeLabelsTop }} className="range-labels">
                {NAVIGATOR_RANGE_EDGES.map((edge) => {
                    const value = edge === 'start'
                        ? pNavigatorRange.startTime
                        : pNavigatorRange.endTime;
                    const isEditing = rangeEditor?.edge === edge;

                    if (isEditing) {
                        return (
                            <span
                                key={edge}
                                className={`range-label-inline-editor is-${edge}`}
                            >
                                <input
                                    className="range-label-input"
                                    value={rangeEditor.value}
                                    placeholder={
                                        pIsNumericXAxis
                                            ? NUMERIC_AXIS_INPUT_FORMAT
                                            : LOCAL_DATE_TIME_INPUT_FORMAT
                                    }
                                    disabled={pIsLoading}
                                    onChange={(event) =>
                                        setRangeEditor({
                                            ...rangeEditor,
                                            value: event.target.value,
                                        })
                                    }
                                    onBlur={applyNavigatorRangeEditor}
                                    onKeyDown={handleNavigatorRangeEditorKeyDown}
                                    autoFocus
                                />
                            </span>
                        );
                    }

                    return (
                        <button
                            key={edge}
                            type="button"
                            className="range-label range-label-button"
                            title={`Set exact navigator ${edge} ${
                                pIsNumericXAxis ? 'value' : 'time'
                            }`}
                            disabled={pIsLoading}
                            onClick={() => openNavigatorRangeEditor(edge)}
                        >
                            {sHasNavigatorRange &&
                                formatRangeBoundaryLabel(value, pIsNumericXAxis)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PanelFooter;
