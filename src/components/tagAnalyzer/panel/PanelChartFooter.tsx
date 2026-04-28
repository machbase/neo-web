import './PanelChartFooter.scss';
import { MdCenterFocusStrong, VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
import ZoomInTwo from '@/assets/image/btn_zoom in x2@3x.png';
import ZoomInFour from '@/assets/image/btn_zoom in x4@3x.png';
import ZoomOutTwo from '@/assets/image/btn_zoom out x2@3x.png';
import ZoomOutFour from '@/assets/image/btn_zoom out x4@3x.png';
import type {
    PanelShiftHandlers,
    PanelSummaryState,
    PanelZoomHandlers,
} from './PanelTypes';
import type { TimeRangeMs } from '../utils/time/types/TimeTypes';
import { PANEL_CHART_HEIGHT } from '../chart/options/OptionBuildHelpers/ChartOptionConstants';
import { getChartLayoutMetrics } from '../chart/options/OptionBuildHelpers/PanelChartSectionOptionBuilder';

const PanelChartFooter = ({
    pPanelSummary,
    pVisibleRange,
    pShiftHandlers,
    pZoomHandlers,
}: {
    pPanelSummary: PanelSummaryState;
    pVisibleRange: TimeRangeMs;
    pShiftHandlers: PanelShiftHandlers;
    pZoomHandlers: PanelZoomHandlers;
}) => {
    const sLayout = getChartLayoutMetrics(pPanelSummary.showLegend);
    const sToolbarTop = `${sLayout.toolbarTop}px`;
    const sRangeLabelsTop = `${sLayout.sliderTop + sLayout.sliderHeight + 4}px`;

    return (
        <div className="footer-form">
            <div style={{ top: sToolbarTop }} className="toolbar-controls">
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move range backward"
                    icon={<VscChevronLeft size={16} />}
                    onClick={pShiftHandlers.onShiftNavigatorRangeLeft}
                />
                <Button.Group
                    style={{ border: 'solid 0.5px #454545', borderRadius: '4px' }}
                >
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom in"
                        icon={<img src={ZoomInFour} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pZoomHandlers.onZoomIn(0.4)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom in"
                        icon={<img src={ZoomInTwo} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pZoomHandlers.onZoomIn(0.2)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Focus"
                        icon={<MdCenterFocusStrong style={{ width: '20px', height: '20px' }} />}
                        onClick={pZoomHandlers.onFocus}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom out"
                        icon={<img src={ZoomOutTwo} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pZoomHandlers.onZoomOut(0.2)}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Zoom out"
                        icon={<img src={ZoomOutFour} style={{ width: '20px', height: '20px' }} />}
                        onClick={() => pZoomHandlers.onZoomOut(0.4)}
                    />
                </Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Move range forward"
                    icon={<VscChevronRight size={16} />}
                    onClick={pShiftHandlers.onShiftNavigatorRangeRight}
                />
            </div>
            <div style={{ top: sRangeLabelsTop }} className="range-labels">
                <div className="range-label">
                    {pVisibleRange.startTime && changeUtcToText(pVisibleRange.startTime)}
                </div>
                <div className="range-label">
                    {pVisibleRange.endTime && changeUtcToText(pVisibleRange.endTime)}
                </div>
            </div>
        </div>
    );
};

export default PanelChartFooter;
