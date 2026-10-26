import './result.scss';
import { useMemo, useState } from 'react';
import { Copy, Monitor, VscJson } from '@/assets/icons/Icon';
import { Button, CommonTable, ContextMenu, Modal } from '@/design-system/components';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { JSON_TOO_DEEP_TO_FORMAT, stringifyJsonSafely } from '@/utils/safeJson';

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

    // Printed once per selected cell. A cell can hold JSON nested too deeply to print back; then the
    // JSON view is unavailable — its button says why — and the cell's own text is what the modal shows.
    const { sIsJsonCell, sPrettyJson } = useMemo(() => {
        const sParsed = parseStructuredJSON(String(sSelectedItem ?? ''));
        return sParsed === undefined ? { sIsJsonCell: false, sPrettyJson: undefined } : { sIsJsonCell: true, sPrettyJson: stringifyJsonSafely(sParsed, 4) };
    }, [sSelectedItem]);
    const sCanFormatJson = sPrettyJson !== undefined;

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        // The cell's text as it is, like its copy button: trimmed, '  padded  ' copied as 'padded' and a cell of
        // spaces opened no menu at all (F-136).
        const cellText = target.closest('td')?.textContent ?? '';
        if (cellText === '') return;
        e.preventDefault();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
        setSelectedItem(cellText);
    };

    const handleModal = () => {
        setIsJsonView(sCanFormatJson);
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

    return (
        <div className="sql-result-wrapper scrollbar-dark" style={{ display: pDisplay }} onContextMenu={handleContextMenu} data-testid="sql-result">
            <CommonTable
                data={pSqlResponseData}
                maxRows={pMaxShowLen ? 6 : undefined}
                helpText={pHelpTxt}
                showRowNumber={pShowRowNumber}
                showCopyButton
                cellWidthFix
                excludeRowNumberFromSelection={pExcludeRowNumberFromSelection}
                onEndReached={onMoreResult}
                getCellTestId={(aColumn) => `cell-${encodeURIComponent(aColumn ?? '')}`}
                style={{ height: '100%' }}
            />
            <ContextMenu isOpen={sIsContextMenu} position={{ x: sMenuX, y: sMenuY }} onClose={closeContextMenu} data-testid="sql-cell-menu">
                <ContextMenu.Item onClick={handleModal} data-testid="show-full-contents">
                    <Monitor />
                    <span>Show full contents</span>
                </ContextMenu.Item>
                <ContextMenu.Item onClick={handleCopy} data-testid="copy">
                    <Copy />
                    <span>Copy</span>
                </ContextMenu.Item>
            </ContextMenu>
            <Modal.Root
                data-testid="sql-cell-content"
                isOpen={sIsModal}
                onClose={closeModal}
                size="fit"
                style={{ minWidth: '320px', width: '480px', maxWidth: '90vw', height: 'auto', maxHeight: '70vh' }}
            >
                <Modal.Header>
                    <Modal.Title>Show content</Modal.Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {sIsJsonCell ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                isToolTip
                                toolTipContent={sCanFormatJson ? 'JSON format' : JSON_TOO_DEEP_TO_FORMAT}
                                icon={<VscJson size={16} />}
                                active={sIsJsonView}
                                disabled={!sCanFormatJson}
                                onClick={() => setIsJsonView((aPrev) => !aPrev)}
                                aria-label="JSON format"
                                data-testid="json-format"
                            />
                        ) : null}
                        <Modal.Close />
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <Modal.Content>
                        {sIsJsonView && sCanFormatJson ? (
                            <pre data-testid="content" style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {sPrettyJson}
                            </pre>
                        ) : (
                            <div data-testid="content" style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{sSelectedItem}</div>
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
