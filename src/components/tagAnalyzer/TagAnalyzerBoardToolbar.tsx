import { Calendar, Save, Refresh, SaveAs, MdOutlineStackedLineChart, LuTimerReset } from '@/assets/icons/Icon';
import { formatTimeValue } from '@/utils/dashboardUtil';
import { Button, Page } from '@/design-system/components';
import type { TagAnalyzerBoardInfo } from './TagAnalyzerType';

type TagAnalyzerBoardToolbarActions = {
    onOpenTimeRangeModal: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onSave: () => void;
    onOpenSaveModal: () => void;
    onOpenOverlapModal: () => void;
};

// Renders the board-level action toolbar for time range, refresh, save, and overlap actions.
// It keeps the header button layout separate from the board data and panel state logic.
const TagAnalyzerBoardToolbar = ({
    pToolbarInfo: pInfo,
    pPanelsInfoCount,
    pToolbarActions: pActions,
}: {
    pToolbarInfo: TagAnalyzerBoardInfo;
    pPanelsInfoCount: number;
    pToolbarActions: TagAnalyzerBoardToolbarActions;
}) => {
    return (
        <Page.Header>
            <Page.Space />
            <Button.Group>
                <Button size="sm" variant="ghost" onClick={pActions.onOpenTimeRangeModal}>
                    <Calendar style={{ paddingRight: '8px' }} />
                    {pInfo?.range_bgn ? (
                        <>
                            {formatTimeValue(pInfo.range_bgn) + '~' + formatTimeValue(pInfo.range_end)}
                        </>
                    ) : (
                        <>Time range not set</>
                    )}
                </Button>
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Refresh data" icon={<Refresh size={15} />} onClick={pActions.onRefreshData} />
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Refresh time" icon={<LuTimerReset size={16} />} onClick={pActions.onRefreshTime} />
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Save" icon={<Save size={16} />} onClick={pActions.onSave} />
                <Button size="icon" variant="ghost" isToolTip toolTipContent="Save as" icon={<SaveAs size={16} />} onClick={pActions.onOpenSaveModal} />
                <Button
                    disabled={pPanelsInfoCount === 0}
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Overlap chart"
                    icon={<MdOutlineStackedLineChart size={16} />}
                    onClick={pPanelsInfoCount === 0 ? () => {} : pActions.onOpenOverlapModal}
                />
            </Button.Group>
        </Page.Header>
    );
};

export default TagAnalyzerBoardToolbar;
