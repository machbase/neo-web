import {
    Calendar,
    Save,
    Refresh,
    SaveAs,
    MdOutlineStackedLineChart,
    LuTimerReset,
} from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import { formatTimeValue } from '@/utils/dashboardUtil';
import type { ValueRange } from './TagAnalyzerCommonTypes';

// Used by TagAnalyzerBoardToolbar to type board action handlers.
export type BoardToolbarActions = {
    onOpenTimeRangeModal: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void | Promise<void>;
    onSave: () => void;
    onOpenSaveModal: () => void;
    onOpenOverlapModal: () => void;
};

/**
 * Renders the board-level action toolbar for TagAnalyzer.
 * Intent: Keep header actions separate from the board data and panel state logic.
 * @param {{ pRange: ValueRange; pPanelsInfoCount: number; pActionHandlers: BoardToolbarActions; }} props The toolbar inputs for the current board.
 * @returns {JSX.Element} The rendered board toolbar.
 */
const TagAnalyzerBoardToolbar = ({
    pRange,
    pPanelsInfoCount,
    pActionHandlers,
}: {
    pRange: ValueRange;
    pPanelsInfoCount: number;
    pActionHandlers: BoardToolbarActions;
}) => {
    const sRangeText = formatBoardRangeText(pRange);

    return (
        <Page.Header>
            <Page.Space pHeight={undefined} />
            <Button.Group
                className={undefined}
                style={undefined}
                fullWidth={undefined}
                label={undefined}
                labelPosition={undefined}
            >
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={pActionHandlers.onOpenTimeRangeModal}
                    loading={undefined}
                    active={undefined}
                    icon={undefined}
                    iconPosition={undefined}
                    fullWidth={undefined}
                    isToolTip={undefined}
                    toolTipContent={undefined}
                    toolTipPlace={undefined}
                    toolTipMaxWidth={undefined}
                    forceOpacity={undefined}
                    shadow={undefined}
                    label={undefined}
                    labelPosition={undefined}
                >
                    <Calendar style={{ paddingRight: '8px' }} />
                    {sRangeText || 'Time range not set'}
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Refresh data"
                    icon={<Refresh size={15} />}
                    onClick={pActionHandlers.onRefreshData}
                    loading={undefined}
                    active={undefined}
                    iconPosition={undefined}
                    fullWidth={undefined}
                    children={undefined}
                    toolTipPlace={undefined}
                    toolTipMaxWidth={undefined}
                    forceOpacity={undefined}
                    shadow={undefined}
                    label={undefined}
                    labelPosition={undefined}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Refresh time"
                    icon={<LuTimerReset size={16} />}
                    onClick={pActionHandlers.onRefreshTime}
                    loading={undefined}
                    active={undefined}
                    iconPosition={undefined}
                    fullWidth={undefined}
                    children={undefined}
                    toolTipPlace={undefined}
                    toolTipMaxWidth={undefined}
                    forceOpacity={undefined}
                    shadow={undefined}
                    label={undefined}
                    labelPosition={undefined}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Save"
                    icon={<Save size={16} />}
                    onClick={pActionHandlers.onSave}
                    loading={undefined}
                    active={undefined}
                    iconPosition={undefined}
                    fullWidth={undefined}
                    children={undefined}
                    toolTipPlace={undefined}
                    toolTipMaxWidth={undefined}
                    forceOpacity={undefined}
                    shadow={undefined}
                    label={undefined}
                    labelPosition={undefined}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Save as"
                    icon={<SaveAs size={16} />}
                    onClick={pActionHandlers.onOpenSaveModal}
                    loading={undefined}
                    active={undefined}
                    iconPosition={undefined}
                    fullWidth={undefined}
                    children={undefined}
                    toolTipPlace={undefined}
                    toolTipMaxWidth={undefined}
                    forceOpacity={undefined}
                    shadow={undefined}
                    label={undefined}
                    labelPosition={undefined}
                />
                <Button
                    disabled={pPanelsInfoCount === 0}
                    size="icon"
                    variant="ghost"
                    isToolTip
                    toolTipContent="Overlap chart"
                    icon={<MdOutlineStackedLineChart size={16} />}
                    onClick={pPanelsInfoCount === 0 ? () => {} : pActionHandlers.onOpenOverlapModal}
                    loading={undefined}
                    active={undefined}
                    iconPosition={undefined}
                    fullWidth={undefined}
                    children={undefined}
                    toolTipPlace={undefined}
                    toolTipMaxWidth={undefined}
                    forceOpacity={undefined}
                    shadow={undefined}
                    label={undefined}
                    labelPosition={undefined}
                />
            </Button.Group>
        </Page.Header>
    );
};

export default TagAnalyzerBoardToolbar;

/**
 * Formats the board time range into the toolbar label text.
 * Intent: Hide unresolved sentinels instead of rendering epoch placeholders.
 * @param {ValueRange} range The numeric range to format.
 * @returns {string} The formatted range text, or an empty string when the range is unresolved.
 */
function formatBoardRangeText(range: ValueRange): string {
    if (range.min <= 0 || range.max <= 0 || range.max < range.min) {
        return '';
    }

    return `${formatTimeValue(range.min)}~${formatTimeValue(range.max)}`;
}
