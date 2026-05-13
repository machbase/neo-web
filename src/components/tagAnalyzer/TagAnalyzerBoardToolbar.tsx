import {
    Calendar,
    Save,
    Refresh,
    SaveAs,
    MdOutlineStackedLineChart,
    LuTimerReset,
} from '@/assets/icons/Icon';
import { useState } from 'react';
import { MdHelpOutline as Help } from 'react-icons/md';
import { Button, Modal, Page } from '@/design-system/components';
import { formatTimeValue } from '@/utils/dashboardUtil';
import { formatTimeRangeInputValue } from './time/TimeBoundaryFormatter';
import type { TimeRangeConfig } from './time/TimeTypes';

export type BoardToolbarActions = {
    onOpenTimeRangeModal: () => void;
    onRefreshData: () => void;
    onRefreshTime: () => void;
    onSave: () => void;
    onOpenSaveModal: () => void;
    onOpenOverlapModal: () => void;
};

const TagAnalyzerBoardToolbar = ({
    pTimeRangeConfig,
    pPanelsInfoCount,
    pActionHandlers,
}: {
    pTimeRangeConfig: TimeRangeConfig;
    pPanelsInfoCount: number;
    pActionHandlers: BoardToolbarActions;
}) => {
    const [sIsHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const sRangeText = formatBoardRangeText(pTimeRangeConfig);

    return (
        <>
            <Page.Header>
                <Page.Space />
                <Button.Group>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={pActionHandlers.onOpenTimeRangeModal}
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
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Refresh time"
                        icon={<LuTimerReset size={16} />}
                        onClick={pActionHandlers.onRefreshTime}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Save"
                        icon={<Save size={16} />}
                        onClick={pActionHandlers.onSave}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Save as"
                        icon={<SaveAs size={16} />}
                        onClick={pActionHandlers.onOpenSaveModal}
                    />
                    <Button
                        disabled={pPanelsInfoCount === 0}
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="Overlap chart"
                        icon={<MdOutlineStackedLineChart size={16} />}
                        onClick={pActionHandlers.onOpenOverlapModal}
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        isToolTip
                        toolTipContent="help"
                        icon={<Help size={16} />}
                        onClick={() => setIsHelpModalOpen(true)}
                        aria-label="Open help"
                    />
                </Button.Group>
            </Page.Header>
            {sIsHelpModalOpen && (
                <Modal.Root
                    isOpen={true}
                    onClose={() => setIsHelpModalOpen(false)}
                    closeOnEscape
                    closeOnOutsideClick
                >
                    <Modal.Header>
                        <Modal.Title>Help</Modal.Title>
                        <Modal.Close />
                    </Modal.Header>
                    <Modal.Body>this is the manual</Modal.Body>
                </Modal.Root>
            )}
        </>
    );
};

export default TagAnalyzerBoardToolbar;

function formatBoardRangeText(rangeConfig: TimeRangeConfig): string {
    if (
        rangeConfig.start.kind === 'empty' ||
        rangeConfig.end.kind === 'empty'
    ) {
        return '';
    }

    if (
        rangeConfig.start.kind === 'absolute' &&
        rangeConfig.end.kind === 'absolute'
    ) {
        if (
            rangeConfig.start.timestamp <= 0 ||
            rangeConfig.end.timestamp <= 0 ||
            rangeConfig.end.timestamp < rangeConfig.start.timestamp
        ) {
            return '';
        }

        return `${formatTimeValue(rangeConfig.start.timestamp)}~${formatTimeValue(rangeConfig.end.timestamp)}`;
    }

    return `${formatTimeRangeInputValue(rangeConfig.start)}~${formatTimeRangeInputValue(rangeConfig.end)}`;
}
