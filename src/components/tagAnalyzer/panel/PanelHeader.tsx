import './PanelHeader.scss';
import { useState } from 'react';
import { MdFlagCircle } from '@/assets/icons/Icon';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import { Button } from '@/design-system/components';
import type { TagAnalyzerPanelHeaderProps } from './TagAnalyzerPanelTypes';
import PanelHeaderButtonGroup from './PanelHeaderButtonGroup';

// Renders the panel-level toolbar for selection, refresh, edit, delete, raw mode,
// FFT entry, and global-time actions tied to the current panel state.
const PanelHeader = ({
    pHeaderState,
    pHeaderActions,
    pSavedToLocalInfo,
}: TagAnalyzerPanelHeaderProps) => {
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
            <PanelHeaderButtonGroup
                pHeaderState={pHeaderState}
                pHeaderActions={pHeaderActions}
                pCanUseSavedToLocal={pHeaderState.canSaveLocal}
                pOnOpenSavedToLocal={handleSavedToLocal}
                pOnOpenDeleteConfirm={handleDelete}
            />
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
