import './PanelHeader.scss';
import { useState } from 'react';
import { MdFlagCircle } from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { Button } from '@/design-system/components';
import type { PanelActionHandlers, PanelPresentationState, PanelRefreshHandlers, PanelSavedChartInfo } from './TagAnalyzerPanelTypes';
import PanelHeaderButtonGroup from './PanelHeaderButtonGroup';

// Renders the panel-level toolbar for selection, refresh, edit, delete, raw mode,
// FFT entry, and global-time actions tied to the current panel state.
const PanelHeader = ({
    pPresentationState,
    pButtonActionHandlers: pActionHandlers,
    pRefreshHandlers,
    pSavedChartInfo,
}: {
    pPresentationState: PanelPresentationState;
    pButtonActionHandlers: PanelActionHandlers;
    pRefreshHandlers: PanelRefreshHandlers;
    pSavedChartInfo: PanelSavedChartInfo;
}) => {
    const [sIsDeleteModal, setIsDeleteModal] = useState<boolean>(false);
    const [sIsSavedToLocalModal, setIsSavedToLocalModal] = useState<boolean>(false);

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
                isToolTip={!pPresentationState.isEdit}
                toolTipContent={pPresentationState.isSelectedForOverlap ? 'Disable overlap mode' : 'Enable overlap mode'}
                icon={
                    <div className="title">
                        {pPresentationState.isOverlapAnchor && <MdFlagCircle size={16} style={{ color: '#fdb532' }} />}
                        {pPresentationState.title}
                    </div>
                }
                onClick={pActionHandlers.onToggleOverlap}
            />
            <div className="time">
                {pPresentationState.timeText}
                <span> {!pPresentationState.isRaw && pPresentationState.intervalText && ` ( interval : ${pPresentationState.intervalText} )`}</span>
            </div>
            <PanelHeaderButtonGroup
                pPresentationState={pPresentationState}
                pActionHandlers={pActionHandlers}
                pRefreshHandlers={pRefreshHandlers}
                pCanUseSavedToLocal={pPresentationState.canSaveLocal}
                pOnOpenSavedToLocal={handleSavedToLocal}
                pOnOpenDeleteConfirm={handleDelete}
            />
            {sIsDeleteModal && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsDeleteModal}
                    pCallback={pActionHandlers.onDelete}
                    pContents={<div className="body-content">{`Do you want to delete this panel?`}</div>}
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
