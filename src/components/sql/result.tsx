import { useRef, useEffect, useState } from 'react';
import useObserver from '@/hooks/useObserver';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Menu } from '@/components/contextMenu/Menu';
import { Copy, Monitor, Close } from '@/assets/icons/Icon';
import Modal from '../modal/Modal';
import TABLE from '@/components/table';

import './result.scss';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

interface ResultProps {
    pDisplay: string;
    pSqlResponseData: any;
    pMaxShowLen?: boolean;
    onMoreResult: () => void;
}

const RESULT = ({ pDisplay, pSqlResponseData, pMaxShowLen, onMoreResult }: ResultProps) => {
    const [observe, unobserve] = useObserver(0, onMoreResult);
    const sObserveRef = useRef<any>(null);
    const sRootRef = useRef<any>(null);
    const MenuRef = useRef<HTMLDivElement>(null);
    const ModalRef = useRef<HTMLDivElement>(null);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sSelectedItem, setSelectedItem] = useState<any>();
    const [sIsModal, setIsModal] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>, aItem: any) => {
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setSelectedItem(aItem);
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
    useEffect(() => {
        if (pSqlResponseData && sObserveRef.current && sRootRef.current.clientHeight < sRootRef.current.children[0].clientHeight) {
            if (pSqlResponseData && pSqlResponseData?.rows && pSqlResponseData.rows.length < 51) sRootRef.current.scroll(0, 0);
            observe(sObserveRef.current);
        }

        return () => {
            if (sRootRef.current && pSqlResponseData && sRootRef.current.clientHeight > sRootRef.current.children[0].clientHeight && sObserveRef.current)
                unobserve(sObserveRef.current);
        };
    }, [pSqlResponseData]);

    return (
        <div ref={sRootRef} className="sql-result-wrapper" style={{ display: pDisplay }}>
            <TABLE pTableData={pSqlResponseData} pMaxShowLen={pMaxShowLen} clickEvent={handleClick} />
            <div ref={sObserveRef} style={{ width: '100%', height: '1px' }} />
            <div ref={MenuRef} style={{ position: 'fixed', top: sMenuY, left: sMenuX, zIndex: 999 }}>
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
