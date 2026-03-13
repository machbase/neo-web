import './result.scss';
import { useRef, useState } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Menu } from '@/components/contextMenu/Menu';
import { Copy, Monitor, Close } from '@/assets/icons/Icon';
import Modal from '../modal/Modal';
import { CommonTable } from '@/design-system/components';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
interface ResultProps {
    pDisplay: string;
    pSqlResponseData: any;
    pShowRowNumber: boolean;
    pExcludeRowNumberFromSelection?: boolean;
    pMaxShowLen?: boolean;
    pHelpTxt?: string;
    onMoreResult: () => void;
}

const RESULT = ({ pDisplay, pSqlResponseData, pShowRowNumber, pExcludeRowNumberFromSelection = false, pMaxShowLen, pHelpTxt, onMoreResult }: ResultProps) => {
    const MenuRef = useRef<HTMLDivElement>(null);
    const ModalRef = useRef<HTMLDivElement>(null);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sSelectedItem, setSelectedItem] = useState<any>();
    const [sIsModal, setIsModal] = useState(false);

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        const cellText = target.closest('td')?.textContent?.trim() || '';
        if (!cellText) return;
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setSelectedItem(cellText);
    };

    const handleModal = () => {
        setIsModal(true);
        closeContextMenu();
    };

    const handleCopy = () => {
        ClipboardCopy(sSelectedItem);
        closeContextMenu();
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const handleClose = (e: any) => {
        if (ModalRef.current) {
            if (!ModalRef.current.contains(e.target)) setIsModal(false);
        }
    };

    useOutsideClick(MenuRef, () => setIsContextMenu(false));

    return (
        <div className="sql-result-wrapper scrollbar-dark" style={{ display: pDisplay }} onContextMenu={handleContextMenu}>
            <CommonTable
                data={pSqlResponseData}
                maxRows={pMaxShowLen ? 6 : undefined}
                helpText={pHelpTxt}
                showRowNumber={pShowRowNumber}
                showCopyButton
                cellWidthFix
                excludeRowNumberFromSelection={pExcludeRowNumberFromSelection}
                onEndReached={onMoreResult}
                style={{ height: '100%' }}
            />
            <div ref={MenuRef} className="sql-result-context-menu" style={{ top: sMenuY, left: sMenuX }}>
                <Menu isOpen={sIsContextMenu}>
                    <Menu.Item onClick={handleModal}>
                        <Monitor />
                        <span>Show full content</span>
                    </Menu.Item>
                    <Menu.Item onClick={handleCopy}>
                        <Copy />
                        <span>Copy</span>
                    </Menu.Item>
                </Menu>
            </div>
            <div onClick={handleClose}>
                {sIsModal ? (
                    <Modal pIsDarkMode={true}>
                        <div ref={ModalRef}>
                            <Modal.Header>
                                <div className="sql-modal-title">
                                    <div className="sql-modal-title-content">
                                        <span>SHOW CONTENT</span>
                                    </div>
                                    <Close className="sql-modal-close" onClick={() => setIsModal(false)} />
                                </div>
                            </Modal.Header>
                            <Modal.Body>
                                <div className="sql-modal-item">{sSelectedItem}</div>
                            </Modal.Body>
                        </div>
                    </Modal>
                ) : (
                    <></>
                )}
            </div>
        </div>
    );
};

export default RESULT;
