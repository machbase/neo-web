import './PanelFooter.scss';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
import type { PanelShiftHandlers, PanelSummaryState, PanelZoomHandlers } from './TagAnalyzerPanelTypes';
import PanelFooterZoomGroup from './PanelFooterZoomGroup';

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
    const setNaviLocation = () => {
        if (pPanelSummary.tagCount <= 6) return 92 + 'px';
        else return 92 + 16 + 'px';
    };
    return (
        <div className="footer-form">
            <div
                style={
                    pPanelSummary.showLegend === 'Y'
                        ? {
                              bottom: setNaviLocation(),
                          }
                        : {
                              bottom: '60px',
                          }
                }
                className="toolbar"
            >
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
                <PanelFooterZoomGroup pZoomHandlers={pZoomHandlers} />
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
