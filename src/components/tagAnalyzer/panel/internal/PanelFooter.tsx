import './PanelFooter.scss';
import {
    MdCenterFocusStrong,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import { Button } from '@/design-system/components';
import {
    getChartLayoutMetrics,
    PANEL_NAVIGATOR_GRID_SIDE,
} from '../../chart/chartGeometry';
import { formatAxisRange } from '../../format/axisFormat';
import type { AxisRange } from '../../range/rangeModel';
import type { RangeButtonAction } from '../../range/rangeResolver';

const NAVIGATOR_BUTTON_ICON_STYLE = { width: '20px', height: '20px' };
const NAVIGATOR_RANGE_BOUNDARIES = ['start', 'end'] as const;

export function PanelFooter({
    pShowLegend,
    pNavigatorRange,
    pIsLoading,
    pOnRangeButtonPress,
    pIsNumericXAxis,
    pOnOpenNavigatorRangeModal,
}: {
    pShowLegend: boolean;
    pNavigatorRange: AxisRange | undefined;
    pIsLoading: boolean;
    pOnRangeButtonPress: (action: RangeButtonAction) => void;
    pIsNumericXAxis: boolean;
    pOnOpenNavigatorRangeModal: () => void;
}) {
    const sLayout = getChartLayoutMetrics(pShowLegend);
    const sNavigatorSide = `${PANEL_NAVIGATOR_GRID_SIDE}px`;
    const sRangeUnavailable = pIsLoading || !pNavigatorRange;
    const sFormattedNavigatorRange = pNavigatorRange
        ? formatAxisRange(pNavigatorRange, pIsNumericXAxis)
        : { start: '', end: '' };
    const navigatorControls = [
        { key: 'zoom-in-large', tooltip: 'Zoom in', icon: <img alt="" src={ZoomInFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-in-large') },
        { key: 'zoom-in-small', tooltip: 'Zoom in', icon: <img alt="" src={ZoomInTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-in-small') },
        { key: 'focus', tooltip: 'Focus', icon: <MdCenterFocusStrong style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('focus') },
        { key: 'zoom-out-small', tooltip: 'Zoom out', icon: <img alt="" src={ZoomOutTwo} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-out-small') },
        { key: 'zoom-out-large', tooltip: 'Zoom out', icon: <img alt="" src={ZoomOutFour} style={NAVIGATOR_BUTTON_ICON_STYLE} />, action: () => pOnRangeButtonPress('zoom-out-large') },
    ];

    return (
        <div
            className={`footer-form${pIsLoading ? ' is-loading' : ''}`}
            data-testid="footer"
        >
            {pIsLoading && (
                <span
                    className="navigator-loading-indicator"
                    data-testid="navigator-loading"
                >
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
                            data-testid={`navigator-${control.key}`}
                            size="icon"
                            variant="ghost"
                            isToolTip
                            toolTipContent={control.tooltip}
                            icon={control.icon}
                            disabled={sRangeUnavailable}
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
                    data-testid="navigator-shift-backward"
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator backward"
                    icon={<VscChevronLeft size={16} />}
                    disabled={sRangeUnavailable}
                    onClick={() => pOnRangeButtonPress('shift-navigator-left')}
                />
                <Button
                    data-testid="navigator-shift-forward"
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move navigator forward"
                    icon={<VscChevronRight size={16} />}
                    disabled={sRangeUnavailable}
                    onClick={() => pOnRangeButtonPress('shift-navigator-right')}
                />
            </div>
            <div style={{ top: `${sLayout.sliderTop + sLayout.sliderHeight + 4}px` }} className="range-labels">
                {NAVIGATOR_RANGE_BOUNDARIES.map((boundary) => (
                    <button
                        key={boundary}
                        data-testid={`navigator-range-${boundary}`}
                        type="button"
                        className="range-label"
                        title="Set current navigator range"
                        disabled={sRangeUnavailable}
                        onClick={pOnOpenNavigatorRangeModal}
                    >
                        {sFormattedNavigatorRange[boundary]}
                    </button>
                ))}
            </div>
        </div>
    );
}
