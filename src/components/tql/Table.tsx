import { useMemo, useState } from 'react';
import './Table.scss';
import { Button, CommonTable, ContextMenu, Modal } from '@/design-system/components';
import { Copy, Monitor, VscJson } from '@/assets/icons/Icon';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { JSON_TOO_DEEP_TO_FORMAT, stringifyJsonSafely } from '@/utils/safeJson';
import { tqlCsvColumnTypes } from '@/utils/tqlCsvParser';

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
    const sColumnTypes = useMemo(() => tqlCsvColumnTypes(items), [items]);
    const [sCellValue, setCellValue] = useState<string>('');
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sMenuX, setMenuX] = useState<number>(0);
    const [sMenuY, setMenuY] = useState<number>(0);
    const [sIsShowContent, setIsShowContent] = useState<boolean>(false);
    const [sIsJsonView, setIsJsonView] = useState<boolean>(false);

    // Printed once per selected cell. A cell can hold JSON nested too deeply to print back; then the
    // JSON view is unavailable — its button says why — and the cell's own text is what the modal shows.
    const { sIsJsonCell, sPrettyJson } = useMemo(() => {
        const sParsed = parseStructuredJSON(sCellValue);
        return sParsed === undefined ? { sIsJsonCell: false, sPrettyJson: undefined } : { sIsJsonCell: true, sPrettyJson: stringifyJsonSafely(sParsed, 4) };
    }, [sCellValue]);
    const sCanFormatJson = sPrettyJson !== undefined;

    const handleContextMenu = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // The cell's text as it is, like its copy button: trimmed, '  padded  ' copied as 'padded' and a cell of
        // spaces opened no menu at all (F-136).
        const cellText = target.closest('td')?.textContent ?? '';
        if (cellText === '') return;
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
        setIsJsonView(sCanFormatJson);
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

    return (
        <div className="table-wrapper" style={{ height: '100%' }} onContextMenu={handleContextMenu} data-testid="tql-result-table">
            <CommonTable data={{ columns: headers as string[] ?? [], rows: items, types: sColumnTypes }} showRowNumber showCopyButton cellWidthFix style={{ height: '100%' }} getCellTestId={(aColumn) => `cell-${encodeURIComponent(aColumn ?? '')}`} />
            <ContextMenu isOpen={sIsContextMenu} position={{ x: sMenuX, y: sMenuY }} onClose={closeContextMenu} data-testid="tql-cell-menu">
                <ContextMenu.Item onClick={showFullContent} data-testid="show-full-contents">
                    <Monitor />
                    <span>Show full contents</span>
                </ContextMenu.Item>
                <ContextMenu.Item onClick={() => handleCopy(sCellValue)} data-testid="copy">
                    <Copy />
                    <span>Copy</span>
                </ContextMenu.Item>
            </ContextMenu>
            <Modal.Root
                data-testid="tql-cell-content"
                isOpen={sIsShowContent}
                onClose={closeShowContent}
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
                            <div data-testid="content" style={{ fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{sCellValue}</div>
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
