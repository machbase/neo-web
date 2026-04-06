import './PanelFooter.scss';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { changeUtcToText } from '@/utils/helpers/date';
import { Button } from '@/design-system/components';
import type { TagAnalyzerTimeRange } from './TagAnalyzerPanelModelTypes';
import type { PanelSummaryState } from './TagAnalyzerPanelTypes';
import PanelFooterZoomGroup from './PanelFooterZoomGroup';

// Displays the navigator controls below a panel.
// It lets the user zoom the chart window and move the navigator time range left or right.
const PanelFooter = ({
    pSetButtonRange,
    pPanelSummary,
    pNavigatorRange,
    pMoveNavigatorTimRange,
}: {
    pSetButtonRange: (aType?: string, aZoom?: number) => void;
    pPanelSummary: PanelSummaryState;
    pNavigatorRange: TagAnalyzerTimeRange;
    pMoveNavigatorTimRange: (aItem: string) => void;
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
                        onClick={() => pMoveNavigatorTimRange('l')}
                    />
                    <div>{pNavigatorRange.startTime && changeUtcToText(pNavigatorRange.startTime)}</div>
                </div>
                <PanelFooterZoomGroup pSetButtonRange={pSetButtonRange} />
                <div className="arrow-form">
                    <div>{pNavigatorRange.endTime && changeUtcToText(pNavigatorRange.endTime)}</div>
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Move range forward"
                        icon={<VscChevronRight size={16} />}
                        onClick={() => pMoveNavigatorTimRange('r')}
                    />
                </div>
            </div>
        </div>
    );
};

export default PanelFooter;
