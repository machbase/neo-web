import './PanelFooter.scss';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
import type { TagAnalyzerTimeRange } from './TagAnalyzerPanelModelTypes';
import type { PanelShiftHandlers, PanelSummaryState, PanelZoomHandlers } from './TagAnalyzerPanelTypes';
import { PANEL_CHART_HEIGHT, getPanelChartLayoutMetrics } from './PanelEChartUtil';
import PanelZoomControls from './PanelZoomControls';

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
    pVisibleRange: TagAnalyzerTimeRange;
    pShiftHandlers: Pick<PanelShiftHandlers, 'onShiftNavigatorRangeLeft' | 'onShiftNavigatorRangeRight'>;
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
                <PanelZoomControls pZoomHandlers={pZoomHandlers} />
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
