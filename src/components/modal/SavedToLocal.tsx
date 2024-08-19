import './savedToLocal.scss';
import Modal from './Modal';
import { useState, useEffect } from 'react';
import { Save, Close } from '@/assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { FileNameValidator } from '@/utils/FileExtansion';
import { SavedToCSV } from '@/utils/SaveLocal';

export interface SaveDashboardModalProps {
    setIsOpen: any;
    pIsDarkMode?: boolean;
    pPanelInfo: any;
    pChartRef: any;
}

export const SavedToLocalModal = (props: SaveDashboardModalProps) => {
    const { setIsOpen, pIsDarkMode, pPanelInfo, pChartRef } = props;
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
        <div className="saved-to-local-modal">
            <Modal pIsDarkMode={pIsDarkMode} onOutSideClose={handleClose}>
                <Modal.Header>
                    <div className="title">
                        <div className="title-content">
                            <Save />
                            <span style={{ color: 'white' }}>Save to csv</span>
                        </div>
                        <div className="title-close">
                            <Close onClick={handleClose} />
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="save-option">
                        <div className="save-file-name">
                            <span>File Name</span>
                            <input autoFocus onChange={changeSaveFileName} value={sSaveFileName}></input>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <div className="button-group">
                        <TextButton
                            pText="OK"
                            pBackgroundColor="#4199ff"
                            pIsDisabled={!FileNameValidator(sSaveFileName) || sSaveFileName === ''}
                            onClick={FileNameValidator(sSaveFileName) ? saveFile : () => null}
                        />
                        <div style={{ width: '10px' }}></div>
                        <TextButton pText="Cancel" pBackgroundColor="#666979" onClick={handleClose} />
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
