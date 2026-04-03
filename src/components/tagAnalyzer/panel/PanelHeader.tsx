import './PanelHeader.scss';
import { useState } from 'react';
import {
    Refresh,
    GearFill,
    Delete,
    MdRawOn,
    MdFlagCircle,
    PiSelectionPlusBold,
    LineChart,
    LuTimerReset,
    Download,
    TbTimezone,
} from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { useExperiment } from '@/hooks/useExperiment';
import { Button, Page } from '@/design-system/components';
import type { TagAnalyzerPanelHeaderProps } from './TagAnalyzerPanelTypes';

// Renders the panel-level toolbar for selection, refresh, edit, delete, raw mode,
// FFT entry, and global-time actions tied to the current panel state.
const PanelHeader = ({
    pHeaderState,
    pHeaderActions,
    pSavedToLocalInfo,
}: TagAnalyzerPanelHeaderProps) => {
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sIsSavedToLocalModal, setIsSavedToLocalModal] = useState<boolean>(false);
    const { getExperiment } = useExperiment();

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeleteModal(true);
    };
    const handleSavedToLocal = () => {
        setIsSavedToLocalModal(true);
    };

    return (
        <div className="panel-header">
            <Button
                size="xsm"
                variant="ghost"
                style={{ minWidth: '80px', maxWidth: '100px' }}
                isToolTip={!pHeaderState.isEdit}
                toolTipContent={pHeaderState.isSelectedForOverlap ? 'Disable overlap mode' : 'Enable overlap mode'}
                icon={
                    <div className="title">
                        {pHeaderState.isOverlapAnchor && <MdFlagCircle size={16} style={{ color: '#fdb532' }} />}
                        {pHeaderState.title}
                    </div>
                }
                onClick={pHeaderActions.onToggleOverlap}
            />
            <div className="time">
                {pHeaderState.timeText}
                <span> {!pHeaderState.isRaw && pHeaderState.intervalText && ` ( interval : ${pHeaderState.intervalText} )`}</span>
            </div>
            <Button.Group>
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={!pHeaderState.isRaw ? 'Enable raw data mode' : 'Disable raw data mode'}
                    icon={
                        <MdRawOn size={16} style={{ color: pHeaderState.isRaw ? '#fdb532 ' : '', height: '32px', width: '32px' }} />
                    }
                    onClick={pHeaderActions.onToggleRaw}
                    style={{ minWidth: '36px' }}
                />
                {!pHeaderState.isEdit ? (
                    <>
                        <Page.Divi />
                        <Button
                            size="xsm"
                            variant="ghost"
                            isToolTip
                            toolTipContent={'Drag data range'}
                            active={pHeaderState.isSelectionActive}
                            icon={<PiSelectionPlusBold size={16} style={{ color: pHeaderState.isSelectionActive ? '#f8f8f8' : '' }} />}
                            onClick={pHeaderActions.onToggleSelection}
                        />

                        {pHeaderState.canOpenFft ? (
                            <Button
                                size="xsm"
                                variant="ghost"
                                isToolTip
                                toolTipContent={'FFT chart'}
                                icon={<LineChart size={16} />}
                                onClick={pHeaderActions.onOpenFft}
                            />
                        ) : null}
                    </>
                ) : null}
                {!pHeaderState.isEdit ? (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Set global time'}
                        icon={<TbTimezone size={15} />}
                        onClick={pHeaderActions.onSetGlobalTime}
                    />
                ) : null}
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh data'}
                    icon={<Refresh size={14} />}
                    onClick={pHeaderActions.onRefreshData}
                />
                <Button
                    size="xsm"
                    variant="ghost"
                    isToolTip
                    toolTipContent={'Refresh time'}
                    icon={<LuTimerReset size={16} style={{ marginTop: '-1px' }} />}
                    onClick={pHeaderActions.onRefreshTime}
                />
                {!pHeaderState.isEdit ? (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Edit'}
                        icon={<GearFill size={14} />}
                        onClick={pHeaderActions.onOpenEdit}
                    />
                ) : null}
                {/* Saved to local */}
                {!pHeaderState.isEdit && getExperiment() && pHeaderState.canSaveLocal ? (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Saved to local'}
                        icon={<Download size={16} />}
                        onClick={handleSavedToLocal}
                    />
                ) : null}
                {!pHeaderState.isEdit && (
                    <Button
                        size="xsm"
                        variant="ghost"
                        isToolTip
                        toolTipContent={'Delete'}
                        icon={<Delete size={16} />}
                        onClick={handleDelete}
                    />
                )}
            </Button.Group>
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={pHeaderActions.onDelete}
                    pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
                />
            )}
            {sIsSavedToLocalModal && (
                <SavedToLocalModal
                    pPanelInfo={pSavedToLocalInfo.chartData}
                    pChartRef={pSavedToLocalInfo.chartRef}
                    pIsDarkMode
                    setIsOpen={setIsSavedToLocalModal}
                />
            )}
        </div>
    );
};
export default PanelHeader;
