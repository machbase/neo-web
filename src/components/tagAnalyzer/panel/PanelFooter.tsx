import './PanelFooter.scss';
import { VscChevronLeft, VscChevronRight, MdCenterFocusStrong } from '@/assets/icons/Icon';
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
} from './PanelModel';
import type { TimeRange } from '../common/modelTypes';
import { PANEL_CHART_HEIGHT } from './chartOptions/PanelChartOptionConstants';
import { getPanelChartLayoutMetrics } from './chartOptions/PanelChartLayout';

/**
 * Displays the footer controls between the main panel and bottom zoom slider.
 * @param props The footer summary, visible range, and range-control handlers.
 * @returns The rendered footer toolbar for the panel.
 */
const PanelFooter = ({
    pPanelSummary,
    pVisibleRange,
    pShiftHandlers,
    pZoomHandlers,
}: {
    pPanelSummary: PanelSummaryState;
    pVisibleRange: TimeRange;
    pShiftHandlers: PanelShiftHandlers;
    pZoomHandlers: PanelZoomHandlers;
}) => {
    const sLayout = getPanelChartLayoutMetrics(pPanelSummary.showLegend);
    const sToolbarBottom = `${PANEL_CHART_HEIGHT - sLayout.toolbarTop - sLayout.toolbarHeight}px`;

    return (
        <div className="footer-form">
            <div style={{ bottom: sToolbarBottom }} className="toolbar">
                <div className="arrow-form">
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Move range backward"
                        icon={<VscChevronLeft size={16} />}
                        onClick={pShiftHandlers.onShiftNavigatorRangeLeft}
                    />
                    <div>{pVisibleRange.startTime && changeUtcToText(pVisibleRange.startTime)}</div>
                </div>
                <Button.Group style={{ border: 'solid 0.5px #454545', borderRadius: '4px' }}>
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
                <div className="arrow-form">
                    <div>{pVisibleRange.endTime && changeUtcToText(pVisibleRange.endTime)}</div>
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Move range forward"
                        icon={<VscChevronRight size={16} />}
                        onClick={pShiftHandlers.onShiftNavigatorRangeRight}
                    />
                </div>
            </div>
        </div>
    );
};

export default PanelFooter;
