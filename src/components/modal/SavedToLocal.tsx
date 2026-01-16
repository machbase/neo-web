import { useState, useEffect } from 'react';
import { Save } from '@/assets/icons/Icon';
import { FileNameValidator } from '@/utils/FileExtansion';
import { SavedToCSV } from '@/utils/SaveLocal';
import { Modal } from '@/design-system/components/Modal';
import { Input } from '@/design-system/components/Input';

export interface SaveDashboardModalProps {
    setIsOpen: (isOpen: boolean) => void;
    pIsDarkMode?: boolean;
    pPanelInfo: any;
    pChartRef: any;
}

export const SavedToLocalModal = (props: SaveDashboardModalProps) => {
    const { setIsOpen, pPanelInfo, pChartRef } = props;
    const [sSaveFileName, setSaveFileName] = useState<string>('');

    const handleClose = () => {
        setIsOpen(false);
    };

    const changeSaveFileName = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        setSaveFileName(aEvent.target.value);
    };

    const getVisibleArr = () => {
        const sSeries = pChartRef && pChartRef?.current?.chart?.options?.series;
        const sVisibleList =
            sSeries &&
            sSeries.map((item: any) => {
                return { name: item.name, visible: item.visible ?? true };
            });
        return sVisibleList;
    };

    const saveFile = async () => {
        SavedToCSV(sSaveFileName, pPanelInfo, getVisibleArr(), handleClose);
    };

    useEffect(() => {
        setSaveFileName('');
    }, []);

    return (
        <Modal.Root isOpen={true} onClose={handleClose} style={{ height: 'auto' }}>
            <Modal.Header>
                <Modal.Title>
                    <Save size={16} />
                    <span>Save to csv</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Input label="File Name" labelPosition="left" autoFocus onChange={changeSaveFileName} value={sSaveFileName} fullWidth placeholder="Enter file name" />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={saveFile} disabled={!FileNameValidator(sSaveFileName) || sSaveFileName === ''}>
                    OK
                </Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};
