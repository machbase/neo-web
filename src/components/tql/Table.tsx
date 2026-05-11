import { useState } from 'react';
import './Table.scss';
import { Button, CommonTable, ContextMenu, Modal } from '@/design-system/components';
import { Copy, Monitor, VscJson } from '@/assets/icons/Icon';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

const parseStructuredJSON = (s: string): unknown | undefined => {
    try {
        const parsed = JSON.parse(s);
        if (parsed !== null && typeof parsed === 'object') return parsed;
    } catch {}
    return undefined;
};

interface TableProps {
    items: any[][];
    headers?: any[];
    pTabOption?: string;
}
export const Table = (props: TableProps) => {
    const { items, headers /*pType, pTimezone*/ } = props;
    const [sCellValue, setCellValue] = useState<string>('');
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsShowContent, setIsShowContent] = useState<boolean>(false);
    const [sIsJsonView, setIsJsonView] = useState<boolean>(false);

    const handleContextMenu = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const cellText = target.closest('td')?.textContent?.trim() || '';
        if (!cellText) return;
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setCellValue(cellText);
    };

    const closeContextMenu = () => {
        setIsContextMenu(false);
    };

    const showFullContent = () => {
        setIsJsonView(parseStructuredJSON(sCellValue) !== undefined);
        setIsShowContent(true);
        closeContextMenu();
    };

    const closeShowContent = () => {
        setIsShowContent(false);
        setIsJsonView(false);
        setCellValue('');
    };

    const handleCopy = (aCopyValue: string) => {
        ClipboardCopy(aCopyValue);
        closeContextMenu();
    };

    const sParsedJson = parseStructuredJSON(sCellValue);
    const sCanFormatJson = sParsedJson !== undefined;

    return (
        <div className="table-wrapper" style={{ height: '100%' }} onContextMenu={handleContextMenu}>
            <CommonTable data={{ columns: headers as string[] ?? [], rows: items }} showRowNumber showCopyButton cellWidthFix style={{ height: '100%' }} />
            <ContextMenu isOpen={sIsContextMenu} position={{ x: sMenuX, y: sMenuY }} onClose={closeContextMenu}>
                <ContextMenu.Item onClick={showFullContent}>
                    <Monitor />
                    <span>Show full contents</span>
                </ContextMenu.Item>
                <ContextMenu.Item onClick={() => handleCopy(sCellValue)}>
                    <Copy />
                    <span>Copy</span>
                </ContextMenu.Item>
            </ContextMenu>
            <Modal.Root
                isOpen={sIsShowContent}
                onClose={closeShowContent}
                size="fit"
                style={{ minWidth: '320px', width: '480px', maxWidth: '90vw', height: 'auto', maxHeight: '70vh' }}
            >
                <Modal.Header>
                    <Modal.Title>Show content</Modal.Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {sCanFormatJson ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent="JSON format"
                                icon={<VscJson size={16} />}
                                active={sIsJsonView}
                                onClick={() => setIsJsonView((aPrev) => !aPrev)}
                                aria-label="JSON format"
                            />
                        ) : null}
                        <Modal.Close />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <Modal.Content>
                        {sIsJsonView && sCanFormatJson ? (
                            <pre style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {JSON.stringify(sParsedJson, null, 4)}
                            </pre>
                        ) : (
                            <div style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{sCellValue}</div>
                        )}
                    </Modal.Content>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel onClick={closeShowContent}>Close</Modal.Cancel>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};
