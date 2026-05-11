import './result.scss';
import { useState } from 'react';
import { Copy, Monitor, VscJson } from '@/assets/icons/Icon';
import { Button, CommonTable, ContextMenu, Modal } from '@/design-system/components';
import { ClipboardCopy } from '@/utils/ClipboardCopy';

const parseStructuredJSON = (s: string): unknown | undefined => {
    try {
        const parsed = JSON.parse(s);
        if (parsed !== null && typeof parsed === 'object') return parsed;
    } catch {}
    return undefined;
};

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
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sSelectedItem, setSelectedItem] = useState<any>();
    const [sIsModal, setIsModal] = useState(false);
    const [sIsJsonView, setIsJsonView] = useState<boolean>(false);

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
        setIsJsonView(parseStructuredJSON(String(sSelectedItem ?? '')) !== undefined);
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

    const closeModal = () => {
        setIsModal(false);
        setIsJsonView(false);
    };

    const sParsedJson = parseStructuredJSON(String(sSelectedItem ?? ''));
    const sCanFormatJson = sParsedJson !== undefined;

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
            <ContextMenu isOpen={sIsContextMenu} position={{ x: sMenuX, y: sMenuY }} onClose={closeContextMenu}>
                <ContextMenu.Item onClick={handleModal}>
                    <Monitor />
                    <span>Show full contents</span>
                </ContextMenu.Item>
                <ContextMenu.Item onClick={handleCopy}>
                    <Copy />
                    <span>Copy</span>
                </ContextMenu.Item>
            </ContextMenu>
            <Modal.Root
                isOpen={sIsModal}
                onClose={closeModal}
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
                            <div style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{sSelectedItem}</div>
                        )}
                    </Modal.Content>
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel onClick={closeModal}>Close</Modal.Cancel>
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};

export default RESULT;
