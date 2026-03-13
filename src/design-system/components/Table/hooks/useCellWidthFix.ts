import { useEffect, useRef, useState } from 'react';

export const useCellWidthFix = (enabled: boolean, data: any) => {
    const tableRef = useRef<HTMLDivElement>(null);
    const [columnWidths, setColumnWidths] = useState<number[]>([]);
    const [widthsCaptured, setWidthsCaptured] = useState(false);

    useEffect(() => {
        if (enabled && !widthsCaptured && tableRef.current) {
            const table = tableRef.current.querySelector('table');
            if (table) {
                const headerCells = table.querySelectorAll('thead th');
                const widths: number[] = [];

                headerCells.forEach((cell: Element) => {
                    widths.push((cell as HTMLElement).offsetWidth);
                });

                if (widths.length > 0) {
                    setColumnWidths(widths);
                    setWidthsCaptured(true);
                }
            }
        }
    }, [enabled, widthsCaptured, data]);

    return { tableRef, columnWidths, widthsCaptured };
};
