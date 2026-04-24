import { ReactNode } from 'react';

export interface TableData {
    columns: string[];
    rows: any[][];
    types?: (number | string)[];
}

export interface ModInfo {
    modBeforeInfo: { row: (string | number)[] | undefined; rowIdx: number | undefined };
    modAfterInfo: { row: (string | number)[] | undefined; rowIdx: number | undefined };
}

export interface CellRenderer {
    column: string;
    render: (row: any[]) => ReactNode;
    maxWidth?: string;
}

export interface InfiniteScrollConfig {
    onLoadMore: () => void;
    hasMore: boolean;
}

// Column definition for object-array mode
export interface ColumnDef<T = any> {
    key: string;
    header: ReactNode;
    render?: (item: T, index: number) => ReactNode;
    style?: React.CSSProperties;
    headerStyle?: React.CSSProperties;
}

// Base props shared by both modes
interface CommonTableBaseProps {
    // Display options
    showRowNumber?: boolean;
    showCopyButton?: boolean;
    maxRows?: number;
    stickyHeader?: boolean;
    cellWidthFix?: boolean;
    stripeRows?: boolean;
    dotted?: boolean;
    // Horizontal scroll (default: true)
    scrollX?: boolean;
    // Text wrap in cells (default: false, uses ellipsis)
    textWrap?: boolean;
    // Virtualization (auto: rows > threshold)
    virtualize?: boolean | number;
    // Infinite scroll
    infiniteScroll?: InfiniteScrollConfig;
    // Row interaction
    activeRow?: boolean;
    onRowSelect?: (row: string[]) => void;
    onRowDelete?: (row: string[]) => void;
    onRowAction?: (row: string[]) => void;
    hideRowAction?: boolean;
    // Editable
    editable?: boolean;
    onSave?: (modInfo: ModInfo) => void;
    // Edit mode specific actions (ScrollTable)
    v$Callback?: (item: string) => void;
    // Custom cell rendering (data mode only)
    cellRenderers?: CellRenderer[];
    // Help icon (SQL result)
    helpText?: string;
    helpMaxWidth?: number;
    // Row number selection exclusion (SQL result)
    excludeRowNumberFromSelection?: boolean;
    // Empty state
    emptyMessage?: string;
    // Row click (columnDefs mode)
    onRowClick?: (item: any, index: number) => void;
    // End reached callback (for virtualized infinite loading)
    onEndReached?: () => void;
    // Style
    className?: string;
    style?: React.CSSProperties;
}

// Data mode: { columns, rows } format
interface DataModeProps extends CommonTableBaseProps {
    data: TableData;
    items?: never;
    columnDefs?: never;
    rowKey?: never;
}

// ColumnDefs mode: object array + column definitions
interface ColumnDefsModeProps<T = any> extends CommonTableBaseProps {
    data?: never;
    items: T[];
    columnDefs: ColumnDef<T>[];
    rowKey?: (item: T, index: number) => string;
}

export type CommonTableProps<T = any> = DataModeProps | ColumnDefsModeProps<T>;
