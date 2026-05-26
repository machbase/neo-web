import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { SavedToLocalModal } from '@/components/modal/SavedToLocal';
import type { MutableRefObject } from 'react';
import type { ChartSeriesData } from '../domain/ChartDomain';
import type { PanelChartHandle } from '../domain/PanelDomain';

function PanelCommandModals({
    isDeleteConfirmOpen,
    onCloseDeleteConfirm,
    onConfirmDeletePanel,
    isExportCsvOpen,
    onCloseExportCsv,
    exportCsvChartData,
    exportCsvChartRef,
}: {
    isDeleteConfirmOpen: boolean;
    onCloseDeleteConfirm: () => void;
    onConfirmDeletePanel: () => void;
    isExportCsvOpen: boolean;
    onCloseExportCsv: () => void;
    exportCsvChartData: ChartSeriesData[];
    exportCsvChartRef: MutableRefObject<PanelChartHandle | null>;
}) {
    return (
        <>
            {isDeleteConfirmOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onCloseDeleteConfirm();
                        }
                    }}
                    pCallback={onConfirmDeletePanel}
                    pContents={
                        <div className="body-content">Do you want to delete this panel?</div>
                    }
                />
            )}
            {isExportCsvOpen && (
                <SavedToLocalModal
                    pPanelInfo={exportCsvChartData}
                    pChartRef={exportCsvChartRef}
                    pIsDarkMode
                    setIsOpen={(isOpen) => {
                        if (!isOpen) {
                            onCloseExportCsv();
                        }
                    }}
                />
            )}
        </>
    );
}

export default PanelCommandModals;
