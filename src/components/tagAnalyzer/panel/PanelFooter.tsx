import './PanelFooter.scss';
import { MdCenterFocusStrong, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import { formatAxisRange } from '../range/format/rangeFormat';
import { isValidRange } from '../range/rangeArithmetic';
import type { AxisRange } from '../range/rangeModel';

import { getChartLayoutMetrics, PANEL_NAVIGATOR_GRID_SIDE } from '../chart/chartGeometry';
import type { PanelRangeButtonAction } from '../range/panelRangeCommands';

const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };
const NAVIGATOR_RANGE_BOUNDARIES = ['start', 'end'] as const;

export default function PanelFooter({
    pShowLegend,
    pNavigatorRange,
    pIsLoading,
    pOnRangeButtonPress,
    pIsNumericXAxis,
    pOnOpenNavigatorRangeModal,
}: {
    pShowLegend: boolean;
    pNavigatorRange: AxisRange;
    pIsLoading: boolean;
    pOnRangeButtonPress: (action: PanelRangeButtonAction) => void;
    pIsNumericXAxis: boolean;
    pOnOpenNavigatorRangeModal: () => void;
}) {
    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sNavigatorSide = `${PANEL_NAVIGATOR_GRID_SIDE}px`;
    const sHasNavigatorRange = isValidRange(pNavigatorRange);
    const sFormattedNavigatorRange = sHasNavigatorRange
        ? formatAxisRange(pNavigatorRange, pIsNumericXAxis)
        : { start: '', end: '' };
    const navigatorControls = [
        { key: 'zoomIn4', tooltip: 'Zoom in', icon: <img alt="" src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-in-large') },
        { key: 'zoomIn2', tooltip: 'Zoom in', icon: <img alt="" src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-in-small') },
        { key: 'focus', tooltip: 'Focus', icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('focus') },
        { key: 'zoomOut2', tooltip: 'Zoom out', icon: <img alt="" src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-out-small') },
        { key: 'zoomOut4', tooltip: 'Zoom out', icon: <img alt="" src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-out-large') },
    ];

    return (
        <div className={`footer-form${pIsLoading ? ' is-loading' : ''}`}>
            {pIsLoading && (
                <span className="navigator-loading-indicator">
                    Loading navigator...
                </span>
            )}
            <div style={{ top: `${sLayout.toolbarTop}px` }} className="toolbar-controls">
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
                style={{
                    top: `${sLayout.sliderTop + 1}px`,
                    left: sNavigatorSide,
                    right: sNavigatorSide,
                }}
                className="navigator-shift-controls"
            >
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator backward"
                    icon={<VscChevronLeft size={16} />}
                    disabled={pIsLoading}
                    onClick={() => pOnRangeButtonPress('shift-navigator-left')}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator forward"
                    icon={<VscChevronRight size={16} />}
                    disabled={pIsLoading}
                    onClick={() => pOnRangeButtonPress('shift-navigator-right')}
                />
            </div>
            <div style={{ top: `${sLayout.sliderTop + sLayout.sliderHeight + 4}px` }} className="range-labels">
                {NAVIGATOR_RANGE_BOUNDARIES.map((boundary) => (
                    <button
                        key={boundary}
                        type="button"
                        className="range-label"
                        title="Set current navigator range"
                        disabled={pIsLoading || !sHasNavigatorRange}
                        onClick={pOnOpenNavigatorRangeModal}
                    >
                        {sFormattedNavigatorRange[boundary]}
                    </button>
                ))}
            </div>
        </div>
    );
}
