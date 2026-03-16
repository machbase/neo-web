import styles from './Table.module.scss';
import React, { useRef } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { VscCircleFilled } from 'react-icons/vsc';
import { MdDelete } from 'react-icons/md';
import { BiEdit, BiInfoCircle } from 'react-icons/bi';
import { GiCancel } from 'react-icons/gi';
import { PiFileSqlThin } from 'react-icons/pi';
import { Play, Save } from '@/assets/icons/Icon';
import { MuiTagAnalyzer } from '@/assets/icons/Mui';
import { generateUUID, isObject } from '@/utils';
import { ClipboardCopy } from '@/utils/ClipboardCopy';
import { IconButton } from '@/components/buttons/IconButton';
import { Button } from '../Button';
import { Page } from '../Page/index';
import { CopyCell } from './features/CopyCell';
import { useCellWidthFix } from './hooks/useCellWidthFix';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { useRowSelection } from './hooks/useRowSelection';
import { useInlineEdit } from './hooks/useInlineEdit';
import { CommonTableProps } from './types';

const EMPTY_DATA = { columns: [] as string[], rows: [] as any[][] };

// Check if a value is a displayable number (not undefined, null, empty string, or NaN)
// Also handles locale-formatted numbers with commas (e.g. "5,295")
const isNumericValue = (value: any): boolean => {
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'number') return isFinite(value);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return false;
        // Strip commas for locale-formatted numbers (e.g. "1,234,567.89")
        const stripped = trimmed.replace(/,/g, '');
        return stripped !== '' && isFinite(Number(stripped));
    }
    return false;
};

