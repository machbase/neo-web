import './PanelChartHeader.scss';
import { useState } from 'react';
import {
    MdFlagCircle,
    Refresh,
    GearFill,
    Delete,
    MdRawOn,
    PiSelectionPlusBold,
    LineChart,
    LuTimerReset,
    Download,
    TbTimezone,
    VscNote,
} from '@/assets/icons/Icon';
import { useExperiment } from '@/hooks/useExperiment';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { Button, Page } from '@/design-system/components';
import type {
    PanelActionHandlers,
    PanelPresentationState,
    PanelRefreshHandlers,
    PanelSavedChartInfo,
} from './PanelTypes';

type BoardPanelHeaderProps = {
    pPresentationState: PanelPresentationState;
    pActionHandlers: PanelActionHandlers;
    pRefreshHandlers: PanelRefreshHandlers;
    pSavedChartInfo: PanelSavedChartInfo;
    onOpenDeleteConfirm: () => void;
};

/**
 * Renders the panel-level toolbar for selection, refresh, edit, delete, raw mode, and time actions.
 * Intent: Keep all panel header actions, including highlight mode, in one reusable toolbar component.
 * @param props The presentation state, action handlers, refresh handlers, and saved-chart info.
 * @returns The rendered panel header toolbar.
 */
const BoardPanelHeader = ({
    pPresentationState,
    pActionHandlers,
    pRefreshHandlers,
    pSavedChartInfo,
    onOpenDeleteConfirm,
}: BoardPanelHeaderProps) => {
    const [sIsSavedToLocalModal, setIsSavedToLocalModal] = useState<boolean>(false);
    const { getExperiment } = useExperiment();
    const sIntervalSummaryText =
        !pPresentationState.isRaw && pPresentationState.intervalText
            ? ` ( interval : ${pPresentationState.intervalText} )`
            : '';

    /**
     * Opens the shared delete confirmation flow after stopping header click propagation.
     * Intent: Keep destructive confirmation state owned by the panel container.
     * @param clickEvent The click event from the delete button.
     * @returns Nothing.
     */
    const handleDelete = (clickEvent: React.MouseEvent) => {
        clickEvent.stopPropagation();
        onOpenDeleteConfirm();
    };

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip
                toolTipContent={
                    pPresentationState.isSelectedForOverlap
                        ? 'Disable overlap mode'
                        : 'Enable overlap mode'
                }
                icon={
                    <div className="title">
                        {pPresentationState.isOverlapAnchor && (
                            <MdFlagCircle size={16} style={{ color: '#fdb532' }} />
                        )}
                        {pPresentationState.title}
                    </div>
                }
                onClick={pActionHandlers.onToggleOverlap}
            />
            <div className="time">
                {pPresentationState.timeText}
                <span>{' ' + sIntervalSummaryText}</span>
            </div>
            <Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={
                        !pPresentationState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'
                    }
                    icon={
                        <MdRawOn
                            size={16}
                            style={{
                                color: pPresentationState.isRaw ? '#fdb532 ' : '',
                                height: '32px',
                                width: '32px',
                            }}
                        />
                    }
                    onClick={pActionHandlers.onToggleRaw}
                    style={{ minWidth: '36px' }}
                />
                <Page.Divi />
                <Button
                    size="xsm"
                    variant="ghost"
                    active={pPresentationState.isHighlightActive}
                    onClick={pActionHandlers.onToggleHighlight}
                >
                    Highlight
                </Button>
                <Button
                    size="xsm"
                    variant="ghost"
                    active={pPresentationState.isAnnotationActive}
                    icon={<VscNote size={14} />}
                    onClick={pActionHandlers.onToggleAnnotation}
                >
                    Annotation
                </Button>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Select data range for stats and FFT'}
                    active={pPresentationState.isDragSelectActive}
                    icon={
                        <PiSelectionPlusBold
                            size={16}
                            style={{
                                color: pPresentationState.isDragSelectActive ? '#f8f8f8' : '',
                            }}
                        />
                    }
                    onClick={pActionHandlers.onToggleDragSelect}
                />
                {pPresentationState.canOpenFft && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'FFT chart'}
                        icon={<LineChart size={16} />}
                        onClick={pActionHandlers.onOpenFft}
                    />
                )}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Set global time'}
                    icon={<TbTimezone size={15} />}
                    disabled={!pPresentationState.canSetGlobalTime}
                    onClick={pActionHandlers.onSetGlobalTime}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh data'}
                    icon={<Refresh size={14} />}
                    onClick={pRefreshHandlers.onRefreshData}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={pRefreshHandlers.onRefreshTime}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={pPresentationState.isEdit ? 'Close editor' : 'Open editor'}
                    active={pPresentationState.isEdit}
                    icon={<GearFill size={14} />}
                    onClick={pActionHandlers.onToggleEdit}
                />
                {getExperiment() && pPresentationState.canSaveLocal && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Saved to local'}
                        icon={<Download size={16} />}
                        onClick={() => setIsSavedToLocalModal(true)}
                    />
                )}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Delete'}
                    icon={<Delete size={16} />}
                    onClick={handleDelete}
                />
            </Button.Group>
            {sIsSavedToLocalModal && (
                <SavedToLocalModal
                    pPanelInfo={pSavedChartInfo.chartData}
                    pChartRef={pSavedChartInfo.chartRef}
                    pIsDarkMode
                    setIsOpen={setIsSavedToLocalModal}
                />
            )}
        </div>
    );
};
export default BoardPanelHeader;

