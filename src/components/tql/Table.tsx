import { useState, useRef } from 'react';
import { Menu } from '@/components/contextMenu/Menu';
import { Modal } from '@/components/modal/Modal';
import './Table.scss';
import useOutsideClick from '@/hooks/useOutsideClick';
import TABLE from '@/components/table';
import { Copy, Monitor, Close } from '@/assets/icons/Icon';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

interface TableProps {
    items: any[][];
    headers?: any[];
    pTabOption?: string;
}
export const Table = (props: TableProps) => {
    const { items, headers, pTabOption /*pType, pTimezone*/ } = props;
    const MenuRef = useRef<HTMLDivElement>(null);
    const [sCellValue, setCellValue] = useState<string>('');
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsShowContent, setIsShowContent] = useState<boolean>(false);

    const onContextMenu = (e: React.MouseEvent, aValue: string) => {
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setCellValue(aValue);
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const showFullContent = () => {
        setIsShowContent(true);
        closeContextMenu();
    };

    const closeShowContent = () => {
        setIsShowContent(false);
        setCellValue('');
    };

    const handleCopy = (aCopyValue: string) => {
        ClipboardCopy(aCopyValue);
        closeContextMenu();
    };

    useOutsideClick(MenuRef, closeContextMenu);

    return (
        <div className="table-wrapper">
            <TABLE pTableData={{ columns: headers, rows: items, types: pTabOption }} pMaxShowLen={false} clickEvent={onContextMenu} />
            <div ref={MenuRef} className="table-context-menu" style={{ top: sMenuY, left: sMenuX }}>
                <Menu isOpen={sIsContextMenu}>
                    <Menu.Item onClick={showFullContent}>
                        <Monitor />
                        <span>Show full contents</span>
                    </Menu.Item>
                    <Menu.Item onClick={() => handleCopy(sCellValue)}>
                        <Copy />
                        <span>Copy</span>
                    </Menu.Item>
                </Menu>
            </div>
            {sIsShowContent ? (
                <Modal pIsDarkMode className="show-content-modal">
                    <Modal.Header>
                        <div className="show-content-modal-header">
                            <span>SHOW CONTENT</span>
                            <Close onClick={closeShowContent} />
                        </div>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="show-content-modal-body">
                            <span>{sCellValue}</span>
                        </div>
                    </Modal.Body>
                </Modal>
            ) : null}
        </div>
    );
};