const CommonTable = (props: CommonTableProps) => {
    const {
        showRowNumber = false,
        showCopyButton = false,
        maxRows,
        stickyHeader = false,
        cellWidthFix = false,
        stripeRows = true,
        dotted = false,
        scrollX = true,
        textWrap = false,
        virtualize,
        infiniteScroll,
        activeRow = false,
        onRowSelect,
        onRowDelete,
        onRowAction,
        editable = false,
        onSave,
        v$Callback,
        cellRenderers,
        helpText,
        helpMaxWidth = 500,
        excludeRowNumberFromSelection = false,
        emptyMessage,
        onEndReached,
        onRowClick,
        className,
        style,
    } = props;

    // Determine mode
    const isColumnDefsMode = 'items' in props && !!props.items && 'columnDefs' in props && !!props.columnDefs;
    const data = isColumnDefsMode ? EMPTY_DATA : (props as any).data;
    const items = isColumnDefsMode ? (props as any).items : undefined;
    const columnDefs = isColumnDefsMode ? (props as any).columnDefs : undefined;
    const rowKey = isColumnDefsMode ? (props as any).rowKey : undefined;

    const isScrollMode = !isColumnDefsMode && (editable || !!infiniteScroll);

    // Determine virtualization threshold
    const virtualizeThreshold = typeof virtualize === 'number' ? virtualize : virtualize === true ? 50 : virtualize === false ? Infinity : 50;
    const useVirtualization = !isScrollMode && data?.rows && data.rows.length >= virtualizeThreshold;

    // Detect numeric columns from first data row
    const numericColumns = React.useMemo(() => {
        if (!data?.rows || data.rows.length === 0) return new Set<number>();
        const firstRow = data.rows[0];
        const set = new Set<number>();
        firstRow.forEach((cell: any, idx: number) => {
            if (isNumericValue(cell)) set.add(idx);
        });
        return set;
    }, [data?.rows]);

    // Hooks
    const skipColumns = (showRowNumber ? 1 : 0) + (dotted ? 1 : 0);
    const { tableRef: cellWidthRef, columnWidths, widthsCaptured } = useCellWidthFix(cellWidthFix, data, skipColumns);
    const { containerRef: selectionRef, handleRowClick, checkActiveRow } = useRowSelection(activeRow, onRowSelect);
    const { modInfo, handleMod, handleUpdateModInfo, handleSave, handleCancel, handleEdit } = useInlineEdit(editable, data, onSave);

    // Use a shared ref
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { observeRef } = useInfiniteScroll(wrapperRef, infiniteScroll?.onLoadMore, infiniteScroll?.hasMore ?? false);

    const scrollXStyle: React.CSSProperties = scrollX ? {} : { overflowX: 'hidden' };
    const tableFixedStyle: React.CSSProperties = scrollX
        ? (!cellWidthFix || widthsCaptured) ? { width: 'auto', minWidth: '100%' } : { width: 'auto' }
        : { tableLayout: 'fixed', width: '100%' };

    // Merge refs
    const setRef = (el: HTMLDivElement | null) => {
        (wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (cellWidthRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (selectionRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    };

    // Helper: get numeric header class (with copy button padding if needed)
    const getNumericHeaderClass = (idx: number): string | undefined => {
        if (!numericColumns.has(idx)) return undefined;
        return showCopyButton
            ? `${styles['numeric-header']} ${styles['numeric-header--with-copy']}`
            : styles['numeric-header'];
    };

    // Helper: get cell renderer
    const getCellRenderer = (columnName: string) => {
        if (!cellRenderers) return undefined;
        const config = cellRenderers.find((c) => c.column === columnName);
        return config?.render;
    };

    const getCellMaxWidth = (columnName: string) => {
        if (!cellRenderers) return undefined;
        const config = cellRenderers.find((c) => c.column === columnName);
        return config?.maxWidth;
    };

    // Row class computation for non-selection mode
    const getRowClass = (idx: number): string => {
        const classes = ['result-body-tr'];
        if (stripeRows && Number(idx) % 2 !== 0) classes.push('dark-odd');
        return classes.join(' ');
    };

    // Row class for result-style tables (TABLE replacement)
    const getResultRowClass = (idx: number): string => {
        if (stripeRows && Number(idx) % 2 !== 0) return 'result-body-tr dark-odd';
        return 'result-body-tr';
    };

    const rowNumberHeaderStyle = excludeRowNumberFromSelection ? { userSelect: 'none' as const } : undefined;
    const rowNumberBodyStyle = excludeRowNumberFromSelection ? { userSelect: 'none' as const, pointerEvents: 'none' as const } : undefined;

    // Handle help icon click
    const handleHelpIconClick = () => {
        if (!helpText) return;
        ClipboardCopy(helpText);
    };

    // Handle delete
    const handleDelete = (e: React.MouseEvent, row: string[]) => {
        e.stopPropagation();
        onRowDelete?.(row);
    };

    // Handle action
    const handleAction = (e: React.MouseEvent, row: string[]) => {
        e.stopPropagation();
        onRowAction?.(row);
    };

    // Scroll table callback handler (for editable mode)
    const handleScrollCallback = (e: React.MouseEvent | React.KeyboardEvent, item: string[], key: 'EDIT' | 'DELETE' | 'SAVE' | 'CANCEL' | 'TAZ' | 'V$', idx?: number) => {
        if (e.type === 'keydown') {
            if ((e as React.KeyboardEvent).keyCode !== 13) return;
            else e.stopPropagation();
        }
        if (e.type === 'click') e.stopPropagation();

        if (key === 'TAZ') onRowAction?.(item);
        if (key === 'V$' && editable) v$Callback?.(item[1]);
        if (key === 'EDIT' && editable) handleEdit(item, idx!);
        if (key === 'CANCEL') handleCancel(e);
        if (key === 'SAVE') handleSave(e, item);
        if (key === 'DELETE' && editable) onRowDelete?.(item);
    };

    // MaxRows truncation indicator
    const MaxLenRow = () => (
        <tr key="tbody-row-maxlen" className="result-body-tr">
            {showRowNumber && (
                <td style={rowNumberBodyStyle}>
                    <span style={{ marginLeft: '20px', cursor: 'default' }}>...</span>
                </td>
            )}
            {data.columns.map((col: string) => (
                <td key={'maxlen-' + col} className="result-table-item">
                    <span>...</span>
                </td>
            ))}
        </tr>
    );

    // =========================================================================
    // SCROLL TABLE MODE (editable + infinite scroll)
    // =========================================================================
    if (isScrollMode) {
        return (
            <div ref={setRef} className={[styles['scroll-table-wrapper'], 'scrollbar-dark', className].filter(Boolean).join(' ')} style={{ ...scrollXStyle, ...style }}>
                <table className={styles['table']} style={tableFixedStyle}>
                    <thead className={styles['scroll-table-header']}>
                        {data?.columns ? (
                            <tr>
                                <th className={styles['row-num']}>#</th>
                                {data.columns.map((col: string, idx: number) => (
                                    <th key={col + '-' + idx} className={getNumericHeaderClass(idx)} style={{ cursor: 'default' }}>
                                        <span>{col}</span>
                                    </th>
                                ))}
                                {onRowAction && (
                                    <>
                                        {editable && <th className={styles['scroll-table-header-action']} style={{ cursor: 'default' }} />}
                                        <th className={styles['scroll-table-header-action']} style={{ cursor: 'default' }} />
                                    </>
                                )}
                                {v$Callback && editable && <th className={styles['scroll-table-header-action']} style={{ cursor: 'default' }} />}
                                {onRowDelete && editable && <th className={styles['scroll-table-header-action']} style={{ cursor: 'default' }} />}
                            </tr>
                        ) : (
                            <></>
                        )}
                    </thead>
                    {data?.rows ? (
                        <tbody className={styles['scroll-table-body']}>
                            {data.rows.map((rowList: any, rowIdx: number) => (
                                <tr
                                    key={'tbody-row-' + rowList[0] + rowIdx}
                                    className={getRowClass(rowIdx)}
                                    tabIndex={0}
                                    onDoubleClick={(e) => handleMod(e, rowList, rowIdx)}
                                    onKeyDown={(e) => handleMod(e, rowList, rowIdx)}
                                >
                                    <td>
                                        <span className={styles['row-num']}>{rowIdx + 1}</span>
                                    </td>
                                    {rowList.map((cellData: any, cellIdx: number) => {
                                        if (isObject(cellData)) return null;
                                        const numeric = isNumericValue(cellData);
                                        return (
                                            <td key={`tbody-row-${rowList[0]}-cell-${cellIdx}`} className={numeric ? styles['numeric-cell'] : undefined}>
                                                {data?.columns[cellIdx] !== '_ID' && modInfo.modBeforeInfo.rowIdx === rowIdx ? (
                                                    <Page.Input
                                                        pAutoFocus={cellIdx === 1}
                                                        pValue={modInfo?.modAfterInfo?.row?.[cellIdx] ?? ''}
                                                        pWidth={'100%'}
                                                        pCallback={(e) => handleUpdateModInfo(e, cellIdx)}
                                                    />
                                                ) : (
                                                    <div className={styles['cell-content']}>
                                                        <span>{cellData?.toString()}</span>
                                                        {showCopyButton && cellData !== null && cellData?.toString().trim() !== '' && (
                                                            <CopyCell value={cellData} />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {onRowAction &&
                                        (modInfo.modBeforeInfo.rowIdx === rowIdx ? (
                                            <>
                                                <td />
                                                {v$Callback && <td />}
                                                <td>
                                                    <Button
                                                        tabIndex={0}
                                                        size="side"
                                                        variant="ghost"
                                                        icon={<Save width={16} height={16} />}
                                                        onClick={(e) => handleScrollCallback(e, rowList, 'SAVE')}
                                                        onKeyDown={(e) => handleScrollCallback(e, rowList, 'SAVE')}
                                                    />
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                {v$Callback && editable && (
                                                    <td>
                                                        <Button
                                                            size="side"
                                                            variant="ghost"
                                                            icon={<BiInfoCircle width={16} height={16} />}
                                                            onClick={(e) => handleScrollCallback(e, rowList, 'V$')}
                                                        />
                                                    </td>
                                                )}
                                                <td>
                                                    <Button
                                                        size="side"
                                                        variant="ghost"
                                                        icon={<MuiTagAnalyzer width={16} height={16} />}
                                                        onClick={(e) => handleScrollCallback(e, rowList, 'TAZ')}
                                                    />
                                                </td>
                                                {editable && (
                                                    <td>
                                                        <Button
                                                            size="side"
                                                            variant="ghost"
                                                            icon={<BiEdit width={16} height={16} />}
                                                            onClick={(e) => handleScrollCallback(e, rowList, 'EDIT', rowIdx)}
                                                        />
                                                    </td>
                                                )}
                                            </>
                                        ))}
                                    {onRowDelete &&
                                        (modInfo.modBeforeInfo.rowIdx === rowIdx ? (
                                            <td>
                                                <Button
                                                    size="side"
                                                    variant="ghost"
                                                    icon={<GiCancel width={16} height={16} />}
                                                    tabIndex={0}
                                                    onClick={(e) => handleScrollCallback(e, rowList, 'CANCEL')}
                                                    onKeyDown={(e) => handleScrollCallback(e, rowList, 'CANCEL')}
                                                />
                                            </td>
                                        ) : (
                                            editable && (
                                                <td>
                                                    <Button
                                                        size="side"
                                                        variant="ghost"
                                                        icon={<MdDelete width={16} height={16} />}
                                                        onClick={(e) => handleScrollCallback(e, rowList, 'DELETE')}
                                                    />
                                                </td>
                                            )
                                        ))}
                                </tr>
                            ))}
                        </tbody>
                    ) : null}
                </table>
                <div ref={observeRef} style={{ width: '100%', height: '1px' }} />
            </div>
        );
    }

    // =========================================================================
    // COLUMN DEFS MODE (object array + column definitions)
    // =========================================================================
    if (isColumnDefsMode && items && columnDefs) {
        const getItemKey = (item: any, idx: number) => (rowKey ? rowKey(item, idx) : idx);

        return (
            <div className={[styles['table-wrapper'], 'scrollbar-dark', className].filter(Boolean).join(' ')} style={{ ...scrollXStyle, ...style }}>
                <table className={styles['table']} style={{ ...tableFixedStyle, ...(stickyHeader ? {} : {}) }}>
                    <thead className={styles['table-header']} style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 10 } : {}}>
                        <tr>
                            {showRowNumber && <th style={{ cursor: 'default', width: '50px' }}>#</th>}
                            {columnDefs.map((col: any) => (
                                <th key={col.key} style={{ cursor: 'default', ...col.headerStyle }}>
                                    <span>{col.header}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={styles['table-body']}>
                        {items.length > 0 ? (
                            items.map((item: any, idx: number) => (
                                <tr
                                    key={getItemKey(item, idx)}
                                    className={getRowClass(idx)}
                                    onClick={onRowClick ? () => onRowClick(item, idx) : undefined}
                                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                                >
                                    {showRowNumber && (
                                        <td>
                                            <span className="row-num">{idx + 1}</span>
                                        </td>
                                    )}
                                    {columnDefs.map((col: any) => {
                                        const cellValue = item[col.key];
                                        const numeric = !col.render && isNumericValue(cellValue);
                                        return (
                                            <td key={col.key} className={['result-table-item', numeric ? styles['numeric-cell'] : ''].filter(Boolean).join(' ')} style={col.style}>
                                                {col.render ? col.render(item, idx) : <div className={styles['cell-content']}><span>{cellValue ?? ''}</span></div>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        ) : emptyMessage ? (
                            <tr>
                                <td colSpan={columnDefs.length + (showRowNumber ? 1 : 0)} className="result-table-item" style={{ textAlign: 'center', padding: '20px' }}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        );
    }

    // =========================================================================
    // VIRTUALIZED TABLE MODE (Page.Table with >50 rows)
    // =========================================================================
    if (useVirtualization) {
        return (
            <div ref={setRef} className={[styles['table-wrapper'], 'scrollbar-dark', className].filter(Boolean).join(' ')} style={{ height: '40vh', ...scrollXStyle, ...style }}>
                <TableVirtuoso
                    className="scrollbar-dark"
                    style={{ height: '100%' }}
                    data={data.rows}
                    {...(onEndReached && { endReached: onEndReached })}
                    fixedHeaderContent={() => (
                        <tr>
                            {showRowNumber && (
                                <th style={{ ...rowNumberHeaderStyle, width: '40px', minWidth: '40px', maxWidth: '40px', overflow: 'hidden' }}>
                                    {helpText ? (
                                        <IconButton
                                            pWidth={20}
                                            pHeight={20}
                                            pIsActive={false}
                                            pIsActiveHover={false}
                                            pIsToopTip
                                            pToolTipMaxWidth={helpMaxWidth}
                                            pToolTipContent={helpText}
                                            pToolTipFooter="Click to copy query"
                                            pToolTipId="sql-result-tab"
                                            pIcon={
                                                <div style={{ width: '16px', height: '16px', cursor: 'pointer' }}>
                                                    <PiFileSqlThin />
                                                </div>
                                            }
                                            onClick={handleHelpIconClick}
                                        />
                                    ) : (
                                        <span style={{ cursor: 'default' }} />
                                    )}
                                </th>
                            )}
                            {dotted && <th style={{ cursor: 'default', maxWidth: '20px' }} />}
                            {data.columns.map((col: string, idx: number) => {
                                const maxWidth = getCellMaxWidth(col);
                                const capturedMinWidth = widthsCaptured && columnWidths[idx] ? `${columnWidths[idx]}px` : undefined;
                                return (
                                    <th
                                        key={col + '-' + idx}
                                        className={getNumericHeaderClass(idx)}
                                        style={{
                                            cursor: 'default',
                                            ...(capturedMinWidth && { minWidth: capturedMinWidth }),
                                            ...(maxWidth && { maxWidth, width: maxWidth }),
                                        }}
                                    >
                                        <span>{col}</span>
                                    </th>
                                );
                            })}
                            {onRowDelete && <th className={styles['table-header-action']} style={{ cursor: 'default' }} />}
                            {onRowAction && <th className={styles['table-header-action']} style={{ cursor: 'default' }} />}
                        </tr>
                    )}
                    itemContent={(_idx, rowList) => (
                        <>
                            {showRowNumber && (
                                <td style={{ ...rowNumberBodyStyle, width: '40px', minWidth: '40px', maxWidth: '40px', overflow: 'hidden' }}>
                                    <span className="row-num">{_idx + 1}</span>
                                </td>
                            )}
                            {dotted && (
                                <td className="result-table-item" style={{ cursor: 'default', maxWidth: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <VscCircleFilled />
                                    </div>
                                </td>
                            )}
                            {rowList.map((cellData: any, rIdx: number) => {
                                if (isObject(cellData)) return null;
                                const renderer = getCellRenderer(data?.columns[rIdx]);
                                const numeric = !renderer && isNumericValue(cellData);
                                return (
                                    <td className={['result-table-item', numeric ? styles['numeric-cell'] : ''].filter(Boolean).join(' ')} key={generateUUID()}>
                                        {renderer ? (
                                            renderer(rowList)
                                        ) : (
                                            <div className={styles['cell-content']}>
                                                <span>{cellData?.toString()}</span>
                                                {showCopyButton && cellData !== null && cellData?.toString().trim() !== '' && <CopyCell value={cellData} />}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                            {onRowDelete && (
                                <td className={['result-table-item', 'action'].filter(Boolean).join(' ')} onClick={(e) => handleDelete(e, rowList)}>
                                    <MdDelete />
                                </td>
                            )}
                            {onRowAction && (
                                <td className={['result-table-item', 'action'].filter(Boolean).join(' ')} onClick={(e) => handleAction(e, rowList)}>
                                    <Play />
                                </td>
                            )}
                        </>
                    )}
                    components={{
                        Table: ({ style: tStyle, ...props }) => (
                            <table
                                {...props}
                                className={styles['table']}
                                style={{ ...tStyle, ...tableFixedStyle }}
                            />
                        ),
                        TableHead: React.forwardRef(({ style: hStyle, ...props }, ref) => (
                            <thead {...props} ref={ref} className={styles['table-header']} style={hStyle} />
                        )),
                        TableBody: React.forwardRef(({ style: bStyle, ...props }, ref) => (
                            <tbody {...props} ref={ref} className={styles['table-body']} style={bStyle} />
                        )),
                        TableRow: ({ item, ...props }) => {
                            const rowList = item as any;
                            const rowIdx = data.rows.indexOf(rowList);
                            return (
                                <tr
                                    {...props}
                                    className={activeRow ? checkActiveRow(rowList, rowIdx) : getRowClass(rowIdx)}
                                    onClick={activeRow ? (e) => handleRowClick(e, rowList) : undefined}
                                />
                            );
                        },
                    }}
                />
            </div>
        );
    }

    // =========================================================================
    // STANDARD TABLE MODE (Page.Table with <=50 rows OR TABLE replacement)
    // =========================================================================
    return (
        <div ref={setRef} className={[styles['table-wrapper'], 'scrollbar-dark', className].filter(Boolean).join(' ')} style={{ ...scrollXStyle, ...style }}>
            <table className={[styles['table'], textWrap ? styles['text-wrap'] : ''].filter(Boolean).join(' ')} style={tableFixedStyle}>
                <thead className={styles['table-header']} style={stickyHeader ? { position: 'sticky', top: 0, zIndex: 10 } : {}}>
                    {data?.columns ? (
                        <tr>
                            {/* Help icon / Row number header */}
                            {showRowNumber && (
                                <th style={{ ...rowNumberHeaderStyle, width: '40px', minWidth: '40px', maxWidth: '40px', overflow: 'hidden' }}>
                                    {helpText ? (
                                        <IconButton
                                            pWidth={20}
                                            pHeight={20}
                                            pIsActive={false}
                                            pIsActiveHover={false}
                                            pIsToopTip
                                            pToolTipMaxWidth={helpMaxWidth}
                                            pToolTipContent={helpText}
                                            pToolTipFooter="Click to copy query"
                                            pToolTipId="sql-result-tab"
                                            pIcon={
                                                <div style={{ width: '16px', height: '16px', cursor: 'pointer' }}>
                                                    <PiFileSqlThin />
                                                </div>
                                            }
                                            onClick={handleHelpIconClick}
                                        />
                                    ) : (
                                        <span style={{ cursor: 'default' }} />
                                    )}
                                </th>
                            )}
                            {/* Dotted column */}
                            {dotted && <th style={{ cursor: 'default', maxWidth: '20px' }} />}
                            {/* Data columns */}
                            {data.columns.map((col: string, idx: number) => {
                                const maxWidth = getCellMaxWidth(col);
                                const capturedMinWidth = widthsCaptured && columnWidths[idx] ? `${columnWidths[idx]}px` : undefined;
                                return (
                                    <th
                                        key={`${col}-${idx}`}
                                        className={getNumericHeaderClass(idx)}
                                        style={{
                                            cursor: 'default',
                                            ...(capturedMinWidth && { minWidth: capturedMinWidth }),
                                            ...(maxWidth && { maxWidth, width: maxWidth }),
                                        }}
                                    >
                                        <span>{col?.toString()}</span>
                                    </th>
                                );
                            })}
                            {/* Action columns */}
                            {onRowDelete && <th className={styles['table-header-action']} style={{ cursor: 'default' }} />}
                            {onRowAction && <th className={styles['table-header-action']} style={{ cursor: 'default' }} />}
                        </tr>
                    ) : (
                        <></>
                    )}
                </thead>
                <tbody className={styles['table-body']}>
                    {data?.rows
                        ? data.rows.map((rowList: any, rowIdx: number) => {
                              // MaxRows truncation
                              if (maxRows && rowIdx + 1 === maxRows) return <MaxLenRow key={'maxlen-' + rowIdx} />;
                              if (maxRows && rowIdx + 1 > maxRows) return <React.Fragment key={'hidden-' + rowIdx} />;
                              // Skip empty single-cell rows
                              if (rowList.length === 1 && rowList[0] === '') return null;

                              return (
                                  <tr
                                      key={'tbody-row' + rowIdx}
                                      className={activeRow ? checkActiveRow(rowList, rowIdx) : getResultRowClass(rowIdx)}
                                      onClick={activeRow ? (e) => handleRowClick(e, rowList) : undefined}
                                  >
                                      {/* Row number */}
                                      {showRowNumber && (
                                          <td style={{ ...rowNumberBodyStyle, width: '40px', minWidth: '40px', maxWidth: '40px', overflow: 'hidden' }}>
                                              <span className="row-num">{rowIdx + 1}</span>
                                          </td>
                                      )}
                                      {/* Dotted indicator */}
                                      {dotted && (
                                          <td className="result-table-item" style={{ cursor: 'default', maxWidth: '20px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <VscCircleFilled />
                                              </div>
                                          </td>
                                      )}
                                      {/* Data cells */}
                                      {rowList.map((cellData: any, cellIdx: number) => {
                                          if (isObject(cellData)) return null;
                                          const renderer = getCellRenderer(data?.columns[cellIdx]);

                                          const wrapStyle = textWrap ? { overflow: 'visible' as const, whiteSpace: 'pre-wrap' as const } : undefined;

                                          if (renderer) {
                                              return (
                                                  <td className="result-table-item" key={generateUUID()} style={wrapStyle}>
                                                      {renderer(rowList)}
                                                  </td>
                                              );
                                          }

                                          const numeric = isNumericValue(cellData);
                                          return (
                                              <td className={['result-table-item', numeric ? styles['numeric-cell'] : ''].filter(Boolean).join(' ')} key={'table-' + rowIdx + '-' + cellIdx} style={wrapStyle}>
                                                  <div className={styles['cell-content']}>
                                                      <span>{cellData?.toString()}</span>
                                                      {showCopyButton && cellData !== null && cellData?.toString().trim() !== '' && <CopyCell value={cellData} />}
                                                  </div>
                                              </td>
                                          );
                                      })}
                                      {/* Delete action */}
                                      {onRowDelete && (
                                          <td className={['result-table-item', 'action'].filter(Boolean).join(' ')} onClick={(e) => handleDelete(e, rowList)}>
                                              <MdDelete />
                                          </td>
                                      )}
                                      {/* Row action */}
                                      {onRowAction && (
                                          <td className={['result-table-item', 'action'].filter(Boolean).join(' ')} onClick={(e) => handleAction(e, rowList)}>
                                              <Play />
                                          </td>
                                      )}
                                  </tr>
                              );
                          })
                        : null}
                </tbody>
            </table>
        </div>
    );
};

export default CommonTable;
