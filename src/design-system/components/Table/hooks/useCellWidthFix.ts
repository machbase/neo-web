import { useEffect, useRef, useState } from 'react';

export const useCellWidthFix = (enabled: boolean, data: any, skipColumns: number = 0) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [widthsCaptured, setWidthsCaptured] = useState(false);

    useEffect(() => {
        if (enabled && !widthsCaptured && tableRef.current) {
            const table = tableRef.current.querySelector('table');
            if (table) {
                const headerCells = table.querySelectorAll('thead th');
                const widths: number[] = [];

                headerCells.forEach((cell: Element, index: number) => {
                    // Skip non-data columns (e.g., row number, dotted indicator)
                    if (index < skipColumns) return;
                    widths.push((cell as HTMLElement).offsetWidth);
                });

                if (widths.length > 0) {
                    setColumnWidths(widths);
                    setWidthsCaptured(true);
                }
            }
        }
    }, [enabled, widthsCaptured, data, skipColumns]);

    return { tableRef, columnWidths, widthsCaptured };
};
