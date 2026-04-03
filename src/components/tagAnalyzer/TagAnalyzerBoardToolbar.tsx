import { Calendar, Save, Refresh, SaveAs, MdOutlineStackedLineChart, LuTimerReset } from '@/assets/icons/Icon';
import { formatTimeValue } from '@/utils/dashboardUtil';
import { Button, Page } from '@/design-system/components';
import type { TagAnalyzerChartBoardInfoProp as TagAnalyzerBoardInfoProp } from './TagAnalyzerType';

// Renders the board-level action toolbar for time range, refresh, save, and overlap actions.
// It keeps the header button layout separate from the board data and panel state logic.
const TagAnalyzerBoardToolbar = ({
    pInfo,
    pPanelsInfoCount,
    pOnOpenTimeRangeModal,
    pOnRefreshData,
    pOnRefreshTime,
    pOnSave,
    pOnOpenSaveModal,
    pOnOpenOverlapModal,
}: {
    pInfo: TagAnalyzerBoardInfoProp;
    pPanelsInfoCount: number;
    pOnOpenTimeRangeModal: () => void;
    pOnRefreshData: () => void;
    pOnRefreshTime: () => void;
    pOnSave: () => void;
    pOnOpenSaveModal: () => void;
    pOnOpenOverlapModal: () => void;
}) => {
    return (
        <Page.Header>
            <Page.Space />
            <Button.Group>
                <Button size="sm" variant="ghost" onClick={pOnOpenTimeRangeModal}>
                    <Calendar style={{ paddingRight: '8px' }} />
                    {pInfo?.range_bgn ? (
                        <>
                            {formatTimeValue(pInfo.range_bgn) + '~' + formatTimeValue(pInfo.range_end)}
                        </>
                    ) : (
                        <>Time range not set</>
                    )}
                </Button>
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Refresh data" icon={<Refresh size={15} />} onClick={pOnRefreshData} />
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Refresh time" icon={<LuTimerReset size={16} />} onClick={pOnRefreshTime} />
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pOnSave} />
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={pOnOpenSaveModal} />
                <Button
                    disabled={pPanelsInfoCount === 0}
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Overlap chart"
                    icon={<MdOutlineStackedLineChart size={16} />}
                    onClick={pPanelsInfoCount === 0 ? () => {} : pOnOpenOverlapModal}
                />
            </Button.Group>
        </Page.Header>
    );
};

export default TagAnalyzerBoardToolbar;
