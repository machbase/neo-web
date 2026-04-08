import './PanelFooter.scss';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
import type { PanelShiftHandlers, PanelSummaryState, PanelZoomHandlers } from './TagAnalyzerPanelTypes';
import { PANEL_CHART_HEIGHT, getPanelChartLayoutMetrics } from './PanelEChartUtil';
import PanelZoomControls from './PanelZoomControls';

// Displays the navigator controls below a panel.
// It lets the user zoom the chart window and move the navigator time range left or right.
const PanelFooter = ({
    pPanelSummary,
    pNavigatorStartTime,
    pNavigatorEndTime,
    pShiftHandlers,
    pZoomHandlers,
}: {
    pPanelSummary: PanelSummaryState;
    pNavigatorStartTime: number;
    pNavigatorEndTime: number;
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
                    <div>{pNavigatorStartTime && changeUtcToText(pNavigatorStartTime)}</div>
                </div>
                <PanelZoomControls pZoomHandlers={pZoomHandlers} />
                <div className="arrow-form">
                    <div>{pNavigatorEndTime && changeUtcToText(pNavigatorEndTime)}</div>
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
