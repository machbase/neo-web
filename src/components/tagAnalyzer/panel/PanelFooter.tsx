import './PanelFooter.scss';
import {
    useState,
    type KeyboardEvent,
    type MouseEvent,
} from 'react';
import { MdCenterFocusStrong, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import { Popover } from '@/design-system/components/Popover';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import type {
    PanelNavigatorShiftActions,
    PanelRangeHandlers,
    PanelZoomActions,
} from '../domain/PanelChartModel';
import type { TimeRangeMs } from '../domain/time/TimeTypes';
import { getChartLayoutMetrics } from './chartBuilder/PanelChartLayoutMetrics';
import { formatLocalRangeLabel } from '../domain/time/TimeFormatters';
import {
    formatLocalTimestampInput,
    parseLocalTimestampInput,
} from '../domain/time/TimeInputFormatters';

const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };
type NavigatorRangeEdge = 'start' | 'end';
type NavigatorRangeEditor = {
    edge: NavigatorRangeEdge;
    value: string;
    position: { x: number; y: number };
    error: string | undefined;
};

const PanelFooter = ({
    pShowLegend,
    pNavigatorRange,
    pOnNavigatorRangeChange,
    pNavigatorShiftActions,
    pNavigatorZoomActions,
}: {
    pShowLegend: boolean;
    pNavigatorRange: TimeRangeMs;
    pOnNavigatorRangeChange: PanelRangeHandlers['onNavigatorRangeChange'];
    pNavigatorShiftActions: PanelNavigatorShiftActions;
    pNavigatorZoomActions: PanelZoomActions;
}) => {
    const [rangeEditor, setRangeEditor] = useState<NavigatorRangeEditor | undefined>(
        undefined,
    );
    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sToolbarTop = `${sLayout.toolbarTop}px`;
    const sNavigatorShiftTop = `${sLayout.sliderTop + 1}px`;
    const sRangeLabelsTop = `${sLayout.sliderTop + sLayout.sliderHeight + 4}px`;
    const navigatorControls = [
        {
            key: 'zoomIn4',
            tooltip: 'Zoom in',
            icon: <img src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorZoomActions.onZoomIn(0.4),
        },
        {
            key: 'zoomIn2',
            tooltip: 'Zoom in',
            icon: <img src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorZoomActions.onZoomIn(0.2),
        },
        {
            key: 'focus',
            tooltip: 'Focus',
            icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: pNavigatorZoomActions.onFocus,
        },
        {
            key: 'zoomOut2',
            tooltip: 'Zoom out',
            icon: <img src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorZoomActions.onZoomOut(0.2),
        },
        {
            key: 'zoomOut4',
            tooltip: 'Zoom out',
            icon: <img src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />,
            action: () => pNavigatorZoomActions.onZoomOut(0.4),
        },
    ];

    function openNavigatorRangeEditor(
        edge: NavigatorRangeEdge,
        event: MouseEvent<HTMLButtonElement>,
    ): void {
        const sTimestamp =
            edge === 'start'
                ? pNavigatorRange.startTime
                : pNavigatorRange.endTime;

        if (!sTimestamp) {
            return;
        }

        setRangeEditor({
            edge,
            value: formatLocalTimestampInput(sTimestamp),
            position: {
                x: event.clientX,
                y: event.clientY - 110,
            },
            error: undefined,
        });
    }

    function applyNavigatorRangeEditor(): void {
        if (!rangeEditor) {
            return;
        }

        const sTimestamp = parseLocalTimestampInput(rangeEditor.value);

        if (sTimestamp === undefined) {
            setRangeEditor({
                ...rangeEditor,
                error: 'Enter a valid local date/time.',
            });
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
            setRangeEditor({
                ...rangeEditor,
                error: 'Start must be before end.',
            });
            return;
        }

        pOnNavigatorRangeChange({
            min: sNextRange.startTime,
            max: sNextRange.endTime,
            trigger: 'selection',
        });
        setRangeEditor(undefined);
    }

    function handleNavigatorRangeEditorKeyDown(
        event: KeyboardEvent<HTMLInputElement>,
    ): void {
        if (event.key === 'Enter') {
            applyNavigatorRangeEditor();
        }

        if (event.key === 'Escape') {
            setRangeEditor(undefined);
        }
    }

    return (
        <div className="footer-form">
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
                            onClick={control.action}
                        />
                    ))}
                </Button.Group>
            </div>
            <div
                style={{ top: sNavigatorShiftTop }}
                className="navigator-shift-controls"
            >
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pNavigatorShiftActions.onShiftLeft}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={pNavigatorShiftActions.onShiftRight}
                />
            </div>
            <div style={{ top: sRangeLabelsTop }} className="range-labels">
                <button
                    type="button"
                    className="range-label range-label-button"
                    title="Set exact navigator start time"
                    onClick={(event) => openNavigatorRangeEditor('start', event)}
                >
                    {pNavigatorRange.startTime &&
                        formatLocalRangeLabel(pNavigatorRange.startTime)}
                </button>
                <button
                    type="button"
                    className="range-label range-label-button"
                    title="Set exact navigator end time"
                    onClick={(event) => openNavigatorRangeEditor('end', event)}
                >
                    {pNavigatorRange.endTime &&
                        formatLocalRangeLabel(pNavigatorRange.endTime)}
                </button>
            </div>
            {rangeEditor && (
                <Popover
                    isOpen
                    position={rangeEditor.position}
                    onClose={() => setRangeEditor(undefined)}
                    closeOnOutsideClick
                >
                    <div className="navigator-range-editor">
                        <label className="navigator-range-editor__label">
                            {rangeEditor.edge === 'start'
                                ? 'Navigator start'
                                : 'Navigator end'}
                        </label>
                        <input
                            className={`navigator-range-editor__input${
                                rangeEditor.error ? ' is-invalid' : ''
                            }`}
                            value={rangeEditor.value}
                            placeholder="YYYY-MM-DD HH:mm:ss.SSS"
                            onChange={(event) =>
                                setRangeEditor({
                                    ...rangeEditor,
                                    value: event.target.value,
                                    error: undefined,
                                })
                            }
                            onKeyDown={handleNavigatorRangeEditorKeyDown}
                            autoFocus
                        />
                        {rangeEditor.error && (
                            <div className="navigator-range-editor__error">
                                {rangeEditor.error}
                            </div>
                        )}
                        <div className="navigator-range-editor__actions">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setRangeEditor(undefined)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={applyNavigatorRangeEditor}
                            >
                                Apply
                            </Button>
                        </div>
                    </div>
                </Popover>
            )}
        </div>
    );
};

export default PanelFooter;
