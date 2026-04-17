import './PanelHeader.scss';
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
} from '@/assets/icons/Icon';
import { useExperiment } from '@/hooks/useExperiment';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { Button, Page } from '@/design-system/components';
import type {
    PanelActionHandlers,
    PanelPresentationState,
    PanelRefreshHandlers,
    PanelSavedChartInfo,
} from './PanelModel';
import PanelTimeSummary from './PanelTimeSummary';

// Renders the panel-level toolbar for selection, refresh, edit, delete, raw mode,
// FFT entry, and global-time actions tied to the current panel state.
const PanelHeader = ({
    pPresentationState,
    pActionHandlers,
    pRefreshHandlers,
    pSavedChartInfo,
}: {
    pPresentationState: PanelPresentationState;
    pActionHandlers: PanelActionHandlers;
    pRefreshHandlers: PanelRefreshHandlers;
    pSavedChartInfo: PanelSavedChartInfo;
}) => {
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sIsSavedToLocalModal, setIsSavedToLocalModal] = useState<boolean>(false);
    const { getExperiment } = useExperiment();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip={!pPresentationState.isEdit}
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
            <PanelTimeSummary pPresentationState={pPresentationState} />
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
                {!pPresentationState.isEdit && (
                    <>
                        <Page.Divi />
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
                                        color: pPresentationState.isDragSelectActive
                                            ? '#f8f8f8'
                                            : '',
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
                            onClick={pActionHandlers.onSetGlobalTime}
                        />
                    </>
                )}
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
                {!pPresentationState.isEdit && (
                    <>
                        <Button
                            size="xsm"
                            variant="ghost"
                            isToolTip
                            toolTipContent={'Edit'}
                            icon={<GearFill size={14} />}
                            onClick={pActionHandlers.onOpenEdit}
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
                    </>
                )}
            </Button.Group>
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={pActionHandlers.onDelete}
                    pContents={
                        <div className="body-content">{`Do you want to delete this panel?`}</div>
                    }
                />
            )}
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
export default PanelHeader;
