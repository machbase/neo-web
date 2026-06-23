import './PanelFooter.scss';
import {
    MdCenterFocusStrong,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import type {
    PanelNavigatorShiftActions,
    PanelZoomActions,
} from '../domain/PanelDomain';
import type { TimeRangeMs } from '../domain/time/model/TimeTypes';
import { getChartLayoutMetrics } from './Chart/layout/PanelChartLayoutMetrics';
import { formatRangeBoundaryLabel } from '../domain/time/formatting/TimeFormatters';
import { isValidTimeRange } from '../domain/time/range/TimeRangeUtils';

const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };
const RANGE_LABEL_EDGES = ['start', 'end'] as const;

const PanelFooter = ({
    pShowLegend,
    pNavigatorRange,
    pIsLoading,
    pOnOpenTimeRangeModal,
    pNavigatorShiftActions,
    pZoomActions,
    pIsNumericXAxis,
}: {
    pShowLegend: boolean;
    pNavigatorRange: TimeRangeMs;
    pIsLoading: boolean;
    pOnOpenTimeRangeModal: () => void;
    pNavigatorShiftActions: PanelNavigatorShiftActions;
    pZoomActions: PanelZoomActions;
    pIsNumericXAxis: boolean;
}) => {
    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sToolbarTop = `${sLayout.toolbarTop}px`;
    const sNavigatorShiftTop = `${sLayout.sliderTop + 1}px`;
    const sRangeLabelsTop = `${sLayout.sliderTop + sLayout.sliderHeight + 4}px`;
    const sHasNavigatorRange = isValidTimeRange(pNavigatorRange);
    const navigatorControls = [
        { key: 'zoomIn4', tooltip: 'Zoom in', icon: <img src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomIn(0.4) },
        { key: 'zoomIn2', tooltip: 'Zoom in', icon: <img src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomIn(0.2) },
        { key: 'focus', tooltip: 'Focus', icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: pZoomActions.onFocus },
        { key: 'zoomOut2', tooltip: 'Zoom out', icon: <img src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomOut(0.2) },
        { key: 'zoomOut4', tooltip: 'Zoom out', icon: <img src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pZoomActions.onZoomOut(0.4) },
    ];

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
                {RANGE_LABEL_EDGES.map((edge) => {
                    const value = edge === 'start'
                        ? pNavigatorRange.startTime
                        : pNavigatorRange.endTime;

                    return (
                        <button
                            key={edge}
                            type="button"
                            className="range-label range-label-button"
                            title={
                                pIsNumericXAxis
                                    ? 'Set current visible navigator value range'
                                    : 'Set current visible navigator range'
                            }
                            disabled={pIsLoading || !sHasNavigatorRange}
                            onClick={pOnOpenTimeRangeModal}
                        >
                            {sHasNavigatorRange &&
                                formatRangeBoundaryLabel(
                                    value,
                                    pIsNumericXAxis,
                                    pNavigatorRange,
                                )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PanelFooter;
